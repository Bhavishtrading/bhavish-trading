
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

const SQUARE_OFF_MINUTES = 15 * 60 + 20;

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

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;

    const values = parseCSVLine(line);
    const timestamp = new Date(values[index.date]).getTime();

    if (!Number.isFinite(timestamp)) continue;

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
      !Number.isFinite(candle.close)
    ) {
      continue;
    }

    map.set(timestamp, candle);
  }

  return [...map.values()].sort(
    (a, b) => a.timestamp - b.timestamp
  );
}

// ==================================================
// INDIA TIME HELPERS
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
// EMA CALCULATION
// ==================================================

function calculateEMA(candles, period) {
  const multiplier = 2 / (period + 1);
  const result = new Array(candles.length).fill(null);

  let previousEMA = null;
  let sum = 0;

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
// ICA CALCULATION
// Daily cumulative average of completed 5-min closes
// ==================================================

function calculateICA(candles) {
  const result = new Array(candles.length).fill(null);

  let currentDay = "";
  let cumulativeClose = 0;
  let candleCount = 0;

  for (let i = 0; i < candles.length; i++) {
    const day = getIndiaDate(candles[i].timestamp);

    if (day !== currentDay) {
      currentDay = day;
      cumulativeClose = 0;
      candleCount = 0;
    }

    cumulativeClose += candles[i].close;
    candleCount++;

    result[i] = cumulativeClose / candleCount;
  }

  return result;
}

// ==================================================
// RAW EMA CROSSOVERS
// ==================================================

function detectRawCrossovers(candles, ema9, ema20) {
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
    } else if (
      ema9[i - 1] >= ema20[i - 1] &&
      ema9[i] < ema20[i]
    ) {
      signals[i] = "SELL";
    }
  }

  return signals;
}

// ==================================================
// ICA + TIME FILTER
// Both BUY and SELL require crossover Close > ICA
// ==================================================

function detectEntrySignals(candles, rawSignals, ica) {
  const signals = new Array(candles.length).fill(null);

  for (let i = 0; i < candles.length; i++) {
    if (!rawSignals[i]) continue;

    const minutes = getIndiaMinutes(candles[i].timestamp);

    if (
      minutes <= CROSSOVER_START ||
      minutes >= CROSSOVER_END
    ) {
      continue;
    }

    if (candles[i].close > ica[i]) {
      signals[i] = rawSignals[i];
    }
  }

  return signals;
}

// ==================================================
// FIND DAILY SQUARE-OFF CANDLE
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

    // 15:15 candle closes at 15:20 IST
    if (minutes === 15 * 60 + 15) {
      return i;
    }
  }

  return lastIndex;
}

// ==================================================
// BACKTEST - ONLY 35 POINT THRESHOLD
// ==================================================

