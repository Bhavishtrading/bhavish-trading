
import fs from "fs";
import path from "path";

// ======================================================
// BHAVISH COMBINED ENGINE - NIFTY 5 MINUTE BACKTEST
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
  "BHAVISH_COMBINED_RESULTS.csv"
);

const TRADES_FILE = path.join(
  OUTPUT_DIR,
  "BHAVISH_COMBINED_TRADES.csv"
);

const SUMMARY_FILE = path.join(
  OUTPUT_DIR,
  "BHAVISH_COMBINED_SUMMARY.json"
);

// Backtest assumptions
const TRAINING_PERCENT = 70;
const COST_PER_SIDE_POINTS = 0;
const STOP_ATR_MULTIPLIER = 1.5;
const TARGET_R_MULTIPLIER = 2;
const ENTRY_START = "09:50";
const ENTRY_END = "14:30";
const SQUARE_OFF = "15:20";

// Test different Supertrend and ADX combinations
const CONFIGS = [];

for (const st of [
  { atrPeriod: 7, multiplier: 2 },
  { atrPeriod: 10, multiplier: 3 },
  { atrPeriod: 14, multiplier: 3 },
]) {
  for (const adxThreshold of [20, 25]) {
    CONFIGS.push({
      ...st,
      adxThreshold,
    });
  }
}

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

  const lines = fs.readFileSync(INPUT_FILE, "utf8")
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/);

  const candles = [];
  const seen = new Set();

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const row = parseCSVLine(lines[i]);

    const date = row[0];
    const open = Number(row[1]);
    const high = Number(row[2]);
    const low = Number(row[3]);
    const close = Number(row[4]);
    const volume = Number(row[5] || 0);

    const timestamp = Date.parse(date);

    if (
      !date ||
      !Number.isFinite(timestamp) ||
      !Number.isFinite(open) ||
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      !Number.isFinite(close) ||
      high < low ||
      high < Math.max(open, close) ||
      low > Math.min(open, close)
    ) {
      continue;
    }

    if (seen.has(timestamp)) continue;
    seen.add(timestamp);

    // CSV timestamps are UTC. Convert to IST for session logic.
    const istDate = new Date(timestamp + 330 * 60 * 1000);

    const dateKey = [
      istDate.getUTCFullYear(),
      String(istDate.getUTCMonth() + 1).padStart(2, "0"),
      String(istDate.getUTCDate()).padStart(2, "0"),
    ].join("-");

    const timeKey = [
      String(istDate.getUTCHours()).padStart(2, "0"),
      String(istDate.getUTCMinutes()).padStart(2, "0"),
    ].join(":");

    const day = istDate.getUTCDay();

    // Exclude weekends
    if (day === 0 || day === 6) continue;

    candles.push({
      timestamp,
      date,
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
// INDICATOR HELPERS
// ======================================================

function ema(values, period) {
  const result = Array(values.length).fill(null);
  const multiplier = 2 / (period + 1);

  let sum = 0;
  let count = 0;
  let previous = null;

  for (let i = 0; i < values.length; i++) {
    const value = values[i];

    if (!Number.isFinite(value)) continue;

    if (previous === null) {
      sum += value;
      count++;

      if (count === period) {
        previous = sum / period;
        result[i] = previous;
      }
    } else {
      previous = value * multiplier + previous * (1 - multiplier);
      result[i] = previous;
    }
  }

  return result;
}

function calculateATR(candles, period) {
  const tr = Array(candles.length).fill(null);
  const result = Array(candles.length).fill(null);

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const previousClose = i > 0 ? candles[i - 1].close : candle.close;

    tr[i] = Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose)
    );
  }

  let sum = 0;
  let previousATR = null;

  for (let i = 0; i < tr.length; i++) {
    if (previousATR === null) {
      sum += tr[i];

      if (i === period - 1) {
        previousATR = sum / period;
        result[i] = previousATR;
      }
    } else {
      previousATR = (previousATR * (period - 1) + tr[i]) / period;
      result[i] = previousATR;
    }
  }

  return result;
}

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
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
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

function calculateMACD(candles) {
  const closes = candles.map((c) => c.close);

  const fast = ema(closes, 12);
  const slow = ema(closes, 26);

  const macd = closes.map((_, i) => {
    if (fast[i] === null || slow[i] === null) return null;
    return fast[i] - slow[i];
  });

  const validMacd = macd.map((v) => v ?? 0);
  const signal = ema(validMacd, 9);

  return { macd, signal };
}

