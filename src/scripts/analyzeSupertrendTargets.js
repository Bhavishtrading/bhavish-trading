
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
  "SUPERTREND_DAILY_TARGET_ACCURACY.csv"
);

const OVERALL_FILE = path.join(
  OUTPUT_DIR,
  "SUPERTREND_OVERALL_TARGET_ACCURACY.csv"
);

const SIGNAL_FILE = path.join(
  OUTPUT_DIR,
  "SUPERTREND_TARGET_SIGNAL_DETAILS.csv"
);

const ATR_PERIODS = [7, 10, 14, 20, 21];
const MULTIPLIERS = [2, 2.5, 3, 3.5, 4];
const TARGETS = [40, 50, 60];

// Include candles stamped up to 15:20 IST.
const DAY_CUTOFF_MINUTES = 15 * 60 + 20;

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
    throw new Error(`NIFTY history CSV not found: ${INPUT_FILE}`);
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

  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();

  return {
    date: date.toISOString().slice(0, 10),
    hour,
    minute,
    minuteOfDay: hour * 60 + minute,
  };
}

function groupCandlesByDay(candles) {
  const groups = new Map();

  candles.forEach((candle, index) => {
    const ist = getIST(candle.date);

    if (ist.minuteOfDay > DAY_CUTOFF_MINUTES) return;

    if (!groups.has(ist.date)) {
      groups.set(ist.date, []);
    }

    groups.get(ist.date).push(index);
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
// TARGET EVALUATION
//
// Signal confirmed at candle close.
// Entry reference = next candle open.
// Target check starts from entry candle.
// Opposite-signal candle High/Low is included.
// ======================================================

function evaluateSignal({
  candles,
  tradingDate,
  atrPeriod,
  multiplier,
  direction,
  signalIndex,
  entryIndex,
  endIndex,
  exitReason,
}) {
  const side = direction === 1 ? "BUY" : "SELL";

  const signalCandle = candles[signalIndex];
  const entryCandle = candles[entryIndex];

  const entryPrice = entryCandle.open;

  let maxFavorable = 0;
  let maxAdverse = 0;

  const targetHits = {
    40: false,
    50: false,
    60: false,
  };

  let firstTarget40Time = "";
  let firstTarget50Time = "";
  let firstTarget60Time = "";

  for (let i = entryIndex; i <= endIndex; i++) {
    const candle = candles[i];

    const favorableMove =
      direction === 1
        ? candle.high - entryPrice
        : entryPrice - candle.low;

    const adverseMove =
      direction === 1
        ? entryPrice - candle.low
        : candle.high - entryPrice;

    maxFavorable = Math.max(
      maxFavorable,
      favorableMove
    );

    maxAdverse = Math.max(
      maxAdverse,
      adverseMove
    );

    for (const target of TARGETS) {
      if (
        !targetHits[target] &&
        favorableMove >= target
      ) {
        targetHits[target] = true;

        if (target === 40) {
          firstTarget40Time = candle.date;
        }

        if (target === 50) {
          firstTarget50Time = candle.date;
        }

        if (target === 60) {
          firstTarget60Time = candle.date;
        }
      }
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

    evaluationEndTime: candles[endIndex].date,
    exitReason,

    maxFavorablePoints: Number(
      maxFavorable.toFixed(2)
    ),

    maxAdversePoints: Number(
      maxAdverse.toFixed(2)
    ),

    target40Hit: targetHits[40] ? "YES" : "NO",
    target50Hit: targetHits[50] ? "YES" : "NO",
    target60Hit: targetHits[60] ? "YES" : "NO",

    firstTarget40Time,
    firstTarget50Time,
    firstTarget60Time,
  };
}

// ======================================================
// ANALYZE ONE TRADING DAY
// No overnight carry-forward.
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

  if (indices.length < 2) return signals;

  const firstValidPosition = indices.findIndex(
    (index) => direction[index] !== null
  );

  if (firstValidPosition === -1) return signals;

  const firstIndex = indices[firstValidPosition];

  let activeSignal = {
    signalIndex: firstIndex,
    entryIndex: indices[firstValidPosition + 1],
    direction: direction[firstIndex],
  };

  if (activeSignal.entryIndex === undefined) {
    return signals;
  }

  for (
    let k = firstValidPosition + 1;
    k < indices.length;
    k++
  ) {
    const currentIndex = indices[k];
    const currentDirection = direction[currentIndex];

    if (currentDirection === null) continue;

    const previousDirection = direction[indices[k - 1]];

    const isFlip =
      previousDirection !== null &&
      currentDirection !== previousDirection;

    if (!isFlip || !activeSignal) continue;

    // Include opposite-signal candle High/Low
    // in the previous signal target evaluation.
    if (activeSignal.entryIndex <= currentIndex) {
      signals.push(
        evaluateSignal({
          candles,
          tradingDate,
          atrPeriod,
          multiplier,
          direction: activeSignal.direction,
          signalIndex: activeSignal.signalIndex,
          entryIndex: activeSignal.entryIndex,
          endIndex: currentIndex,
          exitReason: "OPPOSITE_SIGNAL",
        })
      );
    }

    const nextIndex = indices[k + 1];

    if (nextIndex === undefined) {
      activeSignal = null;
      break;
    }

    activeSignal = {
      signalIndex: currentIndex,
      entryIndex: nextIndex,
      direction: currentDirection,
    };
  }

  // Final active signal ends at the day's last candle.
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
          endIndex: lastIndex,
          exitReason: "DAY_CLOSE_1520",
        })
      );
    }
  }

  return signals;
}

// ======================================================
// SUMMARY HELPERS
// ======================================================

