
import fs from "node:fs";
import path from "node:path";

// ======================================================
// CONFIGURATION
// ======================================================

const INPUT_FILE = path.join(
  process.cwd(),
  "data/nifty-history/SUPERTREND_TARGET_SIGNAL_DETAILS.csv"
);

const OUTPUT_DIR = path.join(
  process.cwd(),
  "data/nifty-history"
);

const SUMMARY_FILE = path.join(
  OUTPUT_DIR,
  "SUPERTREND_70_30_VALIDATION.csv"
);

const DAILY_FILE = path.join(
  OUTPUT_DIR,
  "SUPERTREND_70_30_DAILY.csv"
);

const TRAIN_RATIO = 0.70;
const TARGETS = [40, 50, 60];

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

function loadCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Input CSV not found: ${filePath}\n` +
      "First run analyzeSupertrendTargets.js"
    );
  }

  const lines = fs
    .readFileSync(filePath, "utf8")
    .trim()
    .split(/\r?\n/);

  if (lines.length < 2) {
    throw new Error("Signal CSV is empty.");
  }

  const headers = parseCSVLine(lines[0]);

  return lines.slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const values = parseCSVLine(line);
      const row = {};

      headers.forEach((header, index) => {
        row[header] = values[index] ?? "";
      });

      return row;
    });
}

// ======================================================
// DATE SPLIT
// ======================================================

function splitTradingDays(rows) {
  const dates = [
    ...new Set(rows.map((row) => row.tradingDate))
  ].sort();

  const trainCount = Math.floor(
    dates.length * TRAIN_RATIO
  );

  const trainDates = new Set(
    dates.slice(0, trainCount)
  );

  const testDates = new Set(
    dates.slice(trainCount)
  );

  return {
    dates,
    trainDates,
    testDates,
    trainCount,
    testCount: dates.length - trainCount,
  };
}

// ======================================================
// SUMMARY CALCULATIONS
// ======================================================

function calculateStats(rows) {
  const total = rows.length;

  const buy = rows.filter(
    (row) => row.signal === "BUY"
  ).length;

  const sell = rows.filter(
    (row) => row.signal === "SELL"
  ).length;

  const result = {
    totalSignals: total,
    buySignals: buy,
    sellSignals: sell,
  };

  for (const target of TARGETS) {
    const hitColumn = `target${target}Hit`;

    const hits = rows.filter(
      (row) => row[hitColumn] === "YES"
    ).length;

    const misses = total - hits;

    const accuracy = total > 0
      ? (hits / total) * 100
      : 0;

    result[`target${target}Hits`] = hits;
    result[`target${target}Misses`] = misses;
    result[`target${target}Accuracy`] =
      accuracy.toFixed(2);
  }

  return result;
}

// ======================================================
// BUILD TRAIN / TEST SUMMARY
// ======================================================

function buildSummary(rows, split) {
  const combinations = new Map();

  for (const row of rows) {
    const key = `${row.atrPeriod}_${row.multiplier}`;

    if (!combinations.has(key)) {
      combinations.set(key, {
        atrPeriod: Number(row.atrPeriod),
        multiplier: Number(row.multiplier),
        trainRows: [],
        testRows: [],
      });
    }

    const combination = combinations.get(key);

    if (split.trainDates.has(row.tradingDate)) {
      combination.trainRows.push(row);
    } else if (split.testDates.has(row.tradingDate)) {
      combination.testRows.push(row);
    }
  }

  const summary = [];

  for (const combination of combinations.values()) {
    const trainAll = calculateStats(
      combination.trainRows
    );

    const testAll = calculateStats(
      combination.testRows
    );

    const trainBuy = calculateStats(
      combination.trainRows.filter(
        (row) => row.signal === "BUY"
      )
    );

    const trainSell = calculateStats(
      combination.trainRows.filter(
        (row) => row.signal === "SELL"
      )
    );

    const testBuy = calculateStats(
      combination.testRows.filter(
        (row) => row.signal === "BUY"
      )
    );

    const testSell = calculateStats(
      combination.testRows.filter(
        (row) => row.signal === "SELL"
      )
    );

    summary.push({
      atrPeriod: combination.atrPeriod,
      multiplier: combination.multiplier,

      trainSignals: trainAll.totalSignals,
      testSignals: testAll.totalSignals,

      trainBuySignals: trainBuy.totalSignals,
      trainSellSignals: trainSell.totalSignals,

      testBuySignals: testBuy.totalSignals,
      testSellSignals: testSell.totalSignals,

      train40Accuracy: trainAll.target40Accuracy,
      test40Accuracy: testAll.target40Accuracy,

      train50Accuracy: trainAll.target50Accuracy,
      test50Accuracy: testAll.target50Accuracy,

      train60Accuracy: trainAll.target60Accuracy,
      test60Accuracy: testAll.target60Accuracy,

      trainBuy40: trainBuy.target40Accuracy,
      testBuy40: testBuy.target40Accuracy,

      trainSell40: trainSell.target40Accuracy,
      testSell40: testSell.target40Accuracy,

      trainBuy50: trainBuy.target50Accuracy,
      testBuy50: testBuy.target50Accuracy,

      trainSell50: trainSell.target50Accuracy,
      testSell50: testSell.target50Accuracy,

      trainBuy60: trainBuy.target60Accuracy,
      testBuy60: testBuy.target60Accuracy,

      trainSell60: trainSell.target60Accuracy,
      testSell60: testSell.target60Accuracy,

      train40Hits: trainAll.target40Hits,
      test40Hits: testAll.target40Hits,

      train50Hits: trainAll.target50Hits,
      test50Hits: testAll.target50Hits,

      train60Hits: trainAll.target60Hits,
      test60Hits: testAll.target60Hits,
    });
  }

  return summary;
}

// ======================================================
// DAILY VALIDATION REPORT
// ======================================================

function buildDailyReport(rows, split) {
  return rows.map((row) => ({
    tradingDate: row.tradingDate,
    period: split.trainDates.has(row.tradingDate)
      ? "TRAIN"
      : "TEST",

    atrPeriod: row.atrPeriod,
    multiplier: row.multiplier,

    totalSignals: Number(row.totalSignals),
    buySignals: Number(row.buySignals),
    sellSignals: Number(row.sellSignals),

    target40Hits: Number(row.target40Hits),
    target40Accuracy: row.target40Accuracy,

    target50Hits: Number(row.target50Hits),
    target50Accuracy: row.target50Accuracy,

    target60Hits: Number(row.target60Hits),
    target60Accuracy: row.target60Accuracy,
  }));
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
      headers
        .map((header) => escapeCSV(row[header]))
        .join(",")
    ),
  ];

  fs.writeFileSync(
    filePath,
    lines.join("\n"),
    "utf8"
  );
}

// ======================================================
// MAIN
// ======================================================

function main() {
  console.log("\n==========================================");
  console.log(" SUPERTREND 70/30 VALIDATION");
  console.log("==========================================\n");

  const rows = loadCSV(INPUT_FILE);

  const split = splitTradingDays(rows);

  console.log("Total Trading Days:", split.dates.length);
  console.log("Training Days:", split.trainCount);
  console.log("Testing Days:", split.testCount);

  console.log(
    "Training Period:",
    split.dates[0],
    "to",
    split.dates[split.trainCount - 1]
  );

  console.log(
    "Testing Period:",
    split.dates[split.trainCount],
    "to",
    split.dates[split.dates.length - 1]
  );

  const summary = buildSummary(rows, split);
  const dailyReport = buildDailyReport(rows, split);

  // Rank by TRAINING 60-point hit rate.
  // TEST results are not used for ranking.
  summary.sort((a, b) => {
    const difference =
      Number(b.train60Accuracy) -
      Number(a.train60Accuracy);

    if (difference !== 0) return difference;

    return (
      Number(b.train50Accuracy) -
      Number(a.train50Accuracy)
    );
  });

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  writeCSV(SUMMARY_FILE, summary);
  writeCSV(DAILY_FILE, dailyReport);

  console.log("\n==========================================");
  console.log(" VALIDATION COMPLETED");
  console.log("==========================================");

  console.log("\nSUMMARY FILE:");
  console.log(SUMMARY_FILE);

  console.log("\nDAILY FILE:");
  console.log(DAILY_FILE);

  console.log("\nTOP 10 BY TRAINING 60-POINT ACCURACY\n");

  console.table(
    summary.slice(0, 10).map((row) => ({
      ATR: row.atrPeriod,
      Multiplier: row.multiplier,
      TrainSignals: row.trainSignals,
      TestSignals: row.testSignals,

      "Train 40%": row.train40Accuracy,
      "Test 40%": row.test40Accuracy,

      "Train 50%": row.train50Accuracy,
      "Test 50%": row.test50Accuracy,

      "Train 60%": row.train60Accuracy,
      "Test 60%": row.test60Accuracy,
    }))
  );

  console.log("\nIMPORTANT:");
  console.log("- First 70% of dates are Training.");
  console.log("- Last 30% of dates are Testing.");
  console.log("- Dates are split chronologically.");
  console.log("- Test results are not used for ranking.");
  console.log("- BUY and SELL results are reported separately.");
  console.log("- Target hit rates use the existing signal details.");
  console.log("- This is historical validation, not a live guarantee.");
}

try {
  main();
} catch (error) {
  console.error("\nVALIDATION FAILED:");
  console.error(error.message);
  process.exitCode = 1;
}
