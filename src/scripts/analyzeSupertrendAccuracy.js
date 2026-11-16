
import fs from "node:fs";
import path from "node:path";

// ======================================================
// CONFIGURATION
// ======================================================

const INPUT_FILE = path.join(
  process.cwd(),
  "data/nifty-history/NIFTY_SPOT_5MIN_2YEARS.csv"
);

const OUTPUT_DIR = path.join(
  process.cwd(),
  "data/nifty-history"
);

const DAILY_FILE = path.join(
  OUTPUT_DIR,
  "SUPERTREND_DAILY_ACCURACY.csv"
);

const OVERALL_FILE = path.join(
  OUTPUT_DIR,
  "SUPERTREND_OVERALL_ACCURACY.csv"
);

const SIGNAL_FILE = path.join(
  OUTPUT_DIR,
  "SUPERTREND_SIGNAL_DETAILS.csv"
);

const ATR_PERIODS = [7, 10, 14, 20, 21];
const MULTIPLIERS = [2, 2.5, 3, 3.5, 4];

// ======================================================
// CSV READER
// ======================================================

function parseCSVLine(line) {
  const values = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function loadCandles() {
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error("NIFTY history CSV not found.");
  }

  const lines = fs
    .readFileSync(INPUT_FILE, "utf8")
    .trim()
    .split(/\r?\n/);

  const candles = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const row = parseCSVLine(lines[i]);

    const candle = {
      date: row[0],
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5] || 0),
    };

    if (
      candle.date &&
      Number.isFinite(candle.open) &&
      Number.isFinite(candle.high) &&
      Number.isFinite(candle.low) &&
      Number.isFinite(candle.close)
    ) {
      candles.push(candle);
    }
  }

  candles.sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const unique = new Map();

  for (const candle of candles) {
    unique.set(candle.date, candle);
  }

  return Array.from(unique.values());
}

// ======================================================
// IST TIME HELPERS
// ======================================================

function getIST(isoDate) {
  const date = new Date(
    new Date(isoDate).getTime() + 330 * 60 * 1000
  );

  return {
    date: date.toISOString().slice(0, 10),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    minuteOfDay:
      date.getUTCHours() * 60 + date.getUTCMinutes(),
  };
}

function groupCandlesByDay(candles) {
  const groups = new Map();

  candles.forEach((candle, index) => {
    const date = getIST(candle.date).date;

    if (!groups.has(date)) {
      groups.set(date, []);
    }

    groups.get(date).push(index);
  });

  return groups;
}

// ======================================================
// ATR - WILDER RMA
// ======================================================

function calculateATR(candles, period) {
  const tr = new Array(candles.length).fill(null);
  const atr = new Array(candles.length).fill(null);

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];

    if (i === 0) {
      tr[i] = candle.high - candle.low;
      continue;
    }

    const previousClose = candles[i - 1].close;

    tr[i] = Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose)
    );
  }

  if (candles.length < period) return atr;

  let sum = 0;

  for (let i = 0; i < period; i++) {
    sum += tr[i];
  }

  let previousATR = sum / period;
  atr[period - 1] = previousATR;

  for (let i = period; i < candles.length; i++) {
    previousATR =
      (previousATR * (period - 1) + tr[i]) / period;

    atr[i] = previousATR;
  }

  return atr;
}

// ======================================================
// SUPERTREND
// 1 = BUY / BULLISH
// -1 = SELL / BEARISH
// ======================================================

function calculateSupertrend(candles, period, multiplier) {
  const atr = calculateATR(candles, period);

  const direction = new Array(candles.length).fill(null);

  const finalUpper = new Array(candles.length).fill(null);
  const finalLower = new Array(candles.length).fill(null);

  const firstValid = period - 1;

  for (let i = firstValid; i < candles.length; i++) {
    const candle = candles[i];

    const hl2 = (candle.high + candle.low) / 2;

    const basicUpper = hl2 + multiplier * atr[i];
    const basicLower = hl2 - multiplier * atr[i];

    if (i === firstValid) {
      finalUpper[i] = basicUpper;
      finalLower[i] = basicLower;

      direction[i] =
        candle.close >= hl2 ? 1 : -1;

      continue;
    }

    const previousClose = candles[i - 1].close;

    finalUpper[i] =
      basicUpper < finalUpper[i - 1] ||
      previousClose > finalUpper[i - 1]
        ? basicUpper
        : finalUpper[i - 1];

    finalLower[i] =
      basicLower > finalLower[i - 1] ||
      previousClose < finalLower[i - 1]
        ? basicLower
        : finalLower[i - 1];

    let currentDirection = direction[i - 1];

    if (
      currentDirection === -1 &&
      candle.close > finalUpper[i]
    ) {
      currentDirection = 1;
    } else if (
      currentDirection === 1 &&
      candle.close < finalLower[i]
    ) {
      currentDirection = -1;
    }

    direction[i] = currentDirection;
  }

  return direction;
}

