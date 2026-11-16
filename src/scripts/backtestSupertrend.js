
import fs from "fs";
import path from "path";

// ======================================================
// CONFIGURATION
// ======================================================

const INPUT_FILE = path.join(
  process.cwd(),
  "data",
  "nifty-history",
  "NIFTY_SPOT_5MIN_2YEARS.csv"
);

const OUTPUT_FILE = path.join(
  process.cwd(),
  "data",
  "nifty-history",
  "SUPERTREND_BACKTEST_RESULTS.csv"
);

const ATR_PERIODS = [7, 10, 14, 20, 21];
const MULTIPLIERS = [2, 2.5, 3, 3.5, 4];

// Assumed cost per side, in NIFTY points.
// 0 = no costs. This is not actual brokerage.
const COST_PER_SIDE_POINTS = 0;

// Training / testing split
const TRAINING_PERCENT = 70;

// ======================================================
// CSV HELPERS
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
    throw new Error(`Input CSV not found: ${INPUT_FILE}`);
  }

  const content = fs.readFileSync(INPUT_FILE, "utf8");
  const lines = content.trim().split(/\r?\n/);

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
      !candle.date ||
      !Number.isFinite(candle.open) ||
      !Number.isFinite(candle.high) ||
      !Number.isFinite(candle.low) ||
      !Number.isFinite(candle.close)
    ) {
      continue;
    }

    candles.push(candle);
  }

  candles.sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  // Remove duplicate timestamps
  const unique = new Map();

  for (const candle of candles) {
    unique.set(candle.date, candle);
  }

  return Array.from(unique.values());
}

// ======================================================
// INDIAN TRADING DATE
// CSV timestamps are UTC. Convert to IST (+05:30).
// ======================================================

function getTradingDate(isoDate) {
  const timestamp = new Date(isoDate).getTime();

  return new Date(timestamp + 330 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

// ======================================================
// EMA
// ======================================================

function calculateEMA(candles, period) {
  const result = new Array(candles.length).fill(null);

  const multiplier = 2 / (period + 1);

  let ema = candles[0].close;

  result[0] = ema;

  for (let i = 1; i < candles.length; i++) {
    ema =
      candles[i].close * multiplier +
      ema * (1 - multiplier);

    result[i] = ema;
  }

  return result;
}

// ======================================================
// ATR - WILDER'S RMA
// ======================================================

function calculateATR(candles, period) {
  const length = candles.length;

  const trueRanges = new Array(length).fill(null);
  const atr = new Array(length).fill(null);

  for (let i = 0; i < length; i++) {
    const candle = candles[i];

    if (i === 0) {
      trueRanges[i] = candle.high - candle.low;
      continue;
    }

    const previousClose = candles[i - 1].close;

    trueRanges[i] = Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose)
    );
  }

  if (length < period) {
    return atr;
  }

  let initialSum = 0;

  for (let i = 0; i < period; i++) {
    initialSum += trueRanges[i];
  }

  let previousATR = initialSum / period;

  atr[period - 1] = previousATR;

  for (let i = period; i < length; i++) {
    previousATR =
      (previousATR * (period - 1) + trueRanges[i]) /
      period;

    atr[i] = previousATR;
  }

  return atr;
}

// ======================================================
// SUPERTREND
// Direction: 1 = Bullish, -1 = Bearish
// ======================================================

function calculateSupertrend(candles, atrPeriod, multiplier) {
  const length = candles.length;

  const atr = calculateATR(candles, atrPeriod);

  const direction = new Array(length).fill(null);
  const supertrend = new Array(length).fill(null);

  const finalUpper = new Array(length).fill(null);
  const finalLower = new Array(length).fill(null);

  const firstValidIndex = atrPeriod - 1;

  for (let i = firstValidIndex; i < length; i++) {
    const candle = candles[i];

    const middle = (candle.high + candle.low) / 2;

    const basicUpper = middle + multiplier * atr[i];
    const basicLower = middle - multiplier * atr[i];

    if (i === firstValidIndex) {
      finalUpper[i] = basicUpper;
      finalLower[i] = basicLower;

      direction[i] =
        candle.close >= middle ? 1 : -1;

      supertrend[i] =
        direction[i] === 1
          ? finalLower[i]
          : finalUpper[i];

      continue;
    }

    const previousUpper = finalUpper[i - 1];
    const previousLower = finalLower[i - 1];
    const previousDirection = direction[i - 1];
    const previousClose = candles[i - 1].close;

    finalUpper[i] =
      basicUpper < previousUpper ||
      previousClose > previousUpper
        ? basicUpper
        : previousUpper;

    finalLower[i] =
      basicLower > previousLower ||
      previousClose < previousLower
        ? basicLower
        : previousLower;

    let currentDirection = previousDirection;

    if (previousDirection === -1) {
      if (candle.close > finalUpper[i]) {
        currentDirection = 1;
      }
    } else {
      if (candle.close < finalLower[i]) {
        currentDirection = -1;
      }
    }

    direction[i] = currentDirection;

    supertrend[i] =
      currentDirection === 1
        ? finalLower[i]
        : finalUpper[i];
  }

  return {
    atr,
    direction,
    supertrend,
  };
}

