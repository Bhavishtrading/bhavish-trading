
import fs from "node:fs";
import path from "node:path";

// ==================================================
// ICA + EMA9 CROSSOVER BACKTEST
// ==================================================

const INPUT =
  "data/nifty-history/NIFTY_SPOT_5MIN_2YEARS.csv";

const OUTPUT =
  "data/backtest/ICA_EMA9_TRADES_2026.csv";

const START_DATE = "2026-01-01";
const END_DATE = "2026-11-13";

const TARGET_POINTS = 35;

// IST trading times in minutes
const SESSION_START = 9 * 60 + 15;
const ENTRY_START = 9 * 60 + 50;
const ENTRY_END = 14 * 60 + 30;
const SQUARE_OFF = 15 * 60 + 20;
const SESSION_END = 15 * 60 + 30;

const IST_OFFSET_SECONDS = 19800;

// ==================================================
// IST HELPERS
// ==================================================

function getISTParts(unixTime) {
  const date = new Date(
    (unixTime + IST_OFFSET_SECONDS) * 1000
  );

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
  };
}

function getISTDateKey(unixTime) {
  const p = getISTParts(unixTime);

  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(
    p.day
  ).padStart(2, "0")}`;
}

function getISTMinute(unixTime) {
  const p = getISTParts(unixTime);
  return p.hour * 60 + p.minute;
}

function formatIST(unixTime) {
  const p = getISTParts(unixTime);

  return `${String(p.day).padStart(2, "0")}-${String(
    p.month
  ).padStart(2, "0")}-${p.year} ${String(p.hour).padStart(
    2,
    "0"
  )}:${String(p.minute).padStart(2, "0")}`;
}

// ==================================================
// LOAD CSV
// ==================================================

function loadCandles() {
  if (!fs.existsSync(INPUT)) {
    throw new Error(`Historical CSV not found: ${INPUT}`);
  }

  const lines = fs
    .readFileSync(INPUT, "utf8")
    .trim()
    .split(/\r?\n/);

  const candles = [];

  for (const line of lines.slice(1)) {
    const values = line.match(/"[^"]*"|[^,]+/g);

    if (!values || values.length < 6) continue;

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
      !Number.isFinite(candle.close)
    ) {
      continue;
    }

    candles.push(candle);
  }

  candles.sort((a, b) => a.time - b.time);

  return candles;
}

// ==================================================
// EMA9 - SAME CHART FORMULA
// ==================================================

function calculateEMA(candles, period = 9) {
  const multiplier = 2 / (period + 1);

  let previousEMA = null;

  return candles.map((candle, index) => {
    const close = Number(candle.close);

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

// ==================================================
// ICA - ORIGINAL CHART FORMULA
// ==================================================

function calculateICA5Minute(candles) {
  const sorted = [...candles].sort(
    (a, b) => a.time - b.time
  );

  const cumulativeByDay = new Map();
  const result = new Array(sorted.length).fill(null);

  for (let i = 0; i < sorted.length; i++) {
    const candle = sorted[i];

    const dateKey = getISTDateKey(candle.time);
    const minute = getISTMinute(candle.time);

    if (
      minute < SESSION_START ||
      minute >= SESSION_END
    ) {
      continue;
    }

    const close = Number(candle.close);

    if (!Number.isFinite(close)) continue;

    let session = cumulativeByDay.get(dateKey);

    if (!session) {
      session = {
        sum: 0,
        count: 0,
      };

      cumulativeByDay.set(dateKey, session);
    }

    session.sum += close;
    session.count += 1;

    result[i] = session.sum / session.count;
  }

  return result;
}

// ==================================================
// CROSSOVER
// ==================================================

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

  // EMA9 crosses ICA upwards
  if (
    previousEMA <= previousICA &&
    currentEMA > currentICA
  ) {
    return "BUY";
  }

  // EMA9 crosses ICA downwards
  if (
    previousEMA >= previousICA &&
    currentEMA < currentICA
  ) {
    return "SELL";
  }

  return null;
}

// ==================================================
// TRADE MANAGEMENT
// ==================================================

const trades = [];

let position = null;

function openTrade(direction, candle) {
  position = {
    direction,
    entry: candle.open,
    entryTime: candle.time,
    entryDate: getISTDateKey(candle.time),
  };
}

function closeTrade(price, candle, reason) {
  if (!position) return;

  const points =
    position.direction === "BUY"
      ? price - position.entry
      : position.entry - price;

  trades.push({
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

// ==================================================
// BACKTEST ENGINE
// ==================================================

function runBacktest(candles) {
  const ema9 = calculateEMA(candles, 9);
  const ica = calculateICA5Minute(candles);

  let previousSignalIndex = null;
  let pendingEntry = null;

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];

    const date = getISTDateKey(candle.time);
    const minute = getISTMinute(candle.time);

    if (date < START_DATE || date > END_DATE) {
      continue;
    }

    // Only regular trading session
    if (
      minute < SESSION_START ||
      minute >= SESSION_END
    ) {
      continue;
    }

    // ==========================================
    // Execute pending entry at next candle open
    // ==========================================

    if (pendingEntry && !position) {
      if (
        pendingEntry.date === date &&
        minute >= ENTRY_START &&
        minute <= ENTRY_END
      ) {
        openTrade(pendingEntry.direction, candle);
      }

      pendingEntry = null;
    }

    // ==========================================
    // Square off at 3:20 PM
    // ==========================================

    if (minute >= SQUARE_OFF) {
      if (position) {
        closeTrade(
          candle.open,
          candle,
          "TIME_SQUARE_OFF"
        );
      }

      pendingEntry = null;
      previousSignalIndex = null;
      continue;
    }

    // ==========================================
    // Target check
    // ==========================================

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

    // ==========================================
    // ICA crossover calculation
    // ==========================================

    if (
      i === 0 ||
      ica[i] === null ||
      ica[i - 1] === null
    ) {
      previousSignalIndex = null;
      continue;
    }

    // Prevent crossover across different sessions
    if (
      getISTDateKey(candles[i - 1].time) !== date
    ) {
      previousSignalIndex = null;
      continue;
    }

    const signal = detectCrossover(
      ema9[i - 1],
      ema9[i],
      ica[i - 1],
      ica[i]
    );

    if (!signal) continue;

    // ==========================================
    // Position exit on opposite crossover
    // ==========================================

    if (position) {
      const opposite =
        (position.direction === "BUY" && signal === "SELL") ||
        (position.direction === "SELL" && signal === "BUY");

      if (opposite) {
        closeTrade(
          candle.close,
          candle,
          "OPPOSITE_CROSSOVER"
        );
      }
    }

    // ==========================================
    // New entry signal
    // ==========================================

    if (
      !position &&
      minute >= ENTRY_START &&
      minute < ENTRY_END
    ) {
      pendingEntry = {
        direction: signal,
        date,
      };
    }
  }

  // End-of-data protection
  if (position) {
    const lastCandle = candles[candles.length - 1];

    closeTrade(
      lastCandle.close,
      lastCandle,
      "END_OF_DATA"
    );
  }
}

// ==================================================
// PERFORMANCE STATISTICS
// ==================================================

function calculateStats(selectedTrades) {
  const total = selectedTrades.length;

  const wins = selectedTrades.filter(
    (trade) => trade.points > 0
  );

  const losses = selectedTrades.filter(
    (trade) => trade.points < 0
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

  const targetHits = selectedTrades.filter(
    (trade) => trade.exitReason === "TARGET_35"
  ).length;

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
    totalTrades: total,
    wins: wins.length,
    losses: losses.length,
    targetHits,
    winRate: total
      ? Number((wins.length / total * 100).toFixed(2))
      : 0,
    targetHitRate: total
      ? Number((targetHits / total * 100).toFixed(2))
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

// ==================================================
// EXPORT CSV
// ==================================================

function exportTrades() {
  fs.mkdirSync(path.dirname(OUTPUT), {
    recursive: true,
  });

  const headers = [
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
      headers
        .map((key) => trade[key])
        .join(",")
    ),
  ];

  fs.writeFileSync(
    OUTPUT,
    lines.join("\n"),
    "utf8"
  );
}

// ==================================================
// MAIN
// ==================================================

function main() {
  console.log("\n========================================");
  console.log(" ICA + EMA9 CROSSOVER BACKTEST");
  console.log("========================================");

  const candles = loadCandles();

  console.log("Historical candles:", candles.length);
  console.log("Period:", START_DATE, "to", END_DATE);
  console.log("Timeframe: 5 Minutes");
  console.log("Entry window: 09:50 AM - 02:30 PM IST");
  console.log("Square off: 03:20 PM IST");
  console.log("Target:", TARGET_POINTS, "points");
  console.log("Exit: Target / Opposite Crossover");
  console.log("Stop Loss: No fixed SL");

  runBacktest(candles);

  const buyTrades = trades.filter(
    (trade) => trade.direction === "BUY"
  );

  const sellTrades = trades.filter(
    (trade) => trade.direction === "SELL"
  );

  console.log("\n========== BUY CE ==========");
  console.table([calculateStats(buyTrades)]);

  console.log("\n========== BUY PE ==========");
  console.table([calculateStats(sellTrades)]);

  console.log("\n========== COMBINED ==========");
  console.table([calculateStats(trades)]);

  console.log("\n========== EXIT BREAKDOWN ==========");

  console.table(
    [
      "TARGET_35",
      "OPPOSITE_CROSSOVER",
      "TIME_SQUARE_OFF",
      "END_OF_DATA",
    ].map((reason) => ({
      reason,
      count: trades.filter(
        (trade) => trade.exitReason === reason
      ).length,
    }))
  );

  exportTrades();

  console.log("\nCSV saved:", OUTPUT);
  console.log("Total completed trades:", trades.length);
  console.log("\nBACKTEST COMPLETED");
}

main();