function calculateADX(candles, period = 14) {
  const length = candles.length;

  const result = Array(length).fill(null);
  const tr = Array(length).fill(0);
  const plusDM = Array(length).fill(0);
  const minusDM = Array(length).fill(0);

  for (let i = 1; i < length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];

    const upMove = current.high - previous.high;
    const downMove = previous.low - current.low;

    tr[i] = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );

    plusDM[i] =
      upMove > downMove && upMove > 0 ? upMove : 0;

    minusDM[i] =
      downMove > upMove && downMove > 0 ? downMove : 0;
  }

  let smoothTR = 0;
  let smoothPlus = 0;
  let smoothMinus = 0;
  let previousADX = null;
  let dxSum = 0;
  let dxCount = 0;

  for (let i = 1; i < length; i++) {
    if (i <= period) {
      smoothTR += tr[i];
      smoothPlus += plusDM[i];
      smoothMinus += minusDM[i];
    } else {
      smoothTR = smoothTR - smoothTR / period + tr[i];
      smoothPlus = smoothPlus - smoothPlus / period + plusDM[i];
      smoothMinus = smoothMinus - smoothMinus / period + minusDM[i];
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
      previousADX = (previousADX * (period - 1) + dx) / period;
      result[i] = previousADX;
    }
  }

  return result;
}

function calculateSupertrend(candles, period, multiplier) {
  const atr = calculateATR(candles, period);
  const length = candles.length;

  const direction = Array(length).fill(null);
  const supertrend = Array(length).fill(null);

  const upperBand = Array(length).fill(null);
  const lowerBand = Array(length).fill(null);

  for (let i = 0; i < length; i++) {
    if (atr[i] === null) continue;

    const middle = (candles[i].high + candles[i].low) / 2;

    const basicUpper = middle + multiplier * atr[i];
    const basicLower = middle - multiplier * atr[i];

    if (i === 0 || atr[i - 1] === null) {
      upperBand[i] = basicUpper;
      lowerBand[i] = basicLower;
      direction[i] = 1;
      supertrend[i] = basicLower;
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

    supertrend[i] =
      direction[i] === 1 ? lowerBand[i] : upperBand[i];
  }

  return { atr, direction, supertrend };
}

// ======================================================
// INDICATOR CALCULATION
// ======================================================

function buildIndicators(candles, config) {
  const closes = candles.map((c) => c.close);

  const ema9 = ema(closes, 9);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);

  const atr = calculateATR(candles, 14);
  const rsi = calculateRSI(candles, 14);
  const adx = calculateADX(candles, 14);
  const macd = calculateMACD(candles);

  const st = calculateSupertrend(
    candles,
    config.atrPeriod,
    config.multiplier
  );

  return {
    ema9,
    ema20,
    ema50,
    atr,
    rsi,
    adx,
    macd,
    supertrend: st,
  };
}

// ======================================================
// SIGNAL GENERATION
// ======================================================

function getSignal(i, candles, indicators, config) {
  const {
    ema9,
    ema20,
    ema50,
    rsi,
    adx,
    macd,
    supertrend,
  } = indicators;

  const values = [
    ema9[i],
    ema20[i],
    ema50[i],
    rsi[i],
    adx[i],
    macd.macd[i],
    macd.signal[i],
    supertrend.direction[i],
  ];

  if (values.some((v) => v === null || !Number.isFinite(v))) {
    return null;
  }

  if (adx[i] < config.adxThreshold) return null;

  const bullish =
    ema9[i] > ema20[i] &&
    ema20[i] > ema50[i] &&
    supertrend.direction[i] === 1 &&
    candles[i].close > supertrend.supertrend[i] &&
    rsi[i] >= 50 &&
    rsi[i] <= 70 &&
    macd.macd[i] > macd.signal[i];

  const bearish =
    ema9[i] < ema20[i] &&
    ema20[i] < ema50[i] &&
    supertrend.direction[i] === -1 &&
    candles[i].close < supertrend.supertrend[i] &&
    rsi[i] >= 30 &&
    rsi[i] <= 50 &&
    macd.macd[i] < macd.signal[i];

  if (bullish) return "CE";
  if (bearish) return "PE";

  return null;
}

// ======================================================
// BACKTEST ENGINE
// ======================================================

function isBetween(value, start, end) {
  return value >= start && value <= end;
}

