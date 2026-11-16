
import fs from "node:fs";
import path from "node:path";

const INPUT_FILE = path.resolve(
  "data/nifty-history/NIFTY_SPOT_5MIN_2YEARS.csv"
);

const OUTPUT_DIR = path.resolve("data/nifty-history");

const TARGET_POINTS = 35;
const EMA_FAST = 9;
const EMA_SLOW = 20;
const RSI_PERIOD = 14;

const CROSSOVER_START = 9 * 60 + 45;
const CROSSOVER_END = 14 * 60 + 45;
const SQUARE_OFF_MINUTES = 15 * 60 + 15;

const PERIODS = [
  {
    name: "TRAINING",
    start: "2026-01-01",
    end: "2026-08-31",
  },
  {
    name: "VALIDATION",
    start: "2026-09-01",
    end: "2026-11-13",
  },
];

// RSI bands are applied at the crossover candle close.
const VARIANTS = [
  {
    name: "NO_RSI_BASELINE",
    buyMin: null,
    buyMax: null,
    sellMin: null,
    sellMax: null,
  },
  {
    name: "A",
    buyMin: 52,
    buyMax: 68,
    sellMin: 32,
    sellMax: 48,
  },
  {
    name: "B_CURRENT",
    buyMin: 55,
    buyMax: 70,
    sellMin: 30,
    sellMax: 45,
  },
  {
    name: "C",
    buyMin: 58,
    buyMax: 72,
    sellMin: 28,
    sellMax: 42,
  },
  {
    name: "D",
    buyMin: 55,
    buyMax: 65,
    sellMin: 35,
    sellMax: 45,
  },
  {
    name: "E",
    buyMin: 50,
    buyMax: 65,
    sellMin: 35,
    sellMax: 50,
  },
  {
    name: "F",
    buyMin: 60,
    buyMax: 75,
    sellMin: 25,
    sellMax: 40,
  },
];

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

  const get = (type) =>
    Number(parts.find((part) => part.type === type).value);

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
    .map((value) => value.trim().toLowerCase());

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

  console.log("Invalid CSV rows:", invalidRows);
  console.log("Valid candles:", candles.length);

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
        result[i] = avgGain === 0 ? 50 : 100;
      } else {
        const rs = avgGain / avgLoss;
        result[i] = 100 - 100 / (1 + rs);
      }
    }
  }

  return result;
}

// ==================================================
// RAW EMA CROSSOVERS
// ==================================================

function detectRawSignals(candles, emaFast, emaSlow) {
  const signals = new Array(candles.length).fill(null);

  for (let i = 1; i < candles.length; i++) {
    if (
      emaFast[i] === null ||
      emaSlow[i] === null ||
      emaFast[i - 1] === null ||
      emaSlow[i - 1] === null
    ) {
      continue;
    }

    if (
      emaFast[i - 1] <= emaSlow[i - 1] &&
      emaFast[i] > emaSlow[i]
    ) {
      signals[i] = "BUY";
    } else if (
      emaFast[i - 1] >= emaSlow[i - 1] &&
      emaFast[i] < emaSlow[i]
    ) {
      signals[i] = "SELL";
    }
  }

  return signals;
}

// ==================================================
// FILTER SIGNALS
// ==================================================

function applyRSIFilter(
  candles,
  rawSignals,
  rsi,
  variant,
  period
) {
  const signals = new Array(candles.length).fill(null);

  for (let i = 0; i < candles.length; i++) {
    const signal = rawSignals[i];

    if (!signal) continue;

    const date = getIndiaDate(candles[i].timestamp);

    if (date < period.start || date > period.end) {
      continue;
    }

    const minutes = getIndiaMinutes(candles[i].timestamp);

    // Same crossover time window as original backtest.
    if (
      minutes <= CROSSOVER_START ||
      minutes >= CROSSOVER_END
    ) {
      continue;
    }

    if (variant.buyMin === null) {
      signals[i] = signal;
      continue;
    }

    const value = rsi[i];

    if (value === null) continue;

    if (signal === "BUY") {
      if (value >= variant.buyMin && value <= variant.buyMax) {
        signals[i] = "BUY";
      }
    }

    if (signal === "SELL") {
      if (value >= variant.sellMin && value <= variant.sellMax) {
        signals[i] = "SELL";
      }
    }
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

    if (minutes === SQUARE_OFF_MINUTES) {
      return i;
    }
  }

  return lastIndex;
}

// ==================================================
// BACKTEST
// ==================================================