// ======================================================
// EMA FILTER
// ======================================================

function passesEMAFilter(
  candles,
  ema20,
  ema50,
  index,
  direction
) {
  const close = candles[index].close;

  if (direction === 1) {
    return (
      close > ema20[index] &&
      ema20[index] > ema50[index]
    );
  }

  if (direction === -1) {
    return (
      close < ema20[index] &&
      ema20[index] < ema50[index]
    );
  }

  return false;
}

// ======================================================
// BACKTEST ENGINE
//
// Entry: next candle open after confirmed ST flip.
// Opposite signal: next candle open.
// Session close: current day's final candle close.
// No overnight positions.
// ======================================================

function backtest({
  candles,
  direction,
  ema20,
  ema50,
  useEMA,
  startIndex,
  endIndex,
}) {
  const trades = [];

  let position = null;

  for (let i = startIndex; i <= endIndex; i++) {
    const currentDirection = direction[i];
    const previousDirection = direction[i - 1];

    if (
      currentDirection === null ||
      currentDirection === undefined ||
      previousDirection === null ||
      previousDirection === undefined
    ) {
      continue;
    }

    const nextIndex = i + 1;

    const currentDate = getTradingDate(candles[i].date);

    const isLastCandleOfDay =
      i === endIndex ||
      nextIndex > endIndex ||
      getTradingDate(candles[nextIndex].date) !== currentDate;

    const isDirectionFlip =
      currentDirection !== previousDirection;

    // --------------------------------------------------
    // EXIT EXISTING POSITION
    // --------------------------------------------------

    if (position) {
      const oppositeSignal =
        isDirectionFlip &&
        currentDirection !== position.direction;

      if (oppositeSignal || isLastCandleOfDay) {
        let exitPrice;
        let exitDate;

        if (oppositeSignal && !isLastCandleOfDay) {
          exitPrice = candles[nextIndex].open;
          exitDate = candles[nextIndex].date;
        } else {
          exitPrice = candles[i].close;
          exitDate = candles[i].date;
        }

        const grossPoints =
          position.direction === 1
            ? exitPrice - position.entryPrice
            : position.entryPrice - exitPrice;

        const totalCost = COST_PER_SIDE_POINTS * 2;

        const netPoints = grossPoints - totalCost;

        trades.push({
          side: position.direction === 1 ? "LONG" : "SHORT",
          entryDate: position.entryDate,
          exitDate,
          entryPrice: position.entryPrice,
          exitPrice,
          grossPoints,
          costPoints: totalCost,
          netPoints,
        });

        position = null;

        // No reversal on the same signal candle.
        continue;
      }

      continue;
    }

    // --------------------------------------------------
    // NEW ENTRY
    // --------------------------------------------------

    if (!isDirectionFlip || isLastCandleOfDay) {
      continue;
    }

    if (nextIndex > endIndex) {
      continue;
    }

    // Do not enter if next candle belongs to another day.
    if (
      getTradingDate(candles[nextIndex].date) !== currentDate
    ) {
      continue;
    }

    if (useEMA) {
      const emaPassed = passesEMAFilter(
        candles,
        ema20,
        ema50,
        i,
        currentDirection
      );

      if (!emaPassed) {
        continue;
      }
    }

    position = {
      direction: currentDirection,
      entryPrice: candles[nextIndex].open,
      entryDate: candles[nextIndex].date,
    };
  }

  // Safety exit if a position somehow remains open.
  if (position) {
    const lastCandle = candles[endIndex];

    const grossPoints =
      position.direction === 1
        ? lastCandle.close - position.entryPrice
        : position.entryPrice - lastCandle.close;

    const totalCost = COST_PER_SIDE_POINTS * 2;

    trades.push({
      side: position.direction === 1 ? "LONG" : "SHORT",
      entryDate: position.entryDate,
      exitDate: lastCandle.date,
      entryPrice: position.entryPrice,
      exitPrice: lastCandle.close,
      grossPoints,
      costPoints: totalCost,
      netPoints: grossPoints - totalCost,
    });
  }

  return trades;
}