function runBacktest(candles, indicators, config, startIndex, endIndex, splitName) {
  const trades = [];

  let i = startIndex;

  while (i < endIndex - 1) {
    const signalCandle = candles[i];
    const entryIndex = i + 1;
    const entryCandle = candles[entryIndex];

    if (!entryCandle || entryIndex >= endIndex) {
      break;
    }

    if (
      !isBetween(signalCandle.timeKey, ENTRY_START, ENTRY_END) ||
      signalCandle.dateKey !== entryCandle.dateKey
    ) {
      i++;
      continue;
    }

    const signal = getSignal(i, candles, indicators, config);

    if (!signal) {
      i++;
      continue;
    }

    const atrValue = indicators.atr[i];

    if (!Number.isFinite(atrValue) || atrValue <= 0) {
      i++;
      continue;
    }

    const entryPrice = entryCandle.open;
    const risk = atrValue * STOP_ATR_MULTIPLIER;

    const stopLoss =
      signal === "CE"
        ? entryPrice - risk
        : entryPrice + risk;

    const target =
      signal === "CE"
        ? entryPrice + risk * TARGET_R_MULTIPLIER
        : entryPrice - risk * TARGET_R_MULTIPLIER;

    let exitIndex = entryIndex;
    let exitPrice = null;
    let exitReason = "";

    for (let j = entryIndex; j < endIndex; j++) {
      const candle = candles[j];

      // Never carry a position overnight.
      if (candle.dateKey !== entryCandle.dateKey) {
        const previous = candles[j - 1];
        exitIndex = j - 1;
        exitPrice = previous.close;
        exitReason = "DAY_END";
        break;
      }

      const stopHit =
        signal === "CE"
          ? candle.low <= stopLoss
          : candle.high >= stopLoss;

      const targetHit =
        signal === "CE"
          ? candle.high >= target
          : candle.low <= target;

      // Conservative rule: if both hit in the same candle, SL first.
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

      // End of available data / split boundary
      if (j === endIndex - 1) {
        exitIndex = j;
        exitPrice = candle.close;
        exitReason = "DATA_END";
      }
    }

    if (exitPrice === null) {
      const last = candles[exitIndex];
      exitPrice = last.close;
      exitReason = "DATA_END";
    }

    const grossPoints =
      signal === "CE"
        ? exitPrice - entryPrice
        : entryPrice - exitPrice;

    const netPoints =
      grossPoints - COST_PER_SIDE_POINTS * 2;

    trades.push({
      split: splitName,
      signal,
      signalTime: signalCandle.date,
      entryTime: entryCandle.date,
      exitTime: candles[exitIndex].date,
      entryPrice: round(entryPrice),
      exitPrice: round(exitPrice),
      stopLoss: round(stopLoss),
      target: round(target),
      atr: round(atrValue),
      adx: round(indicators.adx[i]),
      rsi: round(indicators.rsi[i]),
      exitReason,
      grossPoints: round(grossPoints),
      netPoints: round(netPoints),
      result: netPoints > 0 ? "WIN" : netPoints < 0 ? "LOSS" : "BREAKEVEN",
      supertrendATR: config.atrPeriod,
      supertrendMultiplier: config.multiplier,
      adxThreshold: config.adxThreshold,
    });

    // Do not overlap trades.
    i = Math.max(exitIndex, i + 1);
  }

  return trades;
}

// ======================================================
// PERFORMANCE METRICS
// ======================================================

function calculateMetrics(trades) {
  const totalTrades = trades.length;

  const wins = trades.filter((t) => t.netPoints > 0);
  const losses = trades.filter((t) => t.netPoints < 0);

  const grossProfit = wins.reduce((sum, t) => sum + t.netPoints, 0);
  const grossLoss = Math.abs(
    losses.reduce((sum, t) => sum + t.netPoints, 0)
  );

  const netPoints = trades.reduce((sum, t) => sum + t.netPoints, 0);

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
    totalTrades,
    wins: wins.length,
    losses: losses.length,
    breakeven: totalTrades - wins.length - losses.length,
    winRate: round(totalTrades ? (wins.length / totalTrades) * 100 : 0),
    grossProfit: round(grossProfit),
    grossLoss: round(grossLoss),
    profitFactor: grossLoss === 0
      ? grossProfit > 0 ? "Infinity" : 0
      : round(grossProfit / grossLoss),
    netPoints: round(netPoints),
    averageTrade: round(totalTrades ? netPoints / totalTrades : 0),
    maxDrawdown: round(maxDrawdown),
  };
}

function round(value) {
  return Number(Number(value).toFixed(2));
}

// ======================================================
// OUTPUT HELPERS
// ======================================================

