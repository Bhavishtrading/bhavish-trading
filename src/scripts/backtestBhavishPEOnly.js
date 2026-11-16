
import fs from "fs";
import path from "path";

// ======================================================
// BHAVISH PE ONLY BACKTEST ENGINE
// ======================================================

const INPUT_FILE = path.join(
  process.cwd(),
  "data",
  "nifty-history",
  "NIFTY_SPOT_5MIN_2YEARS.csv"
);

const OUTPUT_DIR = path.join(process.cwd(), "data", "backtest");

const RESULTS_FILE = path.join(
  OUTPUT_DIR,
  "BHAVISH_PE_ONLY_RESULTS.csv"
);

const TRADES_FILE = path.join(
  OUTPUT_DIR,
  "BHAVISH_PE_ONLY_TRADES.csv"
);

const SUMMARY_FILE = path.join(
  OUTPUT_DIR,
  "BHAVISH_PE_ONLY_SUMMARY.json"
);

// Backtest assumptions
const TRAINING_PERCENT = 70;
const COST_PER_SIDE_POINTS = 0;

const STOP_ATR_MULTIPLIER = 1.5;
const TARGET_R_MULTIPLIERS = [1.5, 2, 2.5];

const ENTRY_START = "09:50";
const ENTRY_END = "14:30";
const SQUARE_OFF = "15:20";

// Six Supertrend / ADX combinations
const BASE_CONFIGS = [
  { atrPeriod: 7, multiplier: 2, adxThreshold: 20 },
  { atrPeriod: 7, multiplier: 2, adxThreshold: 25 },
  { atrPeriod: 10, multiplier: 3, adxThreshold: 20 },
  { atrPeriod: 10, multiplier: 3, adxThreshold: 25 },
  { atrPeriod: 14, multiplier: 3, adxThreshold: 20 },
  { atrPeriod: 14, multiplier: 3, adxThreshold: 25 },
];

const CONFIGS = BASE_CONFIGS.flatMap((base) =>
  TARGET_R_MULTIPLIERS.map((targetR) => ({
    ...base,
    targetR,
  }))
);

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
    throw new Error(`CSV not found: ${INPUT_FILE}`);
  }

  const lines = fs.readFileSync(INPUT_FILE, "utf8")
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/);

  const candles = [];
  const seen = new Set();

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const row = parseCSVLine(lines[i]);

    const timestamp = Date.parse(row[0]);
    const open = Number(row[1]);
    const high = Number(row[2]);
    const low = Number(row[3]);
    const close = Number(row[4]);
    const volume = Number(row[5] || 0);

    if (
      !Number.isFinite(timestamp) ||
      !Number.isFinite(open) ||
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      !Number.isFinite(close) ||
      high < Math.max(open, close) ||
      low > Math.min(open, close) ||
      high < low
    ) {
      continue;
    }

    if (seen.has(timestamp)) continue;
    seen.add(timestamp);

    // UTC -> IST
    const ist = new Date(timestamp + 330 * 60 * 1000);

    const dateKey = [
      ist.getUTCFullYear(),
      String(ist.getUTCMonth() + 1).padStart(2, "0"),
      String(ist.getUTCDate()).padStart(2, "0"),
    ].join("-");

    const timeKey = [
      String(ist.getUTCHours()).padStart(2, "0"),
      String(ist.getUTCMinutes()).padStart(2, "0"),
    ].join(":");

    const day = ist.getUTCDay();

    if (day === 0 || day === 6) continue;

    candles.push({
      timestamp,
      date: row[0],
      dateKey,
      timeKey,
      open,
      high,
      low,
      close,
      volume: Number.isFinite(volume) ? volume : 0,
    });
  }

  candles.sort((a, b) => a.timestamp - b.timestamp);

  return candles;
}

// ======================================================
// EMA
// ======================================================

function ema(values, period) {
  const result = Array(values.length).fill(null);

  const multiplier = 2 / (period + 1);

  let sum = 0;
  let count = 0;
  let previous = null;

  for (let i = 0; i < values.length; i++) {
    const value = values[i];

    if (value === null || !Number.isFinite(value)) {
      continue;
    }

    if (previous === null) {
      sum += value;
      count++;

      if (count === period) {
        previous = sum / period;
        result[i] = previous;
      }
    } else {
      previous =
        value * multiplier + previous * (1 - multiplier);

      result[i] = previous;
    }
  }

  return result;
}

// ======================================================
// ATR - WILDER
// ======================================================

