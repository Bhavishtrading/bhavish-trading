
import fs from "node:fs";
import path from "node:path";

const CANDLE_FILE = "data/nifty-history/NIFTY_SPOT_5MIN_2YEARS.csv";
const SIGNAL_FILE = "data/nifty-history/EMA_ST_MAE_SIGNAL_DETAILS.csv";
const OUTPUT_DIR = "data/nifty-history";

const TARGET_POINTS = 30;
const STOP_LOSSES = [10, 20, 30, 40, 50];

// ==================================================
// CSV PARSER
// ==================================================

function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);

  function parseLine(line) {
    return line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)
      ?.map(x => x.replace(/,$/, "").trim().replace(/^"|"$/g, "").replace(/""/g, '"')) ?? [];
  }

  const headers = parseLine(lines[0]).map(x => x.toLowerCase());

  return lines.slice(1).filter(Boolean).map(line => {
    const values = parseLine(line);
    const row = {};

    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });

    return row;
  });
}

function readFile(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`File not found: ${file}`);
  }

  return parseCSV(fs.readFileSync(file, "utf8"));
}

// ==================================================
// LOAD DATA
// ==================================================

const rawCandles = readFile(CANDLE_FILE);
const rawSignals = readFile(SIGNAL_FILE);

const candles = rawCandles.map(c => ({
  date: c.date,
  open: Number(c.open),
  high: Number(c.high),
  low: Number(c.low),
  close: Number(c.close)
})).filter(c =>
  c.date &&
  Number.isFinite(c.open) &&
  Number.isFinite(c.high) &&
  Number.isFinite(c.low) &&
  Number.isFinite(c.close)
);

const signals = rawSignals.map(s => ({
  signalNo: Number(s.signalno),
  signalDate: s.signaldate,
  entryDate: s.entrydate,
  direction: s.direction,
  entry: Number(s.entryprice),
  result: s.result,
  exitDate: s.exitdate,
  exitPrice: Number(s.exitprice)
})).filter(s =>
  s.entryDate &&
  s.exitDate &&
  Number.isFinite(s.entry) &&
  ["BUY", "SELL"].includes(s.direction)
);

// ==================================================
// INDEX CANDLES BY TIMESTAMP
// ==================================================

const candleIndex = new Map();

candles.forEach((c, i) => {
  candleIndex.set(c.date, i);
});

// ==================================================
// TEST ONE STOP LOSS
// ==================================================

function testStopLoss(signal, stopPoints) {
  const startIndex = candleIndex.get(signal.entryDate);
  const endIndex = candleIndex.get(signal.exitDate);

  if (startIndex === undefined || endIndex === undefined || endIndex < startIndex) {
    return {
      outcome: "DATA_MISSING",
      exitDate: "",
      candlesHeld: "",
      exitPrice: ""
    };
  }

  const direction = signal.direction === "BUY" ? 1 : -1;

  const targetPrice = signal.entry + direction * TARGET_POINTS;
  const stopPrice = signal.entry - direction * stopPoints;

  for (let i = startIndex; i <= endIndex; i++) {
    const c = candles[i];

    const targetTouched = direction === 1
      ? c.high >= targetPrice
      : c.low <= targetPrice;

    const stopTouched = direction === 1
      ? c.low <= stopPrice
      : c.high >= stopPrice;

    // Both levels touched inside the same 5-minute candle.
    if (targetTouched && stopTouched) {
      return {
        outcome: "AMBIGUOUS",
        exitDate: c.date,
        candlesHeld: i - startIndex + 1,
        exitPrice: ""
      };
    }

    if (stopTouched) {
      return {
        outcome: "STOP_LOSS",
        exitDate: c.date,
        candlesHeld: i - startIndex + 1,
        exitPrice: stopPrice
      };
    }

    if (targetTouched) {
      return {
        outcome: "TARGET",
        exitDate: c.date,
        candlesHeld: i - startIndex + 1,
        exitPrice: targetPrice
      };
    }
  }

  return {
    outcome: signal.result === "HIT" ? "DATA_CHECK" : "ORIGINAL_FAILURE",
    exitDate: signal.exitDate,
    candlesHeld: endIndex - startIndex + 1,
    exitPrice: signal.exitPrice
  };
}