function countHits(signals, target) {
  return signals.filter(
    (signal) =>
      signal[`target${target}Hit`] === "YES"
  ).length;
}

function percentage(hitCount, total) {
  return total > 0
    ? (hitCount / total) * 100
    : 0;
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
        .map((key) => escapeCSV(row[key]))
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
  console.log(" SUPERTREND INTRADAY TARGET HIT ANALYSIS");
  console.log("==========================================\n");

  const candles = loadCandles();
  const dayGroups = groupCandlesByDay(candles);

  console.log("Total Candles:", candles.length);
  console.log("Trading Days:", dayGroups.size);
  console.log("ATR Periods:", ATR_PERIODS.join(", "));
  console.log("Multipliers:", MULTIPLIERS.join(", "));
  console.log("Targets:", TARGETS.join(", "));
  console.log("Daily cutoff: 15:20 IST");

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

        const buySignals = daySignals.filter(
          (signal) => signal.signal === "BUY"
        );

        const sellSignals = daySignals.filter(
          (signal) => signal.signal === "SELL"
        );

        const hit40 = countHits(daySignals, 40);
        const hit50 = countHits(daySignals, 50);
        const hit60 = countHits(daySignals, 60);

        dailyRows.push({
          tradingDate,
          atrPeriod,
          multiplier,

          totalSignals: daySignals.length,
          buySignals: buySignals.length,
          sellSignals: sellSignals.length,

          target40Hits: hit40,
          target40Misses: daySignals.length - hit40,
          target40Accuracy: percentage(
            hit40,
            daySignals.length
          ).toFixed(2),

          target50Hits: hit50,
          target50Misses: daySignals.length - hit50,
          target50Accuracy: percentage(
            hit50,
            daySignals.length
          ).toFixed(2),

          target60Hits: hit60,
          target60Misses: daySignals.length - hit60,
          target60Accuracy: percentage(
            hit60,
            daySignals.length
          ).toFixed(2),
        });
      }

      const totalSignals = combinationSignals.length;

      const buyCount = combinationSignals.filter(
        (signal) => signal.signal === "BUY"
      ).length;

      const sellCount = combinationSignals.filter(
        (signal) => signal.signal === "SELL"
      ).length;

      const hit40 = countHits(combinationSignals, 40);
      const hit50 = countHits(combinationSignals, 50);
      const hit60 = countHits(combinationSignals, 60);

      overallRows.push({
        atrPeriod,
        multiplier,
        totalTradingDays: dayGroups.size,

        totalSignals,
        buySignals: buyCount,
        sellSignals: sellCount,

        target40Hits: hit40,
        target40Misses: totalSignals - hit40,
        target40Accuracy: percentage(
          hit40,
          totalSignals
        ).toFixed(2),

        target50Hits: hit50,
        target50Misses: totalSignals - hit50,
        target50Accuracy: percentage(
          hit50,
          totalSignals
        ).toFixed(2),

        target60Hits: hit60,
        target60Misses: totalSignals - hit60,
        target60Accuracy: percentage(
          hit60,
          totalSignals
        ).toFixed(2),
      });

      signalRows.push(...combinationSignals);
    }
  }

  // Rank by 60-point target hit rate,
  // then 50-point and 40-point target hit rates.
  overallRows.sort((a, b) => {
    const diff60 =
      Number(b.target60Accuracy) -
      Number(a.target60Accuracy);

    if (diff60 !== 0) return diff60;

    const diff50 =
      Number(b.target50Accuracy) -
      Number(a.target50Accuracy);

    if (diff50 !== 0) return diff50;

    return (
      Number(b.target40Accuracy) -
      Number(a.target40Accuracy)
    );
  });

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  writeCSV(DAILY_FILE, dailyRows);
  writeCSV(OVERALL_FILE, overallRows);
  writeCSV(SIGNAL_FILE, signalRows);

  console.log("\n==========================================");
  console.log(" ANALYSIS COMPLETED");
  console.log("==========================================");

  console.log("\nDAILY TARGET ACCURACY:");
  console.log(DAILY_FILE);

  console.log("\nOVERALL TARGET ACCURACY:");
  console.log(OVERALL_FILE);

  console.log("\nSIGNAL TARGET DETAILS:");
  console.log(SIGNAL_FILE);

  console.log("\nTOP 10 BY 60-POINT TARGET HIT RATE\n");

  console.table(
    overallRows.slice(0, 10).map((row) => ({
      ATR: row.atrPeriod,
      Multiplier: row.multiplier,
      Signals: row.totalSignals,
      BUY: row.buySignals,
      SELL: row.sellSignals,
      "40 Hit %": row.target40Accuracy + "%",
      "50 Hit %": row.target50Accuracy + "%",
      "60 Hit %": row.target60Accuracy + "%",
    }))
  );

  console.log("\nIMPORTANT RULES:");
  console.log("- Each trading day is analysed independently.");
  console.log("- First available Supertrend direction is the day's opening state.");
  console.log("- Signal candle close confirms the direction.");
  console.log("- Entry reference is the next candle open.");
  console.log("- Target checks use candle High/Low from entry candle onward.");
  console.log("- Opposite-signal candle is included for the previous signal.");
  console.log("- No overnight carry-forward.");
  console.log("- Candles after 15:20 IST are excluded.");
  console.log("- Target hit rate = target hits / total evaluated signals.");
  console.log("- This is NIFTY Spot point movement, not Options P&L.");
}

try {
  main();
} catch (error) {
  console.error("\nANALYSIS FAILED:");
  console.error(error.message);
  process.exitCode = 1;
}