function calculateATR(candles, period) {
  const result = Array(candles.length).fill(null);

  let sum = 0;
  let previousATR = null;

  for (let i = 0; i < candles.length; i++) {
    const current = candles[i];
    const previousClose =
      i > 0 ? candles[i - 1].close : current.close;

    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previousClose),
      Math.abs(current.low - previousClose)
    );

    if (previousATR === null) {
      sum += tr;

      if (i === period - 1) {
        previousATR = sum / period;
        result[i] = previousATR;
      }
    } else {
      previousATR =
        (previousATR * (period - 1) + tr) / period;

      result[i] = previousATR;
    }
  }

  return result;
}

// ======================================================
// RSI - WILDER
// ======================================================

function calculateRSI(candles, period = 14) {
  const result = Array(candles.length).fill(null);

  let gainSum = 0;
  let lossSum = 0;
  let avgGain = null;
  let avgLoss = null;

  for (let i = 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;

    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    if (avgGain === null) {
      gainSum += gain;
      lossSum += loss;

      if (i === period) {
        avgGain = gainSum / period;
        avgLoss = lossSum / period;
      }
    } else {
      avgGain =
        (avgGain * (period - 1) + gain) / period;

      avgLoss =
        (avgLoss * (period - 1) + loss) / period;
    }

    if (avgGain !== null) {
      if (avgLoss === 0) {
        result[i] = 100;
      } else {
        const rs = avgGain / avgLoss;
        result[i] = 100 - 100 / (1 + rs);
      }
    }
  }

  return result;
}

// ======================================================
// MACD - CORRECTED SIGNAL LINE
// ======================================================

function calculateMACD(candles) {
  const closes = candles.map((c) => c.close);

  const fast = ema(closes, 12);
  const slow = ema(closes, 26);

  const macdLine = closes.map((_, i) => {
    if (fast[i] === null || slow[i] === null) {
      return null;
    }

    return fast[i] - slow[i];
  });

  // Important correction:
  // EMA ignores null values and starts from valid MACD values.
  // No artificial zero values are inserted.
  const signalLine = ema(macdLine, 9);

  return {
    macdLine,
    signalLine,
  };
}

// ======================================================
// ADX - WILDER
// ======================================================

function calculateADX(candles, period = 14) {
  const result = Array(candles.length).fill(null);

  let smoothTR = 0;
  let smoothPlus = 0;
  let smoothMinus = 0;

  let previousADX = null;
  let dxSum = 0;
  let dxCount = 0;

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];

    const upMove = current.high - previous.high;
    const downMove = previous.low - current.low;

    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );

    const plusDM =
      upMove > downMove && upMove > 0 ? upMove : 0;

    const minusDM =
      downMove > upMove && downMove > 0 ? downMove : 0;

    if (i <= period) {
      smoothTR += tr;
      smoothPlus += plusDM;
      smoothMinus += minusDM;
    } else {
      smoothTR = smoothTR - smoothTR / period + tr;
      smoothPlus =
        smoothPlus - smoothPlus / period + plusDM;
      smoothMinus =
        smoothMinus - smoothMinus / period + minusDM;
    }

    if (i < period) continue;

    const plusDI =
      smoothTR === 0 ? 0 : (smoothPlus / smoothTR) * 100;

    const minusDI =
      smoothTR === 0 ? 0 : (smoothMinus / smoothTR) * 100;

    const denominator = plusDI + minusDI;

    const dx =
      denominator === 0
        ? 0
        : (Math.abs(plusDI - minusDI) / denominator) * 100;

    if (previousADX === null) {
      dxSum += dx;
      dxCount++;

      if (dxCount === period) {
        previousADX = dxSum / period;
        result[i] = previousADX;
      }
    } else {
      previousADX =
        (previousADX * (period - 1) + dx) / period;

      result[i] = previousADX;
    }
  }

  return result;
}

// ======================================================
// SUPERTREND
// ======================================================