function runBacktest(
  candles,
  entrySignals,
  rawSignals,
  variant,
  period
) {
  const trades = [];

  let i = 0;

  while (i < candles.length - 1) {
    const signal = entrySignals[i];

    if (!signal) {
      i++;
      continue;
    }

    const entryIndex = i + 1;

    if (entryIndex >= candles.length) break;

    const entryCandle = candles[entryIndex];
    const day = getIndiaDate(entryCandle.timestamp);

    // Do not allow trades to cross the selected period boundary.
    if (
      day < period.start ||
      day > period.end ||
      getIndiaDate(candles[i].timestamp) !== day
    ) {
      i++;
      continue;
    }

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
    const targetPrice = entryPrice + direction * TARGET_POINTS;

    let exitIndex = -1;
    let exitPrice = null;
    let exitReason = "";

    for (let j = entryIndex; j <= squareOffIndex; j++) {
      const candle = candles[j];

      const targetTouched = direction === 1
        ? candle.high >= targetPrice
        : candle.low <= targetPrice;

      const oppositeCrossover =
        rawSignals[j] === (direction === 1 ? "SELL" : "BUY");

      const isSquareOff = j === squareOffIndex;

      // If target and exit condition occur in the same candle,
      // OHLC data cannot establish which happened first.
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
      Period: period.name,
      Variant: variant.name,
      Direction: signal,

      SignalDate: day,
      SignalTimeIST: formatIST(candles[i].timestamp),
      CrossoverClose: candles[i].close,
      RSIAtSignal: Number(
        (rsiValueAtSignal(candles, i)).toFixed(2)
      ),

      EntryTimeIST: formatIST(entryCandle.timestamp),
      EntryPrice: Number(entryPrice.toFixed(2)),
      TargetPrice: Number(targetPrice.toFixed(2)),

      ExitTimeIST: formatIST(candles[exitIndex].timestamp),
      ExitPrice: Number(exitPrice.toFixed(2)),
      ExitReason: exitReason,

      TargetHit: exitReason === "TARGET_35",
      Points: Number(points.toFixed(2)),
    });

    i = exitIndex;
  }

  return trades;
}

// ==================================================
// SUMMARY
// ==================================================

function summarize(trades, variant, period) {
  const ambiguous = trades.filter(
    (trade) => trade.ExitReason === "AMBIGUOUS"
  );

  const valid = trades.filter(
    (trade) => trade.ExitReason !== "AMBIGUOUS"
  );

  const targetHits = valid.filter((trade) => trade.TargetHit);
  const missedProfits = valid.filter(
    (trade) => !trade.TargetHit && trade.Points > 0
  );
  const missedLosses = valid.filter(
    (trade) => !trade.TargetHit && trade.Points < 0
  );

  const grossProfit = valid
    .filter((trade) => trade.Points > 0)
    .reduce((sum, trade) => sum + trade.Points, 0);

  const grossLoss = Math.abs(
    valid
      .filter((trade) => trade.Points < 0)
      .reduce((sum, trade) => sum + trade.Points, 0)
  );

  const netPoints = valid.reduce(
    (sum, trade) => sum + trade.Points,
    0
  );

  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;

  for (const trade of valid) {
    equity += trade.Points;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
  }

  const hitRate = valid.length
    ? targetHits.length * 100 / valid.length
    : 0;

  return {
    Period: period.name,
    Variant: variant.name,

    BuyRSI: variant.buyMin === null
      ? "OFF"
      : `${variant.buyMin}-${variant.buyMax}`,

    SellRSI: variant.sellMin === null
      ? "OFF"
      : `${variant.sellMin}-${variant.sellMax}`,

    TotalTrades: trades.length,
    ValidTrades: valid.length,
    TargetHits35: targetHits.length,
    TargetHitRate: `${hitRate.toFixed(2)}%`,

    MissedButProfit: missedProfits.length,
    MissedAndLoss: missedLosses.length,
    Ambiguous: ambiguous.length,

    NetPoints: Number(netPoints.toFixed(2)),

    ProfitFactor: grossLoss
      ? Number((grossProfit / grossLoss).toFixed(2))
      : grossProfit > 0
        ? "Infinity"
        : 0,

    MaxDrawdown: Number(maxDrawdown.toFixed(2)),
  };
}

// ==================================================
// CSV WRITER
// ==================================================

function writeCSV(file, rows) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);

  const escape = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const output = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((key) => escape(row[key])).join(",")
    ),
  ].join("\n");

  fs.writeFileSync(file, output, "utf8");
}

// ==================================================
// MAIN
// ==================================================