function csvEscape(value) {
  const text = String(value ?? "");

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
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
  console.log("\n==========================================");
  console.log(" BHAVISH COMBINED ENGINE BACKTEST");
  console.log("==========================================\n");

  const candles = loadCandles();

  if (candles.length < 500) {
    throw new Error(`Insufficient candles: ${candles.length}`);
  }

  const tradingDays = [...new Set(candles.map((c) => c.dateKey))];

  const splitDayIndex = Math.floor(
    tradingDays.length * TRAINING_PERCENT / 100
  );

  const splitDate = tradingDays[splitDayIndex];

  const splitIndex = candles.findIndex(
    (c) => c.dateKey >= splitDate
  );

  if (splitIndex <= 0) {
    throw new Error("Could not create training/testing split.");
  }

  console.log("Total candles:", candles.length);
  console.log("Trading days:", tradingDays.length);
  console.log("First candle:", candles[0].date);
  console.log("Last candle:", candles[candles.length - 1].date);
  console.log("Training candles:", splitIndex);
  console.log("Testing candles:", candles.length - splitIndex);
  console.log("Testing starts:", splitDate);

  const allResults = [];
  const allTrades = [];

  for (const config of CONFIGS) {
    console.log(
      `\nTesting ST ATR ${config.atrPeriod} x ${config.multiplier}, ADX ${config.adxThreshold}`
    );

    const indicators = buildIndicators(candles, config);

    // Training period
    const trainingTrades = runBacktest(
      candles,
      indicators,
      config,
      0,
      splitIndex,
      "TRAINING"
    );

    // Unseen testing period.
    // Indicator warm-up uses earlier candles, but trades start only after split.
    const testingTrades = runBacktest(
      candles,
      indicators,
      config,
      splitIndex,
      candles.length,
      "TESTING"
    );

    const trainingMetrics = calculateMetrics(trainingTrades);
    const testingMetrics = calculateMetrics(testingTrades);

    const result = {
      supertrendATR: config.atrPeriod,
      supertrendMultiplier: config.multiplier,
      adxThreshold: config.adxThreshold,

      trainingTrades: trainingMetrics.totalTrades,
      trainingWinRate: trainingMetrics.winRate,
      trainingProfitFactor: trainingMetrics.profitFactor,
      trainingNetPoints: trainingMetrics.netPoints,
      trainingMaxDrawdown: trainingMetrics.maxDrawdown,

      testingTrades: testingMetrics.totalTrades,
      testingWinRate: testingMetrics.winRate,
      testingProfitFactor: testingMetrics.profitFactor,
      testingNetPoints: testingMetrics.netPoints,
      testingMaxDrawdown: testingMetrics.maxDrawdown,
    };

    allResults.push(result);
    allTrades.push(...trainingTrades, ...testingTrades);

    console.log("Training:", trainingMetrics);
    console.log("Testing :", testingMetrics);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  writeCSV(RESULTS_FILE, allResults);
  writeCSV(TRADES_FILE, allTrades);

  const summary = {
    engine: "Bhavish Combined Engine",
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
      timeframe: "5 minutes",
      ema: [9, 20, 50],
      atr: 14,
      rsi: 14,
      adx: 14,
      macd: [12, 26, 9],
      stopLoss: `${STOP_ATR_MULTIPLIER} x ATR`,
      target: `${TARGET_R_MULTIPLIER} x Risk`,
      entry: "Next candle open",
      entrySession: `${ENTRY_START} - ${ENTRY_END} IST`,
      squareOff: `${SQUARE_OFF} IST`,
      costPerSidePoints: COST_PER_SIDE_POINTS,
      sameCandleStopAndTarget: "Stop Loss first",
      volumeBasedFilters: "Excluded - source volume is zero",
      vwap: "Excluded - source volume is zero",
      oiPCR: "Excluded - historical data not supplied",
      pnlType: "NIFTY Spot directional points, not option premium P&L",
    },

    results: allResults,
  };

  fs.writeFileSync(
    SUMMARY_FILE,
    JSON.stringify(summary, null, 2),
    "utf8"
  );

  console.log("\n==========================================");
  console.log(" BACKTEST COMPLETED");
  console.log("==========================================");

  console.table(allResults);

  console.log("\nFiles generated:");
  console.log(RESULTS_FILE);
  console.log(TRADES_FILE);
  console.log(SUMMARY_FILE);

  console.log("\nImportant:");
  console.log("These are NIFTY Spot directional points.");
  console.log("They are not actual CE/PE option premium returns.");
  console.log("No brokerage or slippage has been applied.");
}

try {
  main();
} catch (error) {
  console.error("\nBACKTEST ERROR:", error.message);
  process.exitCode = 1;
}