// ======================================================
// SIGNAL EVALUATION
//
// Daily first candle direction is the first signal.
// Every later Supertrend flip creates a new signal.
//
// Signal is confirmed at candle close.
// Entry reference = next candle open.
//
// Signal evaluation ends at:
// - Next opposite flip: next candle open
// - End of day: last available candle close
//
// Positive directional movement = CORRECT.
// Negative directional movement = WRONG.
// ======================================================

function evaluateSignal({
  candles,
  tradingDate,
  atrPeriod,
  multiplier,
  direction,
  signalIndex,
  entryIndex,
  exitIndex,
  exitPrice,
  exitReason,
}) {
  const signalCandle = candles[signalIndex];
  const entryCandle = candles[entryIndex];

  const side = direction === 1 ? "BUY" : "SELL";
  const entryPrice = entryCandle.open;

  const rawMovement = exitPrice - entryPrice;

  const directionalPoints =
    direction === 1
      ? rawMovement
      : -rawMovement;

  // Exact zero movement is NEUTRAL, not a correct signal.
  const result =
    directionalPoints > 0
      ? "CORRECT"
      : directionalPoints < 0
        ? "WRONG"
        : "NEUTRAL";

  let maxFavorable = 0;
  let maxAdverse = 0;

  // Measure movement from entry candle through exit candle.
  for (let i = entryIndex; i <= exitIndex; i++) {
    const candle = candles[i];

    if (direction === 1) {
      maxFavorable = Math.max(
        maxFavorable,
        candle.high - entryPrice
      );

      maxAdverse = Math.max(
        maxAdverse,
        entryPrice - candle.low
      );
    } else {
      maxFavorable = Math.max(
        maxFavorable,
        entryPrice - candle.low
      );

      maxAdverse = Math.max(
        maxAdverse,
        candle.high - entryPrice
      );
    }
  }

  return {
    tradingDate,
    atrPeriod,
    multiplier,
    signal: side,
    signalTime: signalCandle.date,
    signalPrice: signalCandle.close,
    entryTime: entryCandle.date,
    entryPrice,
    exitTime: candles[exitIndex].date,
    exitPrice,
    exitReason,
    directionalPoints,
    maxFavorable,
    maxAdverse,
    result,
  };
}

// ======================================================
// ANALYZE ONE TRADING DAY
// ======================================================

function analyzeDay({
  candles,
  indices,
  tradingDate,
  direction,
  atrPeriod,
  multiplier,
}) {
  const signals = [];

  if (indices.length < 2) {
    return signals;
  }

  // First available candle direction is the opening
  // day's initial Supertrend state.
  const firstIndex = indices[0];

  if (direction[firstIndex] === null) {
    return signals;
  }

  let activeSignal = {
    signalIndex: firstIndex,
    entryIndex: indices[1],
    direction: direction[firstIndex],
  };

  for (let k = 1; k < indices.length; k++) {
    const i = indices[k];

    const currentDirection = direction[i];

    if (currentDirection === null) continue;

    const previousDirection = direction[i - 1];

    const isFlip =
      previousDirection !== null &&
      currentDirection !== previousDirection;

    if (!isFlip) continue;

    const nextIndex = indices[k + 1];

    // Close previous signal at the new signal's
    // next candle open, if available.
    if (nextIndex !== undefined) {
      signals.push(
        evaluateSignal({
          candles,
          tradingDate,
          atrPeriod,
          multiplier,
          direction: activeSignal.direction,
          signalIndex: activeSignal.signalIndex,
          entryIndex: activeSignal.entryIndex,
          exitIndex: nextIndex,
          exitPrice: candles[nextIndex].open,
          exitReason: "OPPOSITE_SIGNAL",
        })
      );

      // New signal starts at the same next candle open.
      activeSignal = {
        signalIndex: i,
        entryIndex: nextIndex,
        direction: currentDirection,
      };
    } else {
      // A flip on the final candle has no next candle
      // for entry. Close the previous signal at this close.
      signals.push(
        evaluateSignal({
          candles,
          tradingDate,
          atrPeriod,
          multiplier,
          direction: activeSignal.direction,
          signalIndex: activeSignal.signalIndex,
          entryIndex: activeSignal.entryIndex,
          exitIndex: i,
          exitPrice: candles[i].close,
          exitReason: "DAY_CLOSE",
        })
      );

      activeSignal = null;
    }
  }

  // Evaluate final active signal at the last candle close.
  if (activeSignal) {
    const lastIndex = indices[indices.length - 1];

    if (activeSignal.entryIndex <= lastIndex) {
      signals.push(
        evaluateSignal({
          candles,
          tradingDate,
          atrPeriod,
          multiplier,
          direction: activeSignal.direction,
          signalIndex: activeSignal.signalIndex,
          entryIndex: activeSignal.entryIndex,
          exitIndex: lastIndex,
          exitPrice: candles[lastIndex].close,
          exitReason: "DAY_CLOSE",
        })
      );
    }
  }

  return signals;
}

// ======================================================
// CSV WRITER
// ======================================================

function escapeCSV(value) {
  const text = String(value ?? "");

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n")
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function writeCSV(filePath, rows) {
  if (!rows.length) {
    fs.writeFileSync(filePath, "", "utf8");
    return;
  }

  const headers = Object.keys(rows[0]);

  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((key) => escapeCSV(row[key])).join(",")
    ),
  ];

  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
}