function main() {
  console.log("\n==============================================");
  console.log("NIFTY 5-MIN EMA 9/20 RSI BAND OPTIMIZATION");
  console.log("STRICT 35 POINT TARGET");
  console.log("==============================================");

  const candles = readCandles();

  const ema9 = calculateEMA(candles, EMA_FAST);
  const ema20 = calculateEMA(candles, EMA_SLOW);
  const rsi = calculateRSI(candles, RSI_PERIOD);

  const rawSignals = detectRawSignals(candles, ema9, ema20);

  const summaryRows = [];
  const detailRows = [];

  for (const period of PERIODS) {
    console.log(`\n========== ${period.name} ==========`);
    console.log(`${period.start} to ${period.end}`);

    for (const variant of VARIANTS) {
      const entrySignals = applyRSIFilter(
        candles,
        rawSignals,
        rsi,
        variant,
        period
      );

      const trades = runBacktest(
        candles,
        entrySignals,
        rawSignals,
        variant,
        period
      );

      // Add actual RSI value to each trade using its signal date/time.
      // The trade records already contain RSIAtSignal.
      const summary = summarize(trades, variant, period);

      summaryRows.push(summary);
      detailRows.push(...trades);

      console.log(
        `${variant.name}: ${summary.TargetHitRate} | ` +
        `Trades: ${summary.TotalTrades} | ` +
        `Net: ${summary.NetPoints} | ` +
        `PF: ${summary.ProfitFactor}`
      );
    }
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  writeCSV(
    path.join(OUTPUT_DIR, "RSI_BAND_OPTIMIZATION_SUMMARY.csv"),
    summaryRows
  );

  writeCSV(
    path.join(OUTPUT_DIR, "RSI_BAND_OPTIMIZATION_DETAILS.csv"),
    detailRows
  );

  console.log("\n==============================================");
  console.log("FINAL SUMMARY");
  console.log("==============================================");

  console.table(summaryRows);

  console.log("\nFILES CREATED:");
  console.log("RSI_BAND_OPTIMIZATION_SUMMARY.csv");
  console.log("RSI_BAND_OPTIMIZATION_DETAILS.csv");

  console.log("\nIMPORTANT:");
  console.log("Training period: Jan-Aug 2026");
  console.log("Validation period: Sep-Nov 13, 2026");
  console.log("Target: 35 NIFTY points");
  console.log("Entry: Next candle open");
  console.log("Exit: Target / Opposite EMA crossover / Square-off");
  console.log("RSI: Wilder 14");
  console.log("EMA: 9 / 20");
  console.log("ICA: Disabled");
  console.log("VWAP / Volume: Not included");

  console.log("\nOPTIMIZATION COMPLETED");
}

// Helper used to attach RSI value to the signal candle.
let activeRSI = [];

function rsiValueAtSignal(candles, index) {
  return activeRSI[index] ?? 0;
}

// Initialize the RSI reference before running the main backtest.
function start() {
  const candles = readCandles();
  const ema9 = calculateEMA(candles, EMA_FAST);
  const ema20 = calculateEMA(candles, EMA_SLOW);

  activeRSI = calculateRSI(candles, RSI_PERIOD);

  const rawSignals = detectRawSignals(candles, ema9, ema20);

  console.log("\n==============================================");
  console.log("NIFTY 5-MIN EMA 9/20 RSI BAND OPTIMIZATION");
  console.log("==============================================");

  console.log("Valid candles:", candles.length);

  const summaryRows = [];
  const detailRows = [];

  for (const period of PERIODS) {
    console.log(`\n========== ${period.name} ==========`);
    console.log(`${period.start} to ${period.end}`);

    for (const variant of VARIANTS) {
      const entrySignals = applyRSIFilter(
        candles,
        rawSignals,
        activeRSI,
        variant,
        period
      );

      const trades = runBacktest(
        candles,
        entrySignals,
        rawSignals,
        variant,
        period
      );

      const summary = summarize(trades, variant, period);

      summaryRows.push(summary);
      detailRows.push(...trades);

      console.log(
        `${variant.name}: ${summary.TargetHitRate} | ` +
        `Trades: ${summary.TotalTrades} | ` +
        `Net: ${summary.NetPoints} | ` +
        `PF: ${summary.ProfitFactor}`
      );
    }
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  writeCSV(
    path.join(OUTPUT_DIR, "RSI_BAND_OPTIMIZATION_SUMMARY.csv"),
    summaryRows
  );

  writeCSV(
    path.join(OUTPUT_DIR, "RSI_BAND_OPTIMIZATION_DETAILS.csv"),
    detailRows
  );

  console.log("\n==============================================");
  console.log("FINAL SUMMARY");
  console.log("==============================================");

  console.table(summaryRows);

  console.log("\nFILES CREATED:");
  console.log("RSI_BAND_OPTIMIZATION_SUMMARY.csv");
  console.log("RSI_BAND_OPTIMIZATION_DETAILS.csv");

  console.log("\nOPTIMIZATION COMPLETED");
}

start();