function calculateSupertrend(candles, period, multiplier) {
  const atr = calculateATR(candles, period);

  const direction = Array(candles.length).fill(null);
  const line = Array(candles.length).fill(null);

  const upperBand = Array(candles.length).fill(null);
  const lowerBand = Array(candles.length).fill(null);

  for (let i = 0; i < candles.length; i++) {
    if (atr[i] === null) continue;

    const middle =
      (candles[i].high + candles[i].low) / 2;

    const basicUpper = middle + multiplier * atr[i];
    const basicLower = middle - multiplier * atr[i];

    if (i === 0 || atr[i - 1] === null) {
      upperBand[i] = basicUpper;
      lowerBand[i] = basicLower;
      direction[i] = 1;
      line[i] = basicLower;
      continue;
    }

    upperBand[i] =
      basicUpper < upperBand[i - 1] ||
      candles[i - 1].close > upperBand[i - 1]
        ? basicUpper
        : upperBand[i - 1];

    lowerBand[i] =
      basicLower > lowerBand[i - 1] ||
      candles[i - 1].close < lowerBand[i - 1]
        ? basicLower
        : lowerBand[i - 1];

    if (direction[i - 1] === -1) {
      direction[i] =
        candles[i].close > upperBand[i] ? 1 : -1;
    } else {
      direction[i] =
        candles[i].close < lowerBand[i] ? -1 : 1;
    }

    line[i] =
      direction[i] === 1 ? lowerBand[i] : upperBand[i];
  }

  return { atr, direction, line };
}

// ======================================================
// BUILD INDICATORS
// ======================================================

function buildIndicators(candles, config) {
  const closes = candles.map((c) => c.close);

  const st = calculateSupertrend(
    candles,
    config.atrPeriod,
    config.multiplier
  );

  return {
    ema9: ema(closes, 9),
    ema20: ema(closes, 20),
    ema50: ema(closes, 50),
    atr: calculateATR(candles, 14),
    rsi: calculateRSI(candles, 14),
    adx: calculateADX(candles, 14),
    macd: calculateMACD(candles),
    supertrend: st,
  };
}

// ======================================================
// PE SIGNAL ONLY
// ======================================================

function getPESignal(i, candles, ind, config) {
  const values = [
    ind.ema9[i],
    ind.ema20[i],
    ind.ema50[i],
    ind.rsi[i],
    ind.adx[i],
    ind.macd.macdLine[i],
    ind.macd.signalLine[i],
    ind.supertrend.direction[i],
    ind.supertrend.line[i],
  ];

  if (values.some(
    (value) => value === null || !Number.isFinite(value)
  )) {
    return false;
  }

  const bearishEMA =
    ind.ema9[i] < ind.ema20[i] &&
    ind.ema20[i] < ind.ema50[i];

  const bearishSupertrend =
    ind.supertrend.direction[i] === -1 &&
    candles[i].close < ind.supertrend.line[i];

  const strongTrend =
    ind.adx[i] >= config.adxThreshold;

  const bearishRSI =
    ind.rsi[i] >= 30 && ind.rsi[i] <= 50;

  const bearishMACD =
    ind.macd.macdLine[i] < ind.macd.signalLine[i];

  return (
    bearishEMA &&
    bearishSupertrend &&
    strongTrend &&
    bearishRSI &&
    bearishMACD
  );
}

// ======================================================
// BACKTEST
// ======================================================

function round(value) {
  return Number(Number(value).toFixed(2));
}

