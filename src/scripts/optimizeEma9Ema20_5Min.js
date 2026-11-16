
import fs from "node:fs";
import path from "node:path";

const INPUT_FILE = path.resolve(
  "data/nifty-history/NIFTY_SPOT_5MIN_2YEARS.csv"
);

const OUTPUT_DIR = path.resolve("data/nifty-history");

const START_DATE = "2026-01-01";
const END_DATE = "2026-11-13";

const TARGET_POINTS = 35;

const EMA_FAST = 9;
const EMA_SLOW = 20;
const EMA_TREND = 50;

const ADX_PERIOD = 14;
const ADX_MIN = 25;

const RSI_PERIOD = 14;

const SQUARE_OFF_MINUTES = 15 * 60 + 15;
const CROSSOVER_START = 9 * 60 + 45;
const CROSSOVER_END = 14 * 60 + 45;

// ==================================================
// CSV PARSER
// ==================================================

function parseCSVLine(line) {
  const result = [];
  let value = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      result.push(value);
      value = "";
    } else {
      value += char;
    }
  }

  result.push(value);
  return result;
}

// ==================================================
// INDIA TIME
// ==================================================

const indiaFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function getIndiaParts(timestamp) {
  const parts = indiaFormatter.formatToParts(new Date(timestamp));

  const get = type =>
    Number(parts.find(p => p.type === type).value);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

function getIndiaDate(timestamp) {
  const p = getIndiaParts(timestamp);

  return [
    p.year,
    String(p.month).padStart(2, "0"),
    String(p.day).padStart(2, "0"),
  ].join("-");
}

function getIndiaMinutes(timestamp) {
  const p = getIndiaParts(timestamp);
  return p.hour * 60 + p.minute;
}

function formatIST(timestamp) {
  const p = getIndiaParts(timestamp);

  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

// ==================================================
// LOAD CANDLES
// ==================================================

function readCandles() {
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`File not found: ${INPUT_FILE}`);
  }

  const lines = fs.readFileSync(INPUT_FILE, "utf8")
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/);

  const headers = parseCSVLine(lines[0])
    .map(x => x.trim().toLowerCase());

  const index = Object.fromEntries(
    headers.map((name, i) => [name, i])
  );

  for (const field of ["date", "open", "high", "low", "close"]) {
    if (index[field] === undefined) {
      throw new Error(`Missing CSV column: ${field}`);
    }
  }

  const map = new Map();

  let invalidRows = 0;

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;

    const values = parseCSVLine(line);
    const timestamp = new Date(values[index.date]).getTime();

    if (!Number.isFinite(timestamp)) {
      invalidRows++;
      continue;
    }

    const candle = {
      timestamp,
      date: new Date(timestamp).toISOString(),
      open: Number(values[index.open]),
      high: Number(values[index.high]),
      low: Number(values[index.low]),
      close: Number(values[index.close]),
      volume: index.volume !== undefined
        ? Number(values[index.volume] || 0)
        : 0,
    };

    if (
      !Number.isFinite(candle.open) ||
      !Number.isFinite(candle.high) ||
      !Number.isFinite(candle.low) ||
      !Number.isFinite(candle.close) ||
      candle.high < candle.low ||
      candle.high < Math.max(candle.open, candle.close) ||
      candle.low > Math.min(candle.open, candle.close)
    ) {
      invalidRows++;
      continue;
    }

    map.set(timestamp, candle);
  }

  const candles = [...map.values()].sort(
    (a, b) => a.timestamp - b.timestamp
  );

  console.log("Invalid rows:", invalidRows);

  return candles;
}

// ==================================================
// EMA
// ==================================================

function calculateEMA(candles, period) {
  const result = new Array(candles.length).fill(null);
  const multiplier = 2 / (period + 1);

  let sum = 0;
  let previousEMA = null;

  for (let i = 0; i < candles.length; i++) {
    const close = candles[i].close;

    if (i < period - 1) {
      sum += close;
      continue;
    }

    if (i === period - 1) {
      sum += close;
      previousEMA = sum / period;
    } else {
      previousEMA =
        (close - previousEMA) * multiplier + previousEMA;
    }

    result[i] = previousEMA;
  }

  return result;
}

// ==================================================
// RSI - WILDER
// ==================================================

