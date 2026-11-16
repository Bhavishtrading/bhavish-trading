
import fs from "node:fs";
import path from "node:path";

// =====================================================
// ICA + EMA9 | WEEKEND-CORRECTED BACKTEST
// TRAINING + VALIDATION + MONTHLY REPORT
// =====================================================

const INPUT =
  "data/nifty-history/NIFTY_SPOT_5MIN_2YEARS.csv";

const OUTPUT =
  "data/backtest/ICA_EMA9_VALIDATION_TRADES.csv";

const TARGET_POINTS = 35;
const IST_OFFSET_SECONDS = 19800;

const SESSION_START = 9 * 60 + 15;
const ENTRY_START = 9 * 60 + 50;
const ENTRY_END = 14 * 60 + 30;
const SQUARE_OFF = 15 * 60 + 20;
const SESSION_END = 15 * 60 + 30;

const TRAIN_START = "2026-01-01";
const TRAIN_END = "2026-08-31";

const VALIDATION_START = "2026-09-01";
const VALIDATION_END = "2026-11-13";

const trades = [];

let position = null;
let pendingAction = null;

// =====================================================
// IST HELPERS
// =====================================================

function getISTDate(time) {
  return new Date(
    (time + IST_OFFSET_SECONDS) * 1000
  );
}

function getISTParts(time) {
  const date = getISTDate(time);

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    weekday: date.getUTCDay(),
  };
}