// ======================================================
// PERFORMANCE METRICS
// ======================================================

function calculateMetrics(trades) {
  const totalTrades = trades.length;

  if (totalTrades === 0) {
    return {
      trades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      netPoints: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      averageTrade: 0,
    };
  }

  const wins = trades.filter(
    (trade) => trade.netPoints > 0
  );

  const losses = trades.filter(
    (trade) => trade.netPoints < 0
  );

  const grossProfit = wins.reduce(
    (sum, trade) => sum + trade.netPoints,
    0
  );

  const grossLoss = Math.abs(
    losses.reduce(
      (sum, trade) => sum + trade.netPoints,
      0
    )
  );

  const netPoints = trades.reduce(
    (sum, trade) => sum + trade.netPoints,
    0
  );

  const winRate = (wins.length / totalTrades) * 100;

  const profitFactor =
    grossLoss === 0
      ? grossProfit > 0
        ? Infinity
        : 0
      : grossProfit / grossLoss;

  // Trade-by-trade equity drawdown.
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;

  for (const trade of trades) {
    equity += trade.netPoints;

    peak = Math.max(peak, equity);

    const drawdown = peak - equity;

    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }

  return {
    trades: totalTrades,
    wins: wins.length,
    losses: losses.length,
    winRate,
    netPoints,
    profitFactor,
    maxDrawdown,
    averageTrade: netPoints / totalTrades,
  };
}

// ======================================================
// CSV OUTPUT
// ======================================================

function csvEscape(value) {
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

function saveResults(results) {
  const headers = [
    "ATR_Period",
    "Multiplier",
    "Strategy",
    "Period",
    "Start_Date",
    "End_Date",
    "Trades",
    "Wins",
    "Losses",
    "Win_Rate_Percent",
    "Net_Points",
    "Profit_Factor",
    "Max_Drawdown_Points",
    "Average_Trade_Points",
    "Cost_Per_Side_Points",
  ];

  const lines = [headers.join(",")];

  for (const result of results) {
    const values = headers.map((header) =>
      csvEscape(result[header])
    );

    lines.push(values.join(","));
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), {
    recursive: true,
  });

  fs.writeFileSync(
    OUTPUT_FILE,
    lines.join("\n"),
    "utf8"
  );
}

// ======================================================
// MAIN
// ======================================================