function runBacktest(
  candles,
  ind,
  config,
  startIndex,
  endIndex,
  split
) {
  const trades = [];

  let i = startIndex;

  while (i < endIndex - 1) {
    const signalCandle = candles[i];
    const entryIndex = i + 1;
    const entryCandle = candles[entryIndex];

    if (!entryCandle || entryIndex >= endIndex) break;

    if (
      signalCandle.timeKey < ENTRY_START ||
      signalCandle.timeKey > ENTRY_END ||
      signalCandle.dateKey !== entryCandle.dateKey
    ) {
      i++;
      continue;
    }

    if (!getPESignal(i, candles, ind, config)) {
      i++;
      continue;
    }

    const atrValue = ind.atr[i];

    if (!Number.isFinite(atrValue) || atrValue <= 0) {
      i++;
      continue;
    }

    // PE profit occurs when NIFTY Spot moves down.
    const entryPrice = entryCandle.open;
    const risk = atrValue * STOP_ATR_MULTIPLIER;

    const stopLoss = entryPrice + risk;
    const target = entryPrice - risk * config.targetR;

    let exitIndex = entryIndex;
    let exitPrice = null;
    let exitReason = "";

    for (let j = entryIndex; j < endIndex; j++) {
      const candle = candles[j];

      // No overnight positions.
      if (candle.dateKey !== entryCandle.dateKey) {
        exitIndex = j - 1;
        exitPrice = candles[exitIndex].close;
        exitReason = "DAY_END";
        break;
      }

      // For PE, upward move hits SL.
      const stopHit = candle.high >= stopLoss;

      // For PE, downward move hits target.
      const targetHit = candle.low <= target;

      // Conservative same-candle assumption.
      if (stopHit) {
        exitIndex = j;
        exitPrice = stopLoss;
        exitReason = "STOP_LOSS";
        break;
      }

      if (targetHit) {
        exitIndex = j;
        exitPrice = target;
        exitReason = "TARGET";
        break;
      }

      if (candle.timeKey >= SQUARE_OFF) {
        exitIndex = j;
        exitPrice = candle.close;
        exitReason = "SQUARE_OFF";
        break;
      }

      if (j === endIndex - 1) {
        exitIndex = j;
        exitPrice = candle.close;
        exitReason = "DATA_END";
      }
    }

    if (exitPrice === null) {
      exitPrice = candles[exitIndex].close;
      exitReason = "DATA_END";
    }

    const grossPoints = entryPrice - exitPrice;

    const netPoints =
      grossPoints - COST_PER_SIDE_POINTS * 2;

    trades.push({
      split,
      signal: "PE",
      signalTime: signalCandle.date,
      entryTime: entryCandle.date,
      exitTime: candles[exitIndex].date,
      entryPrice: round(entryPrice),
      exitPrice: round(exitPrice),
      stopLoss: round(stopLoss),
      target: round(target),
      atr: round(atrValue),
      adx: round(ind.adx[i]),
      rsi: round(ind.rsi[i]),
      macd: round(ind.macd.macdLine[i]),
      macdSignal: round(ind.macd.signalLine[i]),
      exitReason,
      grossPoints: round(grossPoints),
      netPoints: round(netPoints),
      result:
        netPoints > 0
          ? "WIN"
          : netPoints < 0
            ? "LOSS"
            : "BREAKEVEN",
      supertrendATR: config.atrPeriod,
      supertrendMultiplier: config.multiplier,
      adxThreshold: config.adxThreshold,
      stopATRMultiplier: STOP_ATR_MULTIPLIER,
      targetR: config.targetR,
    });

    // One position at a time.
    i = Math.max(exitIndex, i + 1);
  }

  return trades;
}

// ======================================================
// METRICS
// ======================================================

function calculateMetrics(trades) {
  const wins = trades.filter((t) => t.netPoints > 0);
  const losses = trades.filter((t) => t.netPoints < 0);

  const grossProfit = wins.reduce(
    (sum, t) => sum + t.netPoints, 0
  );

  const grossLoss = Math.abs(
    losses.reduce((sum, t) => sum + t.netPoints, 0)
  );

  const netPoints = trades.reduce(
    (sum, t) => sum + t.netPoints, 0
  );

  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;

  for (const trade of trades) {
    equity += trade.netPoints;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
  }

  return {
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: round(
      trades.length ? wins.length / trades.length * 100 : 0
    ),
    grossProfit: round(grossProfit),
    grossLoss: round(grossLoss),
    profitFactor:
      grossLoss === 0
        ? grossProfit > 0 ? "Infinity" : 0
        : round(grossProfit / grossLoss),
    netPoints: round(netPoints),
    averageTrade: round(
      trades.length ? netPoints / trades.length : 0
    ),
    maxDrawdown: round(maxDrawdown),
  };
}

// ======================================================
// CSV OUTPUT
// ======================================================

function csvEscape(value) {
  const text = String(value ?? "");

  return /[",\n]/.test(text)
    ? `"${text.replace(/"/g, '""')}"`
    : text;
}

function writeCSV(file, rows) {
  if (!rows.length) {
    fs.writeFileSync(file, "No data\n", "utf8");
    return;
  }

  const headers = Object.keys(rows[0]);

  const content = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((key) => csvEscape(row[key])).join(",")
    ),
  ].join("\n");

  fs.writeFileSync(file, content, "utf8");
}

// ======================================================
// MAIN
// ======================================================