function getDateKey(time) {
  const p = getISTParts(time);

  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(
    p.day
  ).padStart(2, "0")}`;
}

function getMinute(time) {
  const p = getISTParts(time);
  return p.hour * 60 + p.minute;
}

function formatIST(time) {
  const p = getISTParts(time);

  return `${String(p.day).padStart(2, "0")}-${String(
    p.month
  ).padStart(2, "0")}-${p.year} ${String(p.hour).padStart(
    2,
    "0"
  )}:${String(p.minute).padStart(2, "0")}`;
}

// =====================================================
// CSV LOADER
// IMPORTANT: REMOVE WEEKENDS BEFORE EMA CALCULATION
// =====================================================

function loadCandles() {
  if (!fs.existsSync(INPUT)) {
    throw new Error(`CSV not found: ${INPUT}`);
  }

  const lines = fs
    .readFileSync(INPUT, "utf8")
    .trim()
    .split(/\r?\n/);

  const candles = [];

  let weekendCandlesRemoved = 0;
  let invalidCandlesRemoved = 0;

  for (const line of lines.slice(1)) {
    const values = line.match(/"[^"]*"|[^,]+/g);

    if (!values || values.length < 6) {
      invalidCandlesRemoved++;
      continue;
    }

    const clean = values.map((value) =>
      value.trim().replace(/^"|"$/g, "")
    );

    const [date, open, high, low, close, volume] = clean;

    const candle = {
      time: Math.floor(new Date(date).getTime() / 1000),
      open: Number(open),
      high: Number(high),
      low: Number(low),
      close: Number(close),
      volume: Number(volume) || 0,
    };

    if (
      !Number.isFinite(candle.time) ||
      !Number.isFinite(candle.open) ||
      !Number.isFinite(candle.high) ||
      !Number.isFinite(candle.low) ||
      !Number.isFinite(candle.close) ||
      candle.high < candle.low ||
      candle.high < Math.max(candle.open, candle.close) ||
      candle.low > Math.min(candle.open, candle.close)
    ) {
      invalidCandlesRemoved++;
      continue;
    }

    // Check weekday using IST date.
    // Sunday = 0, Saturday = 6.

    const weekday = getISTParts(candle.time).weekday;

    if (weekday === 0 || weekday === 6) {
      weekendCandlesRemoved++;
      continue;
    }

    candles.push(candle);
  }

  candles.sort((a, b) => a.time - b.time);

  console.log("\n========== DATA CLEANING ==========");
  console.log("Original CSV rows:", lines.length - 1);
  console.log("Weekend candles removed:", weekendCandlesRemoved);
  console.log("Invalid candles removed:", invalidCandlesRemoved);
  console.log("Final candles:", candles.length);

  return candles;
}

// =====================================================
// EMA9 - SAME JAVASCRIPT FORMULA
// =====================================================

function calculateEMA(candles, period = 9) {
  const multiplier = 2 / (period + 1);

  let previousEMA = null;

  return candles.map((candle, index) => {
    const close = candle.close;

    if (index === 0) {
      previousEMA = close;
    } else {
      previousEMA =
        close * multiplier +
        previousEMA * (1 - multiplier);
    }

    return previousEMA;
  });
}

// =====================================================
// ICA - DAILY SESSION LOGIC
// =====================================================

function calculateICA5Minute(candles) {
  const cumulativeByDay = new Map();

  return candles.map((candle) => {
    const date = getDateKey(candle.time);
    const minute = getMinute(candle.time);

    if (
      minute < SESSION_START ||
      minute >= SESSION_END
    ) {
      return null;
    }

    let session = cumulativeByDay.get(date);

    if (!session) {
      session = { sum: 0, count: 0 };
      cumulativeByDay.set(date, session);
    }

    session.sum += candle.close;
    session.count += 1;

    return session.sum / session.count;
  });
}

// =====================================================
// CROSSOVER DETECTION
// =====================================================

function detectCrossover(
  previousEMA,
  currentEMA,
  previousICA,
  currentICA
) {
  if (
    previousICA === null ||
    currentICA === null
  ) {
    return null;
  }

  if (
    previousEMA <= previousICA &&
    currentEMA > currentICA
  ) {
    return "BUY";
  }

  if (
    previousEMA >= previousICA &&
    currentEMA < currentICA
  ) {
    return "SELL";
  }

  return null;
}

// =====================================================
// TRADE MANAGEMENT
// =====================================================

function openTrade(direction, candle) {
  position = {
    direction,
    entry: candle.open,
    entryTime: candle.time,
    entryDate: getDateKey(candle.time),
  };
}

function closeTrade(price, candle, reason) {
  if (!position) return;

  const points =
    position.direction === "BUY"
      ? price - position.entry
      : position.entry - price;

  trades.push({
    period:
      position.entryDate <= TRAIN_END
        ? "TRAINING"
        : "VALIDATION",

    direction: position.direction,
    entryDate: position.entryDate,
    entryTime: formatIST(position.entryTime),
    exitTime: formatIST(candle.time),

    entry: Number(position.entry.toFixed(2)),
    exit: Number(price.toFixed(2)),
    points: Number(points.toFixed(2)),

    result:
      points > 0
        ? "WIN"
        : points < 0
          ? "LOSS"
          : "BREAKEVEN",

    exitReason: reason,
  });

  position = null;
}

// =====================================================
// BACKTEST ENGINE
// =====================================================

function runBacktest(candles) {
  // EMA is calculated AFTER weekend candles are removed.
  const ema9 = calculateEMA(candles, 9);

  const ica = calculateICA5Minute(candles);

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];

    const date = getDateKey(candle.time);
    const minute = getMinute(candle.time);

    if (
      date < TRAIN_START ||
      date > VALIDATION_END
    ) {
      continue;
    }

    if (
      minute < SESSION_START ||
      minute >= SESSION_END
    ) {
      continue;
    }

    const nextCandle = candles[i + 1] || null;

    const nextDate = nextCandle
      ? getDateKey(nextCandle.time)
      : null;

    const nextMinute = nextCandle
      ? getMinute(nextCandle.time)
      : null;

    // ---------------------------------------------
    // Execute pending action at next candle OPEN
    // ---------------------------------------------

    if (pendingAction) {
      if (pendingAction.date === date) {
        if (pendingAction.type === "ENTRY") {
          if (
            !position &&
            minute >= ENTRY_START &&
            minute <= ENTRY_END
          ) {
            openTrade(
              pendingAction.direction,
              candle
            );
          }
        }

        if (pendingAction.type === "REVERSE") {
          closeTrade(
            candle.open,
            candle,
            "OPPOSITE_CROSSOVER"
          );

          if (
            minute >= ENTRY_START &&
            minute <= ENTRY_END
          ) {
            openTrade(
              pendingAction.direction,
              candle
            );
          }
        }

        if (pendingAction.type === "EXIT_ONLY") {
          closeTrade(
            candle.open,
            candle,
            "OPPOSITE_CROSSOVER"
          );
        }
      }

      pendingAction = null;
    }

    // ---------------------------------------------
    // 3:20 PM SQUARE-OFF AT CANDLE OPEN
    // ---------------------------------------------

    if (minute >= SQUARE_OFF) {
      if (position) {
        closeTrade(
          candle.open,
          candle,
          "TIME_SQUARE_OFF"
        );
      }

      pendingAction = null;
      continue;
    }

    // ---------------------------------------------
    // CHECK 35-POINT TARGET
    // ---------------------------------------------

    if (position) {
      const targetPrice =
        position.direction === "BUY"
          ? position.entry + TARGET_POINTS
          : position.entry - TARGET_POINTS;

      const targetHit =
        position.direction === "BUY"
          ? candle.high >= targetPrice
          : candle.low <= targetPrice;

      if (targetHit) {
        closeTrade(
          targetPrice,
          candle,
          "TARGET_35"
        );
      }
    }

    // ---------------------------------------------
    // DO NOT DETECT CROSSOVER ACROSS TRADING DAYS
    // ---------------------------------------------

    if (
      i === 0 ||
      getDateKey(candles[i - 1].time) !== date ||
      ica[i] === null ||
      ica[i - 1] === null
    ) {
      continue;
    }

    const signal = detectCrossover(
      ema9[i - 1],
      ema9[i],
      ica[i - 1],
      ica[i]
    );

    if (!signal) continue;

    if (!nextCandle || nextDate !== date) {
      continue;
    }

    // ---------------------------------------------
    // OPPOSITE CROSSOVER EXIT
    // ---------------------------------------------

    if (position) {
      const opposite =
        (position.direction === "BUY" && signal === "SELL") ||
        (position.direction === "SELL" && signal === "BUY");

      if (opposite) {
        if (
          nextMinute >= ENTRY_START &&
          nextMinute <= ENTRY_END
        ) {
          pendingAction = {
            type: "REVERSE",
            direction: signal,
            date,
          };
        } else {
          pendingAction = {
            type: "EXIT_ONLY",
            date,
          };
        }
      }

      continue;
    }

    // ---------------------------------------------
    // NEW ENTRY SIGNAL
    // ---------------------------------------------

    if (
      nextMinute >= ENTRY_START &&
      nextMinute <= ENTRY_END
    ) {
      pendingAction = {
        type: "ENTRY",
        direction: signal,
        date,
      };
    }
  }

  // Close any remaining position at final candle

  if (position) {
    const lastCandle = candles[candles.length - 1];

    closeTrade(
      lastCandle.close,
      lastCandle,
      "END_OF_DATA"
    );
  }
}

// =====================================================
// PERFORMANCE STATISTICS
// =====================================================

function calculateStats(selectedTrades) {
  const total = selectedTrades.length;

  const wins = selectedTrades.filter(
    (trade) => trade.points > 0
  );

  const losses = selectedTrades.filter(
    (trade) => trade.points < 0
  );

  const targetHits = selectedTrades.filter(
    (trade) => trade.exitReason === "TARGET_35"
  );

  const grossProfit = wins.reduce(
    (sum, trade) => sum + trade.points,
    0
  );

  const grossLoss = Math.abs(
    losses.reduce(
      (sum, trade) => sum + trade.points,
      0
    )
  );

  const netPoints = selectedTrades.reduce(
    (sum, trade) => sum + trade.points,
    0
  );

  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;

  for (const trade of selectedTrades) {
    equity += trade.points;
    peak = Math.max(peak, equity);

    maxDrawdown = Math.max(
      maxDrawdown,
      peak - equity
    );
  }

  return {
    trades: total,
    wins: wins.length,
    losses: losses.length,
    targetHits: targetHits.length,

    winRate: total
      ? Number((wins.length / total * 100).toFixed(2))
      : 0,

    targetHitRate: total
      ? Number((targetHits.length / total * 100).toFixed(2))
      : 0,

    netPoints: Number(netPoints.toFixed(2)),
    grossProfit: Number(grossProfit.toFixed(2)),
    grossLoss: Number(grossLoss.toFixed(2)),

    profitFactor: grossLoss
      ? Number((grossProfit / grossLoss).toFixed(2))
      : grossProfit > 0
        ? "Infinity"
        : 0,

    maxDrawdown: Number(maxDrawdown.toFixed(2)),
  };
}

// =====================================================
// CSV EXPORT
// =====================================================

function exportTrades() {
  fs.mkdirSync(path.dirname(OUTPUT), {
    recursive: true,
  });

  const headers = [
    "period",
    "direction",
    "entryDate",
    "entryTime",
    "exitTime",
    "entry",
    "exit",
    "points",
    "result",
    "exitReason",
  ];

  const lines = [
    headers.join(","),
    ...trades.map((trade) =>
      headers.map((key) => trade[key]).join(",")
    ),
  ];

  fs.writeFileSync(
    OUTPUT,
    lines.join("\n"),
    "utf8"
  );
}

// =====================================================
// TRAINING / VALIDATION REPORT
// =====================================================

function printPeriodReport(period, label) {
  const periodTrades = trades.filter(
    (trade) => trade.period === period
  );

  const buyTrades = periodTrades.filter(
    (trade) => trade.direction === "BUY"
  );

  const sellTrades = periodTrades.filter(
    (trade) => trade.direction === "SELL"
  );

  console.log(`\n========== ${label} ==========`);

  console.log("\nBUY CE");
  console.table([calculateStats(buyTrades)]);

  console.log("\nBUY PE");
  console.table([calculateStats(sellTrades)]);

  console.log("\nCOMBINED");
  console.table([calculateStats(periodTrades)]);
}

// =====================================================
// MONTHLY VALIDATION REPORT
// =====================================================

function printMonthlyValidationReport() {
  const validationTrades = trades.filter(
    (trade) => trade.period === "VALIDATION"
  );

  const months = [
    {
      key: "2026-09",
      label: "SEPTEMBER 2026",
    },
    {
      key: "2026-10",
      label: "OCTOBER 2026",
    },
    {
      key: "2026-11",
      label: "NOVEMBER 1-13, 2026",
    },
  ];

  console.log("\n======================================");
  console.log(" MONTHLY VALIDATION PERFORMANCE");
  console.log("======================================");

  for (const month of months) {
    const monthlyTrades = validationTrades.filter(
      (trade) => trade.entryDate.startsWith(month.key)
    );

    const buyTrades = monthlyTrades.filter(
      (trade) => trade.direction === "BUY"
    );

    const sellTrades = monthlyTrades.filter(
      (trade) => trade.direction === "SELL"
    );

    console.log(`\n========== ${month.label} ==========`);

    console.log("\nBUY CE");
    console.table([calculateStats(buyTrades)]);

    console.log("\nBUY PE");
    console.table([calculateStats(sellTrades)]);

    console.log("\nCOMBINED");
    console.table([calculateStats(monthlyTrades)]);
  }
}

// =====================================================
// VALIDATION EXIT BREAKDOWN
// =====================================================

function printValidationExitBreakdown() {
  const validationTrades = trades.filter(
    (trade) => trade.period === "VALIDATION"
  );

  console.log("\n========== VALIDATION EXIT BREAKDOWN ==========");

  console.table(
    [
      "TARGET_35",
      "OPPOSITE_CROSSOVER",
      "TIME_SQUARE_OFF",
      "END_OF_DATA",
    ].map((reason) => ({
      reason,
      count: validationTrades.filter(
        (trade) => trade.exitReason === reason
      ).length,
    }))
  );
}

// =====================================================
// MAIN
// =====================================================

function main() {
  console.log("\n======================================");
  console.log(" ICA + EMA9 WEEKEND-CORRECTED BACKTEST");
  console.log("======================================");

  const candles = loadCandles();

  console.log("\nHistorical candles after cleaning:", candles.length);

  console.log("Training:", TRAIN_START, "to", TRAIN_END);

  console.log(
    "Validation:",
    VALIDATION_START,
    "to",
    VALIDATION_END
  );

  console.log("Entry window: 09:50 - 14:30 IST");
  console.log("Square-off: 15:20 IST");
  console.log("Target:", TARGET_POINTS, "points");
  console.log("Exit: Opposite crossover / Target");
  console.log("Stop Loss: None");

  runBacktest(candles);

  printPeriodReport("TRAINING", "TRAINING RESULTS");
  printPeriodReport("VALIDATION", "VALIDATION RESULTS");

  printMonthlyValidationReport();

  printValidationExitBreakdown();

  exportTrades();

  console.log("\nTotal trades:", trades.length);
  console.log("CSV saved:", OUTPUT);
  console.log("\nBACKTEST COMPLETED");
}

main();