function runBacktest(candles, entrySignals, rawSignals, ica) {
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
    const entryMinutes = getIndiaMinutes(entryCandle.timestamp);

    if (entryMinutes >= SQUARE_OFF_MINUTES) {
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

    const targetPrice =
      entryPrice + direction * TARGET_POINTS;

    let exitIndex = -1;
    let exitPrice = null;
    let exitReason = "";

    // Track maximum favorable/adverse movement
    let maxFavorable = 0;
    let maxAdverse = 0;

    for (let j = entryIndex; j <= squareOffIndex; j++) {
      const candle = candles[j];

      const favorable = direction === 1
        ? candle.high - entryPrice
        : entryPrice - candle.low;

      const adverse = direction === 1
        ? entryPrice - candle.low
        : candle.high - entryPrice;

      maxFavorable = Math.max(maxFavorable, favorable);
      maxAdverse = Math.max(maxAdverse, adverse);

      const targetTouched = direction === 1
        ? candle.high >= targetPrice
        : candle.low <= targetPrice;

      // Opposite raw EMA crossover closes an open trade
      const oppositeCrossover =
        rawSignals[j] === (direction === 1 ? "SELL" : "BUY");

      const isSquareOffCandle = j === squareOffIndex;

      // If target and another exit condition happen
      // on the same candle, order cannot be confirmed.
      if (
        targetTouched &&
        (oppositeCrossover || isSquareOffCandle)
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

      if (isSquareOffCandle) {
        exitIndex = j;
        exitPrice = candle.close;
        exitReason = "SQUARE_OFF_1520";
        break;
      }
    }

    if (exitIndex === -1) {
      exitIndex = squareOffIndex;
      exitPrice = candles[exitIndex].close;
      exitReason = "SQUARE_OFF_DATA_LIMIT";
    }

    const points = (exitPrice - entryPrice) * direction;

    const targetHit = exitReason === "TARGET_35";

    let resultCategory;

    if (targetHit) {
      resultCategory = "TARGET_HIT_35_PLUS";
    } else if (exitReason === "AMBIGUOUS") {
      resultCategory = "AMBIGUOUS";
    } else if (points > 0) {
      resultCategory = "TARGET_MISSED_BUT_PROFIT";
    } else if (points < 0) {
      resultCategory = "TARGET_MISSED_AND_LOSS";
    } else {
      resultCategory = "TARGET_MISSED_BREAKEVEN";
    }

    trades.push({
      direction: signal,
      signalDate: candles[i].date,
      signalTimeIST: formatIST(candles[i].timestamp),
      crossoverClose: candles[i].close,
      ICA: Number(ica[i].toFixed(2)),
      entryDate: entryCandle.date,
      entryPrice,
      targetPrice,
      exitDate: candles[exitIndex].date,
      exitPrice,
      exitReason,
      resultCategory,
      points: Number(points.toFixed(2)),
      maxFavorablePoints: Number(maxFavorable.toFixed(2)),
      maxAdversePoints: Number(maxAdverse.toFixed(2)),
      candlesHeld: exitIndex - entryIndex + 1,
    });

    i = exitIndex;
  }

  return trades;
}

// ==================================================
// STATISTICS
// ==================================================

function calculateStats(trades, label) {
  const targetHits = trades.filter(
    t => t.resultCategory === "TARGET_HIT_35_PLUS"
  );

  const targetMissedProfit = trades.filter(
    t => t.resultCategory === "TARGET_MISSED_BUT_PROFIT"
  );

  const targetMissedLoss = trades.filter(
    t => t.resultCategory === "TARGET_MISSED_AND_LOSS"
  );

  const breakeven = trades.filter(
    t => t.resultCategory === "TARGET_MISSED_BREAKEVEN"
  );

  const ambiguous = trades.filter(
    t => t.resultCategory === "AMBIGUOUS"
  );

  const validTrades = trades.length - ambiguous.length;

  const avgLoss = targetMissedLoss.length
    ? targetMissedLoss.reduce((sum, t) => sum + t.points, 0) /
      targetMissedLoss.length
    : 0;

  const maxLoss = targetMissedLoss.length
    ? Math.min(...targetMissedLoss.map(t => t.points))
    : 0;

  const avgFavorable = trades.length
    ? trades.reduce((sum, t) => sum + t.maxFavorablePoints, 0) /
      trades.length
    : 0;

  const avgAdverse = trades.length
    ? trades.reduce((sum, t) => sum + t.maxAdversePoints, 0) /
      trades.length
    : 0;

  return {
    Direction: label,
    TotalTrades: trades.length,

    TargetHits35Plus: targetHits.length,

    TargetHitRate: validTrades
      ? `${(targetHits.length * 100 / validTrades).toFixed(2)}%`
      : "0.00%",

    TargetMissedButProfit: targetMissedProfit.length,
    TargetMissedAndLoss: targetMissedLoss.length,
    TargetMissedBreakeven: breakeven.length,
    Ambiguous: ambiguous.length,

    AverageLossPoints: Number(avgLoss.toFixed(2)),
    MaximumLossPoints: Number(maxLoss.toFixed(2)),

    AverageFavorablePoints: Number(avgFavorable.toFixed(2)),
    AverageAdversePoints: Number(avgAdverse.toFixed(2)),
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
  console.log("NIFTY EMA 9/20 + ICA - 35 POINT BACKTEST");
  console.log("==========================================");

  const allCandles = readCandles();

  const ema9 = calculateEMA(allCandles, EMA_FAST);
  const ema20 = calculateEMA(allCandles, EMA_SLOW);
  const ica = calculateICA(allCandles);

  const rawSignals = detectRawCrossovers(
    allCandles,
    ema9,
    ema20
  );

  const entrySignals = detectEntrySignals(
    allCandles,
    rawSignals,
    ica
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

  const testCandles = allCandles.slice(firstIndex, lastIndex + 1);
  const testEntrySignals = entrySignals.slice(firstIndex, lastIndex + 1);
  const testRawSignals = rawSignals.slice(firstIndex, lastIndex + 1);
  const testICA = ica.slice(firstIndex, lastIndex + 1);

  const trades = runBacktest(
    testCandles,
    testEntrySignals,
    testRawSignals,
    testICA
  );

  const buyTrades = trades.filter(t => t.direction === "BUY");
  const sellTrades = trades.filter(t => t.direction === "SELL");

  const summaryRows = [
    calculateStats(trades, "OVERALL"),
    calculateStats(buyTrades, "BUY"),
    calculateStats(sellTrades, "SELL"),
  ];

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  writeCSV(
    path.join(OUTPUT_DIR, "EMA_9_20_ICA_35_SUMMARY.csv"),
    summaryRows
  );

  writeCSV(
    path.join(OUTPUT_DIR, "EMA_9_20_ICA_35_DETAILS.csv"),
    trades
  );

  console.log("Source candles:", allCandles.length);
  console.log("Test candles:", testCandles.length);
  console.log("From:", getIndiaDate(testCandles[0].timestamp));
  console.log("To:", getIndiaDate(testCandles.at(-1).timestamp));

  console.log("\nSTRATEGY RULES");
  console.log("EMA 9 / EMA 20 crossover");
  console.log("Crossover Close > ICA");
  console.log("Crossover time: 9:45 AM to 2:45 PM");
  console.log("Entry: Next candle Open");
  console.log("Single target: 35 points");
  console.log("Exit: Target / Opposite crossover / 3:20 PM");

  console.log("\n35 POINT TARGET RESULTS");
  console.table(summaryRows);

  console.log("\nFILES CREATED:");
  console.log("EMA_9_20_ICA_35_SUMMARY.csv");
  console.log("EMA_9_20_ICA_35_DETAILS.csv");

  console.log("\nBACKTEST COMPLETED");
}

main();
