
import fs from "node:fs";
import path from "node:path";

const INPUT_FILE = path.resolve(
  "data/nifty-history/NIFTY_SPOT_3MIN_2YEARS.csv"
);

const OUTPUT_DIR = path.resolve("data/nifty-history");

const START_DATE = "2026-01-01";
const END_DATE = "2026-11-13";

const TARGET_POINTS = 35;

const EMA_FAST = 9;
const EMA_SLOW = 20;

// 3-minute candle starting at 15:15 closes at approximately 15:18.
// This is the last completed candle before 15:20.
const SQUARE_OFF_MINUTES = 15 * 60 + 20;
const LAST_COMPLETED_CANDLE_MINUTES = 15 * 60 + 15;

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

function isWeekday(timestamp) {
  const day = new Date(
    new Date(timestamp).toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    })
  ).getDay();

  return day >= 1 && day <= 5;
}

// ==================================================
// LOAD AND VALIDATE 3-MINUTE CANDLES
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
  let weekendRows = 0;
  let outsideSessionRows = 0;
  let outsideDateRows = 0;
  let duplicateRows = 0;

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

    const day = getIndiaDate(timestamp);

    if (day < START_DATE || day > END_DATE) {
      outsideDateRows++;
      continue;
    }

    if (!isWeekday(timestamp)) {
      weekendRows++;
      continue;
    }

    const minutes = getIndiaMinutes(timestamp);

    // NSE regular trading session: 09:15 to 15:30 IST.
    if (
      minutes < 9 * 60 + 15 ||
      minutes >= 15 * 60 + 30
    ) {
      outsideSessionRows++;
      continue;
    }

    if (map.has(timestamp)) {
      duplicateRows++;
    }

    map.set(timestamp, candle);
  }

  const candles = [...map.values()].sort(
    (a, b) => a.timestamp - b.timestamp
  );

  console.log("\nDATA QUALITY");
  console.log("--------------------------------------");
  console.log("Raw CSV rows:", lines.length - 1);
  console.log("Valid trading candles:", candles.length);
  console.log("Invalid rows:", invalidRows);
  console.log("Duplicate rows:", duplicateRows);
  console.log("Weekend rows excluded:", weekendRows);
  console.log("Outside session excluded:", outsideSessionRows);
  console.log("Outside date range excluded:", outsideDateRows);

  return candles;
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
// TIME FILTER ONLY - NO ICA
// ==================================================

function detectEntrySignals(candles, rawSignals) {
  const signals = new Array(candles.length).fill(null);

  let rawCrossoverCount = 0;
  let timeFilteredCount = 0;

  for (let i = 0; i < candles.length; i++) {
    if (!rawSignals[i]) continue;

    rawCrossoverCount++;

    const minutes = getIndiaMinutes(candles[i].timestamp);

    // Strict boundaries:
    // 09:45 excluded
    // 14:45 excluded
    if (
      minutes <= CROSSOVER_START ||
      minutes >= CROSSOVER_END
    ) {
      continue;
    }

    signals[i] = rawSignals[i];
    timeFilteredCount++;
  }

  return {
    signals,
    rawCrossoverCount,
    timeFilteredCount,
  };
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

    if (minutes > LAST_COMPLETED_CANDLE_MINUTES) {
      break;
    }

    lastIndex = i;
  }

  return lastIndex;
}

// ==================================================
// BACKTEST - ONLY 35 POINT TARGET
// ==================================================

function runBacktest(candles, entrySignals, rawSignals) {
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

      const oppositeCrossover =
        rawSignals[j] === (direction === 1 ? "SELL" : "BUY");

      const isSquareOffCandle = j === squareOffIndex;

      // Intrabar order cannot be confirmed.
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
        exitReason = "SQUARE_OFF_BEFORE_1520";
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

      entryDate: entryCandle.date,
      entryTimeIST: formatIST(entryCandle.timestamp),
      entryPrice,

      targetPrice,

      exitDate: candles[exitIndex].date,
      exitTimeIST: formatIST(candles[exitIndex].timestamp),
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
  if (!rows.length) {
    console.log(`No rows to write: ${file}`);
    return;
  }

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
  console.log("NIFTY EMA 9/20 - 3 MINUTE - 35 POINT BACKTEST");
  console.log("==========================================");

  const candles = readCandles();

  if (candles.length < EMA_SLOW + 2) {
    throw new Error("Not enough valid 3-minute candles for EMA calculation.");
  }

  const ema9 = calculateEMA(candles, EMA_FAST);
  const ema20 = calculateEMA(candles, EMA_SLOW);

  const rawSignals = detectRawCrossovers(
    candles,
    ema9,
    ema20
  );

  const filtered = detectEntrySignals(
    candles,
    rawSignals
  );

  const trades = runBacktest(
    candles,
    filtered.signals,
    rawSignals
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
    path.join(OUTPUT_DIR, "EMA_9_20_3MIN_35_SUMMARY.csv"),
    summaryRows
  );

  writeCSV(
    path.join(OUTPUT_DIR, "EMA_9_20_3MIN_35_DETAILS.csv"),
    trades
  );

  console.log("\nSTRATEGY RULES");
  console.log("--------------------------------------");
  console.log("Timeframe: 3 Minutes");
  console.log("EMA 9 / EMA 20 crossover");
  console.log("ICA: DISABLED");
  console.log("Crossover time: 9:45 AM to 2:45 PM (exclusive)");
  console.log("Entry: Next candle Open");
  console.log("Target: 35 points");
  console.log("Exit: Target / Opposite EMA crossover / Square-off");
  console.log("Square-off: Last completed 3-minute candle before 3:20 PM");
  console.log("Weekend candles: Excluded");

  console.log("\nBACKTEST INFORMATION");
  console.log("--------------------------------------");
  console.log("Source candles:", candles.length);
  console.log("Raw EMA crossovers:", filtered.rawCrossoverCount);
  console.log("Crossovers passing time filter:", filtered.timeFilteredCount);
  console.log("From:", getIndiaDate(candles[0].timestamp));
  console.log("To:", getIndiaDate(candles.at(-1).timestamp));

  console.log("\n35 POINT TARGET RESULTS");
  console.table(summaryRows);

  console.log("\nFILES CREATED:");
  console.log("EMA_9_20_3MIN_35_SUMMARY.csv");
  console.log("EMA_9_20_3MIN_35_DETAILS.csv");

  console.log("\nBACKTEST COMPLETED");
}

main();