function main() {
  console.log("\n======================================");
  console.log(" BHAVISH PE ONLY BACKTEST ENGINE");
  console.log("======================================\n");

  const candles = loadCandles();

  if (candles.length < 500) {
    throw new Error("Insufficient historical candles.");
  }

  const tradingDays = [
    ...new Set(candles.map((c) => c.dateKey)),
  ];

  const splitDayIndex = Math.floor(
    tradingDays.length * TRAINING_PERCENT / 100
  );

  const splitDate = tradingDays[splitDayIndex];

  const splitIndex = candles.findIndex(
    (c) => c.dateKey >= splitDate
  );

  if (splitIndex <= 0) {
    throw new Error("Invalid training/testing split.");
  }

  console.log("Total candles:", candles.length);
  console.log("Trading days:", tradingDays.length);
  console.log("Training candles:", splitIndex);
  console.log("Testing candles:", candles.length - splitIndex);
  console.log("Testing starts:", splitDate);
  console.log("Configurations:", CONFIGS.length);

  const allResults = [];
  const allTrades = [];

  for (const config of CONFIGS) {
    console.log(
      `\nPE | ST ${config.atrPeriod} x ${config.multiplier}` +
      ` | ADX ${config.adxThreshold}` +
      ` | Target 1:${config.targetR}`
    );

    const indicators = buildIndicators(candles, config);

    const trainingTrades = runBacktest(
      candles,
      indicators,
      config,
      0,
      splitIndex,
      "TRAINING"
    );

    const testingTrades = runBacktest(
      candles,
      indicators,
      config,
      splitIndex,
      candles.length,
      "TESTING"
    );

    const training = calculateMetrics(trainingTrades);
    const testing = calculateMetrics(testingTrades);

    const result = {
      direction: "PE",
      supertrendATR: config.atrPeriod,
      supertrendMultiplier: config.multiplier,
      adxThreshold: config.adxThreshold,
      stopATRMultiplier: STOP_ATR_MULTIPLIER,
      targetR: config.targetR,

      trainingTrades: training.totalTrades,
      trainingWinRate: training.winRate,
      trainingProfitFactor: training.profitFactor,
      trainingNetPoints: training.netPoints,
      trainingMaxDrawdown: training.maxDrawdown,

      testingTrades: testing.totalTrades,
      testingWinRate: testing.winRate,
      testingProfitFactor: testing.profitFactor,
      testingNetPoints: testing.netPoints,
      testingMaxDrawdown: testing.maxDrawdown,
    };

    allResults.push(result);
    allTrades.push(...trainingTrades, ...testingTrades);

    console.log("Training:", training);
    console.log("Testing :", testing);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  writeCSV(RESULTS_FILE, allResults);
  writeCSV(TRADES_FILE, allTrades);

  const summary = {
    engine: "Bhavish PE Only Backtest",
    generatedAt: new Date().toISOString(),
    inputFile: INPUT_FILE,
    totalCandles: candles.length,
    tradingDays: tradingDays.length,
    firstCandle: candles[0].date,
    lastCandle: candles[candles.length - 1].date,
    trainingPercent: TRAINING_PERCENT,
    testingPercent: 100 - TRAINING_PERCENT,
    testingStartDate: splitDate,

    rules: {
      direction: "PE only",
      timeframe: "5 minutes",
      ema: [9, 20, 50],
      supertrend: "Tested configurations",
      atr: 14,
      rsi: 14,
      adx: 14,
      macd: [12, 26, 9],
      macdSignalCalculation: "Valid MACD values only",
      entry: "Next candle open",
      entrySession: `${ENTRY_START} - ${ENTRY_END} IST`,
      stopLoss: `${STOP_ATR_MULTIPLIER} x ATR`,
      targets: TARGET_R_MULTIPLIERS.map((v) => `1:${v}`),
      squareOff: `${SQUARE_OFF} IST`,
      sameCandleStopAndTarget: "Stop Loss first",
      costPerSidePoints: COST_PER_SIDE_POINTS,
      volume: "Excluded - source volume is zero",
      vwap: "Excluded - source volume is zero",
      oiPCR: "Excluded - historical data unavailable",
      pnlType: "NIFTY Spot directional points",
    },

    results: allResults,
  };

  fs.writeFileSync(
    SUMMARY_FILE,
    JSON.stringify(summary, null, 2),
    "utf8"
  );

  console.log("\n======================================");
  console.log(" PE ONLY BACKTEST COMPLETED");
  console.log("======================================\n");

  console.table(allResults);

  console.log("\nGenerated files:");
  console.log(RESULTS_FILE);
  console.log(TRADES_FILE);
  console.log(SUMMARY_FILE);

  console.log("\nNote: No brokerage or slippage applied.");
  console.log("These are NIFTY Spot points, not option premium P&L.");
}

try {
  main();
} catch (error) {
  console.error("\nBACKTEST ERROR:", error);
  process.exitCode = 1;
}