// ======================================================
// MAIN
// ======================================================

function main() {
  console.log("\n======================================");
  console.log(" SUPERTREND SIGNAL ACCURACY ANALYSIS");
  console.log("======================================\n");

  const candles = loadCandles();
  const dayGroups = groupCandlesByDay(candles);

  console.log("Total Candles:", candles.length);
  console.log("Trading Days:", dayGroups.size);

  console.log("ATR Periods:", ATR_PERIODS.join(", "));
  console.log("Multipliers:", MULTIPLIERS.join(", "));

  console.log("\nStarting analysis...\n");

  const dailyRows = [];
  const signalRows = [];
  const overallRows = [];

  for (const atrPeriod of ATR_PERIODS) {
    for (const multiplier of MULTIPLIERS) {
      console.log(
        `Analyzing ATR ${atrPeriod} | Multiplier ${multiplier}`
      );

      const direction = calculateSupertrend(
        candles,
        atrPeriod,
        multiplier
      );

      const combinationSignals = [];

      for (const [tradingDate, indices] of dayGroups) {
        const daySignals = analyzeDay({
          candles,
          indices,
          tradingDate,
          direction,
          atrPeriod,
          multiplier,
        });

        combinationSignals.push(...daySignals);

        const correct = daySignals.filter(
          (s) => s.result === "CORRECT"
        ).length;

        const wrong = daySignals.filter(
          (s) => s.result === "WRONG"
        ).length;

        const neutral = daySignals.filter(
          (s) => s.result === "NEUTRAL"
        ).length;

        const evaluated = correct + wrong;

        const accuracy =
          evaluated > 0
            ? (correct / evaluated) * 100
            : 0;

        const dayPoints = daySignals.reduce(
          (sum, s) => sum + s.directionalPoints,
          0
        );

        dailyRows.push({
          tradingDate,
          atrPeriod,
          multiplier,
          totalSignals: daySignals.length,
          correct,
          wrong,
          neutral,
          accuracy: accuracy.toFixed(2),
          directionalPoints: dayPoints.toFixed(2),
        });
      }

      const correct = combinationSignals.filter(
        (s) => s.result === "CORRECT"
      ).length;

      const wrong = combinationSignals.filter(
        (s) => s.result === "WRONG"
      ).length;

      const neutral = combinationSignals.filter(
        (s) => s.result === "NEUTRAL"
      ).length;

      const evaluated = correct + wrong;

      const accuracy =
        evaluated > 0
          ? (correct / evaluated) * 100
          : 0;

      const totalPoints = combinationSignals.reduce(
        (sum, s) => sum + s.directionalPoints,
        0
      );

      const averagePoints =
        combinationSignals.length > 0
          ? totalPoints / combinationSignals.length
          : 0;

      overallRows.push({
        atrPeriod,
        multiplier,
        totalTradingDays: dayGroups.size,
        totalSignals: combinationSignals.length,
        correct,
        wrong,
        neutral,
        accuracy: accuracy.toFixed(2),
        totalDirectionalPoints: totalPoints.toFixed(2),
        averagePointsPerSignal: averagePoints.toFixed(2),
      });

      signalRows.push(...combinationSignals);
    }
  }

  // Highest overall accuracy first.
  overallRows.sort(
    (a, b) => Number(b.accuracy) - Number(a.accuracy)
  );

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  writeCSV(DAILY_FILE, dailyRows);
  writeCSV(OVERALL_FILE, overallRows);
  writeCSV(SIGNAL_FILE, signalRows);

  console.log("\n======================================");
  console.log(" ANALYSIS COMPLETED");
  console.log("======================================");

  console.log("\nDAILY ACCURACY:");
  console.log(DAILY_FILE);

  console.log("\nOVERALL ACCURACY:");
  console.log(OVERALL_FILE);

  console.log("\nSIGNAL DETAILS:");
  console.log(SIGNAL_FILE);

  console.log("\nTOP 10 ATR / MULTIPLIER COMBINATIONS\n");

  console.table(
    overallRows.slice(0, 10).map((row) => ({
      ATR: row.atrPeriod,
      Multiplier: row.multiplier,
      Signals: row.totalSignals,
      Correct: row.correct,
      Wrong: row.wrong,
      Accuracy: row.accuracy + "%",
      AvgPoints: row.averagePointsPerSignal,
    }))
  );

  console.log("\nIMPORTANT:");
  console.log("- Accuracy is based on signal-to-signal movement.");
  console.log("- First daily Supertrend state is included.");
  console.log("- Signal is confirmed at candle close.");
  console.log("- Entry reference is next candle open.");
  console.log("- Final signal is evaluated at day-end close.");
  console.log("- Neutral signals are excluded from accuracy denominator.");
  console.log("- This is directional accuracy, not actual trading P&L.");
}

try {
  main();
} catch (error) {
  console.error("\nANALYSIS FAILED:");
  console.error(error.message);
  process.exitCode = 1;
}