function calculateRSI(candles, period = 14) {
  const result = new Array(candles.length).fill(null);

  let gainSum = 0;
  let lossSum = 0;
  let avgGain = null;
  let avgLoss = null;

  for (let i = 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;

    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    if (i <= period) {
      gainSum += gain;
      lossSum += loss;

      if (i === period) {
        avgGain = gainSum / period;
        avgLoss = lossSum / period;
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    if (avgGain !== null) {
      if (avgLoss === 0) {
        result[i] = 100;
      } else {
        const rs = avgGain / avgLoss;
        result[i] = 100 - 100 / (1 + rs);
      }
    }
  }

  return result;
}

// ==================================================
// ADX - WILDER
// ==================================================

function calculateADX(candles, period = 14) {
  const result = new Array(candles.length).fill(null);

  let smoothedTR = 0;
  let smoothedPlusDM = 0;
  let smoothedMinusDM = 0;

  let dxValues = [];
  let adx = null;

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];

    const upMove = current.high - previous.high;
    const downMove = previous.low - current.low;

    const plusDM =
      upMove > downMove && upMove > 0 ? upMove : 0;

    const minusDM =
      downMove > upMove && downMove > 0 ? downMove : 0;

    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );

    if (i <= period) {
      smoothedTR += tr;
      smoothedPlusDM += plusDM;
      smoothedMinusDM += minusDM;
    } else {
      smoothedTR =
        smoothedTR - smoothedTR / period + tr;

      smoothedPlusDM =
        smoothedPlusDM - smoothedPlusDM / period + plusDM;

      smoothedMinusDM =
        smoothedMinusDM - smoothedMinusDM / period + minusDM;
    }

    if (i < period) continue;

    const plusDI = smoothedTR
      ? 100 * smoothedPlusDM / smoothedTR
      : 0;

    const minusDI = smoothedTR
      ? 100 * smoothedMinusDM / smoothedTR
      : 0;

    const denominator = plusDI + minusDI;

    const dx = denominator
      ? 100 * Math.abs(plusDI - minusDI) / denominator
      : 0;

    if (adx === null) {
      dxValues.push(dx);

      if (dxValues.length === period) {
        adx = dxValues.reduce((sum, value) => sum + value, 0) / period;
        result[i] = adx;
      }
    } else {
      adx = ((adx * (period - 1)) + dx) / period;
      result[i] = adx;
    }
  }

  return result;
}

// ==================================================
// RAW EMA CROSSOVERS
// ==================================================

function detectRawSignals(candles, ema9, ema20) {
  const signals = new Array(candles.length).fill(null);

  for (let i = 1; i < candles.length; i++) {
    if (
      ema9[i] === null ||
      ema20[i] === null ||
      ema9[i - 1] === null ||
      ema20[i - 1] === null
    ) {
      continue;
    }

    if (ema9[i - 1] <= ema20[i - 1] && ema9[i] > ema20[i]) {
      signals[i] = "BUY";
    } else if (ema9[i - 1] >= ema20[i - 1] && ema9[i] < ema20[i]) {
      signals[i] = "SELL";
    }
  }

  return signals;
}

// ==================================================
// FILTER DEFINITIONS
// ==================================================

const VARIANTS = [
  {
    name: "BASELINE",
    ema50: false,
    adx: false,
    rsi: false,
  },
  {
    name: "EMA50",
    ema50: true,
    adx: false,
    rsi: false,
  },
  {
    name: "ADX25",
    ema50: false,
    adx: true,
    rsi: false,
  },
  {
    name: "RSI",
    ema50: false,
    adx: false,
    rsi: true,
  },
  {
    name: "EMA50_ADX25",
    ema50: true,
    adx: true,
    rsi: false,
  },
  {
    name: "EMA50_RSI",
    ema50: true,
    adx: false,
    rsi: true,
  },
  {
    name: "ADX25_RSI",
    ema50: false,
    adx: true,
    rsi: true,
  },
  {
    name: "EMA50_ADX25_RSI",
    ema50: true,
    adx: true,
    rsi: true,
  },
];

function applyFilters(
  candles,
  rawSignals,
  ema50,
  adx,
  rsi,
  variant
) {
  const signals = new Array(candles.length).fill(null);

  for (let i = 0; i < candles.length; i++) {
    const signal = rawSignals[i];

    if (!signal) continue;

    const minutes = getIndiaMinutes(candles[i].timestamp);

    if (
      minutes <= CROSSOVER_START ||
      minutes >= CROSSOVER_END
    ) {
      continue;
    }

    if (variant.ema50) {
      if (ema50[i] === null) continue;

      if (signal === "BUY" && candles[i].close <= ema50[i]) {
        continue;
      }

      if (signal === "SELL" && candles[i].close >= ema50[i]) {
        continue;
      }
    }

    if (variant.adx) {
      if (adx[i] === null || adx[i] <= ADX_MIN) {
        continue;
      }
    }

    if (variant.rsi) {
      if (rsi[i] === null) continue;

      if (signal === "BUY" && (rsi[i] < 55 || rsi[i] > 70)) {
        continue;
      }

      if (signal === "SELL" && (rsi[i] > 45 || rsi[i] < 30)) {
        continue;
      }
    }

    signals[i] = signal;
  }

  return signals;
}