function main() {
  console.log("\n======================================");
  console.log(" NIFTY SUPERTREND BACKTEST");
  console.log("======================================\n");

  console.log("Loading NIFTY Spot candles...");

  const candles = loadCandles();

  if (candles.length < 1000) {
    throw new Error(
      `Not enough candles. Found only ${candles.length}`
    );
  }

  const tradingDays = [
    ...new Set(
      candles.map((candle) =>
        getTradingDate(candle.date)
      )
    ),
  ];

  console.log("Total Candles:", candles.length);
  console.log("Trading Days:", tradingDays.length);

  // --------------------------------------------------
  // 70% TRAIN / 30% TEST SPLIT BY TRADING DAYS
  // --------------------------------------------------

  const trainingDaysCount = Math.floor(
    tradingDays.length * TRAINING_PERCENT / 100
  );

  const splitDate = tradingDays[trainingDaysCount];

  const splitIndex = candles.findIndex(
    (candle) => getTradingDate(candle.date) === splitDate
  );

  if (splitIndex <= 0) {
    throw new Error("Unable to create training/testing split.");
  }

  const trainingStart = getTradingDate(candles[0].date);
  const trainingEnd = getTradingDate(candles[splitIndex - 1].date);
  const testingStart = getTradingDate(candles[splitIndex].date);
  const testingEnd = getTradingDate(candles[candles.length - 1].date);

  console.log("\nTRAINING PERIOD");
  console.log(trainingStart, "to", trainingEnd);

  console.log("\nTESTING PERIOD");
  console.log(testingStart, "to", testingEnd);

  console.log("\nCost per side:", COST_PER_SIDE_POINTS, "points");

  // --------------------------------------------------
  // EMA CALCULATION
  // Calculated causally over full history.
  // Test uses past candles as indicator warm-up,
  // but starts with a fresh position.
  // --------------------------------------------------

  console.log("\nCalculating EMA20 and EMA50...");

  const ema20 = calculateEMA(candles, 20);
  const ema50 = calculateEMA(candles, 50);

  const results = [];

  // --------------------------------------------------
  // TEST ALL 25 SUPERTREND COMBINATIONS
  // --------------------------------------------------

  for (const atrPeriod of ATR_PERIODS) {
    for (const multiplier of MULTIPLIERS) {
      console.log(
        `Testing ATR ${atrPeriod} | Multiplier ${multiplier}`
      );

      const st = calculateSupertrend(
        candles,
        atrPeriod,
        multiplier
      );

      const strategies = [
        {
          name: "SUPERTREND_ONLY",
          useEMA: false,
        },
        {
          name: "SUPERTREND_EMA20_EMA50",
          useEMA: true,
        },
      ];

      for (const strategy of strategies) {
        // --------------------------------------------
        // TRAINING BACKTEST
        // --------------------------------------------

        const trainingTrades = backtest({
          candles,
          direction: st.direction,
          ema20,
          ema50,
          useEMA: strategy.useEMA,
          startIndex: 1,
          endIndex: splitIndex - 1,
        });

        const trainingMetrics =
          calculateMetrics(trainingTrades);

        // --------------------------------------------
        // INDEPENDENT TEST BACKTEST
        //
        // Indicators retain historical warm-up.
        // Position starts fresh at splitIndex.
        // --------------------------------------------

        const testingTrades = backtest({
          candles,
          direction: st.direction,
          ema20,
          ema50,
          useEMA: strategy.useEMA,
          startIndex: splitIndex,
          endIndex: candles.length - 1,
        });

        const testingMetrics =
          calculateMetrics(testingTrades);

        const periods = [
          {
            name: "TRAINING",
            startDate: trainingStart,
            endDate: trainingEnd,
            metrics: trainingMetrics,
          },
          {
            name: "TESTING",
            startDate: testingStart,
            endDate: testingEnd,
            metrics: testingMetrics,
          },
        ];

        for (const period of periods) {
          results.push({
            ATR_Period: atrPeriod,
            Multiplier: multiplier,
            Strategy: strategy.name,
            Period: period.name,
            Start_Date: period.startDate,
            End_Date: period.endDate,
            Trades: period.metrics.trades,
            Wins: period.metrics.wins,
            Losses: period.metrics.losses,
            Win_Rate_Percent:
              period.metrics.winRate.toFixed(2),
            Net_Points:
              period.metrics.netPoints.toFixed(2),
            Profit_Factor:
              Number.isFinite(period.metrics.profitFactor)
                ? period.metrics.profitFactor.toFixed(2)
                : "Infinity",
            Max_Drawdown_Points:
              period.metrics.maxDrawdown.toFixed(2),
            Average_Trade_Points:
              period.metrics.averageTrade.toFixed(2),
            Cost_Per_Side_Points:
              COST_PER_SIDE_POINTS,
          });
        }
      }
    }
  }

  // --------------------------------------------------
  // SAVE CSV
  // --------------------------------------------------

  saveResults(results);

  console.log("\n======================================");
  console.log(" BACKTEST COMPLETED");
  console.log("======================================");

  console.log("\nResults saved:");
  console.log(OUTPUT_FILE);

  // --------------------------------------------------
  // SHOW TOP TEST RESULTS
  // --------------------------------------------------

  const testResults = results
    .filter((result) => result.Period === "TESTING")
    .sort(
      (a, b) =>
        Number(b.Profit_Factor) -
        Number(a.Profit_Factor)
    );

  console.log("\nTOP 10 TEST RESULTS BY PROFIT FACTOR\n");

  console.table(
    testResults.slice(0, 10).map((result) => ({
      ATR: result.ATR_Period,
      Multiplier: result.Multiplier,
      Strategy: result.Strategy,
      Trades: result.Trades,
      WinRate: result.Win_Rate_Percent + "%",
      NetPoints: result.Net_Points,
      ProfitFactor: result.Profit_Factor,
      MaxDD: result.Max_Drawdown_Points,
    }))
  );

  console.log("\nImportant:");
  console.log("- Spot index volume is zero; no volume filter used.");
  console.log("- VWAP filter is not included.");
  console.log("- Spot points are theoretical, not actual tradable P&L.");
  console.log("- Cost assumption is configurable, not actual brokerage.");
  console.log("- Check out-of-sample TESTING results before selecting parameters.");
}

try {
  main();
} catch (error) {
  console.error("\nBACKTEST ERROR:");
  console.error(error.message);
  process.exitCode = 1;
}