// ==================================================
// SUMMARY
// ==================================================

function summarize(rows, stopPoints, direction) {
  const subset = rows.filter(x =>
    direction === "ALL" || x.direction === direction
  );

  const count = outcome =>
    subset.filter(x => x.outcome === outcome).length;

  const target = count("TARGET");
  const stop = count("STOP_LOSS");
  const ambiguous = count("AMBIGUOUS");
  const originalFailure = count("ORIGINAL_FAILURE");
  const missing = count("DATA_MISSING") + count("DATA_CHECK");

  const total = subset.length;
  const decided = total - ambiguous - missing;

  return {
    StopLoss: stopPoints,
    Direction: direction,
    TotalSignals: total,
    TargetHits: target,
    StopLossHits: stop,
    OriginalFailures: originalFailure,
    Ambiguous: ambiguous,
    DataIssues: missing,
    DecidedSignals: decided,
    TargetRateOfDecided: decided
      ? (target * 100 / decided).toFixed(2) + "%"
      : "0.00%",
    StopRateOfDecided: decided
      ? (stop * 100 / decided).toFixed(2) + "%"
      : "0.00%"
  };
}

// ==================================================
// RUN ALL SCENARIOS
// ==================================================

console.log("\n========================================");
console.log("BHAVISH EMA + SUPERTREND STOP LOSS TEST");
console.log("========================================");

console.log("Candles:", candles.length);
console.log("Signals:", signals.length);

const allDetails = [];
const allSummary = [];

for (const sl of STOP_LOSSES) {
  const tested = signals.map(signal => {
    const result = testStopLoss(signal, sl);

    return {
      signalNo: signal.signalNo,
      signalDate: signal.signalDate,
      entryDate: signal.entryDate,
      direction: signal.direction,
      entryPrice: signal.entry,
      targetPrice: signal.entry +
        (signal.direction === "BUY" ? TARGET_POINTS : -TARGET_POINTS),
      stopLossPoints: sl,
      stopPrice: signal.entry -
        (signal.direction === "BUY" ? sl : -sl),
      originalResult: signal.result,
      outcome: result.outcome,
      exitDate: result.exitDate,
      candlesHeld: result.candlesHeld,
      exitPrice: result.exitPrice
    };
  });

  allDetails.push(...tested);

  for (const direction of ["ALL", "BUY", "SELL"]) {
    allSummary.push(summarize(tested, sl, direction));
  }
}

// ==================================================
// WRITE CSV
// ==================================================

function writeCSV(filePath, rows) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);

  const escape = value => {
    const s = String(value ?? "");
    return `"${s.replace(/"/g, '""')}"`;
  };

  const output = [
    headers.join(","),
    ...rows.map(row =>
      headers.map(h => escape(row[h])).join(",")
    )
  ].join("\n");

  fs.writeFileSync(filePath, output);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

writeCSV(
  path.join(OUTPUT_DIR, "EMA_ST_STOPLOSS_SUMMARY.csv"),
  allSummary
);

writeCSV(
  path.join(OUTPUT_DIR, "EMA_ST_STOPLOSS_DETAILS.csv"),
  allDetails
);

// ==================================================
// TERMINAL OUTPUT
// ==================================================

console.log("\nSTOP LOSS SUMMARY\n");

console.table(
  allSummary.filter(x => x.Direction === "ALL")
);

console.log("\nBUY / SELL SUMMARY\n");

console.table(
  allSummary.filter(x => x.Direction !== "ALL")
);

console.log("\nFILES CREATED:");
console.log("EMA_ST_STOPLOSS_SUMMARY.csv");
console.log("EMA_ST_STOPLOSS_DETAILS.csv");
console.log("\nSTOP LOSS BACKTEST COMPLETED");