// ==================================================
// DAILY SQUARE-OFF
// ==================================================

function findSquareOffIndex(candles, startIndex, day) {
  let lastIndex = -1;

  for (let i = startIndex; i < candles.length; i++) {
    if (getIndiaDate(candles[i].timestamp) !== day) {
      break;
    }

    const minutes = getIndiaMinutes(candles[i].timestamp);

    if (minutes > SQUARE_OFF_MINUTES) {
      break;
    }

    lastIndex = i;

    if (minutes === 15 * 60 + 15) {
      return i;
    }
  }

  return lastIndex;
}

// ==================================================
// BACKTEST - STRICT 35 POINT TARGET
// ==================================================

function runBacktest(candles, entrySignals, rawSignals, variantName) {
  const trades = [];

  let i = 1;

  while (i < candles.length - 1) {
    const signal = entrySignals[i];

    if (!signal) {
      i++;
      continue;
    }

    const entryIndex = i + 1;
    const entryCandle = candles[entryIndex];

    const day = getIndiaDate(entryCandle.timestamp);

    const squareOffIndex = findSquareOffIndex(
      candles,
      entryIndex,
      day
    );

    if (squareOffIndex < entryIndex) {
      i++;
      continue;
    }

    const direction = signal === "BUY" ? 1 : -1;
    const entryPrice = entryCandle.open;

    const targetPrice =
      entryPrice + direction * TARGET_POINTS;

    let exitIndex = -1;
    let exitPrice = null;
    let exitReason = "";

    for (let j = entryIndex; j <= squareOffIndex; j++) {
      const candle = candles[j];

      const targetTouched = direction === 1
        ? candle.high >= targetPrice
        : candle.low <= targetPrice;

      // Exit on opposite RAW EMA crossover.
      // Filtered signals are used only for entries.
      const oppositeCrossover =
        rawSignals[j] === (direction === 1 ? "SELL" : "BUY");

      const isSquareOff = j === squareOffIndex;

      if (
        targetTouched &&
        (oppositeCrossover || isSquareOff)
      ) {
        exitIndex = j;
        exitPrice = candle.close;
        exitReason = "AMBIGUOUS";
        break;
      }

      if (targetTouched) {
        exitIndex = j;
        exitPrice = targetPrice;
        exitReason = "TARGET_35";
        break;
      }

      if (oppositeCrossover) {
        exitIndex = j;
        exitPrice = candle.close;
        exitReason = "OPPOSITE_CROSSOVER";
        break;
      }

      if (isSquareOff) {
        exitIndex = j;
        exitPrice = candle.close;
        exitReason = "SQUARE_OFF";
        break;
      }
    }

    if (exitIndex === -1) {
      exitIndex = squareOffIndex;
      exitPrice = candles[exitIndex].close;
      exitReason = "SQUARE_OFF";
    }

    const points = (exitPrice - entryPrice) * direction;

    trades.push({
      variant: variantName,
      direction: signal,
      signalDate: candles[i].date,
      signalTimeIST: formatIST(candles[i].timestamp),
      crossoverClose: candles[i].close,

      entryDate: entryCandle.date,
      entryTimeIST: formatIST(entryCandle.timestamp),
      entryPrice,
      targetPrice,

      exitDate: candles[exitIndex].date,
      exitTimeIST: formatIST(candles[exitIndex].timestamp),
      exitPrice,
      exitReason,

      targetHit: exitReason === "TARGET_35",
      points: Number(points.toFixed(2)),
    });

    i = exitIndex;
  }

  return trades;
}

// ==================================================
// SUMMARY
// ==================================================

function summarize(trades, variantName) {
  const ambiguous = trades.filter(
    t => t.exitReason === "AMBIGUOUS"
  );

  const valid = trades.filter(
    t => t.exitReason !== "AMBIGUOUS"
  );

  const targetHits = valid.filter(t => t.targetHit);
  const missedProfits = valid.filter(t => !t.targetHit && t.points > 0);
  const missedLosses = valid.filter(t => !t.targetHit && t.points < 0);

  const grossProfit = valid
    .filter(t => t.points > 0)
    .reduce((sum, t) => sum + t.points, 0);

  const grossLoss = Math.abs(
    valid
      .filter(t => t.points < 0)
      .reduce((sum, t) => sum + t.points, 0)
  );

  const netPoints = valid.reduce(
    (sum, t) => sum + t.points, 0
  );

  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;

  for (const trade of valid) {
    equity += trade.points;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
  }

  return {
    Variant: variantName,
    TotalTrades: trades.length,
    TargetHits35: targetHits.length,
    TargetHitRate: valid.length
      ? `${(targetHits.length * 100 / valid.length).toFixed(2)}%`
      : "0.00%",
    MissedButProfit: missedProfits.length,
    MissedAndLoss: missedLosses.length,
    Ambiguous: ambiguous.length,
    NetPoints: Number(netPoints.toFixed(2)),
    ProfitFactor: grossLoss
      ? Number((grossProfit / grossLoss).toFixed(2))
      : grossProfit > 0 ? "Infinity" : 0,
    MaxDrawdown: Number(maxDrawdown.toFixed(2)),
  };
}

// ==================================================
// CSV WRITER
// ==================================================

function writeCSV(file, rows) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);

  const escape = value =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const output = [
    headers.join(","),
    ...rows.map(row =>
      headers.map(key => escape(row[key])).join(",")
    ),
  ].join("\n");

  fs.writeFileSync(file, output, "utf8");
}

// ==================================================
// MAIN
// ==================================================

function main() {
  console.log("\n==========================================");
  console.log("NIFTY 5-MIN EMA 9/20 FILTER OPTIMIZATION");
  console.log("STRICT 35 POINT TARGET HIT RATE");
  console.log("==========================================");

  const allCandles = readCandles();

  const ema9 = calculateEMA(allCandles, EMA_FAST);
  const ema20 = calculateEMA(allCandles, EMA_SLOW);
  const ema50 = calculateEMA(allCandles, EMA_TREND);

  const adx = calculateADX(allCandles, ADX_PERIOD);
  const rsi = calculateRSI(allCandles, RSI_PERIOD);

  const rawSignals = detectRawSignals(
    allCandles,
    ema9,
    ema20
  );

  const filteredIndices = allCandles
    .map((c, i) => ({
      index: i,
      date: getIndiaDate(c.timestamp),
    }))
    .filter(x => x.date >= START_DATE && x.date <= END_DATE)
    .map(x => x.index);

  if (!filteredIndices.length) {
    throw new Error("No candles found in requested date range.");
  }

  const firstIndex = filteredIndices[0];
  const lastIndex = filteredIndices.at(-1);

  // Keep earlier candles for indicator warm-up.
  // Only trade inside the requested date range.
  const candles = allCandles.slice(0, lastIndex + 1);

  const summaryRows = [];
  const allTradeRows = [];

  for (const variant of VARIANTS) {
    const entrySignals = applyFilters(
      candles,
      rawSignals.slice(0, lastIndex + 1),
      ema50,
      adx,
      rsi,
      variant
    );

    const trades = runBacktest(
      candles.slice(firstIndex),
      entrySignals.slice(firstIndex),
      rawSignals.slice(firstIndex),
      variant.name
    );

    const summary = summarize(trades, variant.name);

    summaryRows.push(summary);
    allTradeRows.push(...trades);

    console.log(
      `${variant.name}: ${summary.TargetHitRate} (${summary.TargetHits35}/${summary.TotalTrades})`
    );
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  writeCSV(
    path.join(OUTPUT_DIR, "EMA_9_20_FILTER_OPTIMIZATION_SUMMARY.csv"),
    summaryRows
  );

  writeCSV(
    path.join(OUTPUT_DIR, "EMA_9_20_FILTER_OPTIMIZATION_DETAILS.csv"),
    allTradeRows
  );

  console.log("\n==========================================");
  console.log("OPTIMIZATION RESULTS");
  console.log("==========================================");

  console.table(summaryRows);

  console.log("\nFILES CREATED:");
  console.log("EMA_9_20_FILTER_OPTIMIZATION_SUMMARY.csv");
  console.log("EMA_9_20_FILTER_OPTIMIZATION_DETAILS.csv");

  console.log("\nFILTER SETTINGS");
  console.log("EMA 50: BUY above / SELL below");
  console.log("ADX: Above 25");
  console.log("RSI BUY: 55 to 70");
  console.log("RSI SELL: 30 to 45");
  console.log("ICA: Disabled");
  console.log("VWAP / Volume: Not included in this run");

  console.log("\nOPTIMIZATION COMPLETED");
}

main();
