
import { getNiftyFutureHistoricalData } from "../zerodha/market";

// =====================================================
// NIFTY FUTURES TECHNICAL ENGINE
// Source: Zerodha NIFTY Futures 5-minute candles
// Existing Spot Technical Engine remains untouched.
// =====================================================

const TIMEZONE = "Asia/Kolkata";
const PERIOD = 14;

function round(value, digits = 2) {
  return Number.isFinite(value)
    ? Number(value.toFixed(digits))
    : null;
}

function getSessionDate(timestamp) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function normalizeCandles(candles = []) {
  return candles
    .map((c) => ({
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume) || 0,
      timestamp: c.date ?? c.timestamp ?? c.time,
    }))
    .filter((c) => {
      return (
        Number.isFinite(c.open) &&
        Number.isFinite(c.high) &&
        Number.isFinite(c.low) &&
        Number.isFinite(c.close) &&
        c.high >= c.low &&
        c.volume >= 0 &&
        c.timestamp &&
        !Number.isNaN(new Date(c.timestamp).getTime())
      );
    })
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() -
        new Date(b.timestamp).getTime()
    );
}

// =====================================================
// EMA
// =====================================================

function calculateEMA(values, period) {
  if (values.length < period) return null;

  const multiplier = 2 / (period + 1);

  let ema =
    values.slice(0, period).reduce((a, b) => a + b, 0) /
    period;

  for (let i = period; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema;
  }

  return ema;
}

// =====================================================
// RSI - WILDER
// =====================================================

function calculateRSI(values, period = 14) {
  if (values.length <= period) return null;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];

    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];

    avgGain =
      (avgGain * (period - 1) + Math.max(change, 0)) /
      period;

    avgLoss =
      (avgLoss * (period - 1) + Math.max(-change, 0)) /
      period;
  }

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;

  return 100 - 100 / (1 + rs);
}

// =====================================================
// MACD - 12, 26, 9
// =====================================================

function calculateEMASeries(values, period) {
  const result = Array(values.length).fill(null);

  if (values.length < period) return result;

  const multiplier = 2 / (period + 1);

  let ema =
    values.slice(0, period).reduce((a, b) => a + b, 0) /
    period;

  result[period - 1] = ema;

  for (let i = period; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema;
    result[i] = ema;
  }

  return result;
}

function calculateMACD(values) {
  const empty = {
    macd: null,
    signal: null,
    histogram: null,
    trend: "Neutral",
    crossover: "No Fresh Crossover",
    crossoverDetected: false,
    crossoverDirection: "None",
  };

  if (values.length < 35) return empty;

  const ema12 = calculateEMASeries(values, 12);
  const ema26 = calculateEMASeries(values, 26);

  const macdValues = [];

  for (let i = 0; i < values.length; i++) {
    if (ema12[i] !== null && ema26[i] !== null) {
      macdValues.push(ema12[i] - ema26[i]);
    }
  }

  const signalValues = calculateEMASeries(macdValues, 9);

  const valid = [];

  for (let i = 0; i < macdValues.length; i++) {
    if (signalValues[i] !== null) {
      valid.push({
        macd: macdValues[i],
        signal: signalValues[i],
        histogram: macdValues[i] - signalValues[i],
      });
    }
  }

  if (valid.length < 2) return empty;

  const current = valid[valid.length - 1];
  const previous = valid[valid.length - 2];

  const bullish =
    previous.macd <= previous.signal &&
    current.macd > current.signal;

  const bearish =
    previous.macd >= previous.signal &&
    current.macd < current.signal;

  return {
    macd: round(current.macd, 3),
    signal: round(current.signal, 3),
    histogram: round(current.histogram, 3),

    trend:
      current.macd > current.signal
        ? "Bullish"
        : current.macd < current.signal
          ? "Bearish"
          : "Neutral",

    crossover: bullish
      ? "Bullish Crossover"
      : bearish
        ? "Bearish Crossover"
        : "No Fresh Crossover",

    crossoverDetected: bullish || bearish,

    crossoverDirection: bullish
      ? "Bullish"
      : bearish
        ? "Bearish"
        : "None",
  };
}

// =====================================================
// ATR - WILDER
// =====================================================

function calculateATR(candles, period = 14) {
  if (candles.length <= period) return null;

  const ranges = [];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];

    ranges.push(
      Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close)
      )
    );
  }

  if (ranges.length < period) return null;

  let atr =
    ranges.slice(0, period).reduce((a, b) => a + b, 0) /
    period;

  for (let i = period; i < ranges.length; i++) {
    atr = (atr * (period - 1) + ranges[i]) / period;
  }

  return atr;
}

// =====================================================
// ADX + PLUS DI + MINUS DI
// =====================================================

function calculateADX(candles, period = 14) {
  const empty = {
    adx: null,
    plusDI: null,
    minusDI: null,
    trend: "Sideways",
    strength: "Unavailable",
  };

  if (candles.length < period * 2 + 1) return empty;

  const tr = [];
  const plusDM = [];
  const minusDM = [];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];

    const upMove = current.high - previous.high;
    const downMove = previous.low - current.low;

    tr.push(
      Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close)
      )
    );

    plusDM.push(
      upMove > downMove && upMove > 0 ? upMove : 0
    );

    minusDM.push(
      downMove > upMove && downMove > 0 ? downMove : 0
    );
  }

  let smoothedTR = tr.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothedPlus = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothedMinus = minusDM.slice(0, period).reduce((a, b) => a + b, 0);

  const dxValues = [];

  let plusDI = 0;
  let minusDI = 0;

  for (let i = period; i < tr.length; i++) {
    smoothedTR =
      smoothedTR - smoothedTR / period + tr[i];

    smoothedPlus =
      smoothedPlus - smoothedPlus / period + plusDM[i];

    smoothedMinus =
      smoothedMinus - smoothedMinus / period + minusDM[i];

    if (smoothedTR <= 0) continue;

    plusDI = (smoothedPlus / smoothedTR) * 100;
    minusDI = (smoothedMinus / smoothedTR) * 100;

    const sum = plusDI + minusDI;

    dxValues.push(
      sum === 0
        ? 0
        : (Math.abs(plusDI - minusDI) / sum) * 100
    );
  }

  if (dxValues.length < period) {
    return {
      ...empty,
      plusDI: round(plusDI),
      minusDI: round(minusDI),
    };
  }

  let adx =
    dxValues.slice(0, period).reduce((a, b) => a + b, 0) /
    period;

  for (let i = period; i < dxValues.length; i++) {
    adx = (adx * (period - 1) + dxValues[i]) / period;
  }

  let trend = "Sideways";
  let strength = "Weak";

  if (adx >= 25) {
    strength = "Strong";
    trend =
      plusDI > minusDI
        ? "Strong Bullish"
        : minusDI > plusDI
          ? "Strong Bearish"
          : "Strong";
  } else if (adx >= 20) {
    strength = "Moderate";
    trend =
      plusDI > minusDI
        ? "Moderate Bullish"
        : minusDI > plusDI
          ? "Moderate Bearish"
          : "Moderate";
  }

  return {
    adx: round(adx),
    plusDI: round(plusDI),
    minusDI: round(minusDI),
    trend,
    strength,
  };
}

// =====================================================
// SESSION VWAP + STANDARD DEVIATION BANDS
// Volume-weighted HLC3
// =====================================================

function calculateSessionVWAP(candles) {
  let cumulativePV = 0;
  let cumulativeVolume = 0;
  let cumulativeP2V = 0;

  for (const candle of candles) {
    const volume = candle.volume;

    if (volume <= 0) continue;

    const typicalPrice =
      (candle.high + candle.low + candle.close) / 3;

    cumulativePV += typicalPrice * volume;
    cumulativeP2V += typicalPrice * typicalPrice * volume;
    cumulativeVolume += volume;
  }

  if (cumulativeVolume <= 0) {
    return {
      value: null,
      upper1: null,
      lower1: null,
      upper2: null,
      lower2: null,
      standardDeviation: null,
      volume: 0,
      trend: "Unavailable",
    };
  }

  const vwap = cumulativePV / cumulativeVolume;

  const variance =
    Math.max(
      cumulativeP2V / cumulativeVolume - vwap * vwap,
      0
    );

  const sd = Math.sqrt(variance);

  const currentPrice = candles[candles.length - 1].close;

  return {
    value: round(vwap),
    upper1: round(vwap + sd),
    lower1: round(vwap - sd),
    upper2: round(vwap + 2 * sd),
    lower2: round(vwap - 2 * sd),
    standardDeviation: round(sd),
    volume: cumulativeVolume,

    trend:
      currentPrice > vwap
        ? "Above VWAP"
        : currentPrice < vwap
          ? "Below VWAP"
          : "At VWAP",
  };
}

// =====================================================
// VOLUME ANALYSIS
// =====================================================

function calculateVolume(candles, period = 20) {
  const current = candles[candles.length - 1];

  const previous = candles.slice(
    Math.max(0, candles.length - period - 1),
    -1
  );

  const averageVolume =
    previous.length > 0
      ? previous.reduce((sum, c) => sum + c.volume, 0) /
        previous.length
      : 0;

  const ratio =
    averageVolume > 0
      ? current.volume / averageVolume
      : null;

  return {
    current: current.volume,
    average: round(averageVolume, 0),
    ratio: round(ratio),
    status:
      ratio === null
        ? "Unavailable"
        : ratio >= 1.5
          ? "High"
          : ratio <= 0.7
            ? "Low"
            : "Normal",
  };
}

// =====================================================
// PURE CALCULATION ENGINE
// =====================================================

export function calculateNiftyFutureTechnicalIndicators(
  inputCandles = [],
  contractInfo = {}
) {
  const candles = normalizeCandles(inputCandles);

  if (candles.length < 50) {
    throw new Error(
      `Not enough NIFTY Futures candles: ${candles.length}`
    );
  }

  const closes = candles.map((c) => c.close);

  const current = candles[candles.length - 1];
  const currentPrice = current.close;

  const ema9 = calculateEMA(closes, 9);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);

  let emaTrend = "Neutral";

  if (ema9 !== null && ema20 !== null && ema50 !== null) {
    if (ema9 > ema20 && ema20 > ema50) {
      emaTrend = "Bullish";
    } else if (ema9 < ema20 && ema20 < ema50) {
      emaTrend = "Bearish";
    }
  }

  const sessionDate = getSessionDate(current.timestamp);

  const sessionCandles = candles.filter(
    (c) => getSessionDate(c.timestamp) === sessionDate
  );

  const vwap = calculateSessionVWAP(sessionCandles);

  const rsiValue = calculateRSI(closes, PERIOD);
  const atrValue = calculateATR(candles, PERIOD);
  const adx = calculateADX(candles, PERIOD);
  const macd = calculateMACD(closes);
  const volume = calculateVolume(candles);

  let rsiTrend = "Neutral";

  if (rsiValue !== null) {
    if (rsiValue >= 55) rsiTrend = "Bullish";
    else if (rsiValue <= 45) rsiTrend = "Bearish";
  }

  const atrPercent =
    atrValue !== null && currentPrice > 0
      ? (atrValue / currentPrice) * 100
      : null;

  const volatility =
    atrPercent === null
      ? "Unavailable"
      : atrPercent >= 0.8
        ? "High"
        : atrPercent <= 0.35
          ? "Low"
          : "Normal";

  return {
    source: "ZERODHA_NIFTY_FUTURES",

    contract: contractInfo.tradingsymbol ?? null,
    instrumentToken: contractInfo.instrumentToken ?? null,
    expiry: contractInfo.expiry ?? null,

    timeframe: "5minute",

    currentPrice: round(currentPrice),

    session: sessionDate,
    candleCount: candles.length,
    sessionCandleCount: sessionCandles.length,

    ema: {
      ema9: round(ema9),
      ema20: round(ema20),
      ema50: round(ema50),
      ema200: round(ema200),
      trend: emaTrend,
    },

    vwap,

    rsi: {
      value: round(rsiValue),
      trend: rsiTrend,
    },

    macd,

    adx,

    atr: {
      value: round(atrValue),
      percentage: round(atrPercent),
      volatility,
    },

    volume,

    lastCandle: {
      timestamp: current.timestamp,
      open: current.open,
      high: current.high,
      low: current.low,
      close: current.close,
      volume: current.volume,
    },
  };
}

function filterCompletedNiftySessionCandles(candles = []) {
  const now = Date.now();
  const intervalMs = 5 * 60 * 1000;

  return candles.filter((candle) => {
    const timestamp = new Date(candle?.date).getTime();

    if (!Number.isFinite(timestamp)) return false;
    if (timestamp + intervalMs > now) return false;

    const parts = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(timestamp));

    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value])
    );

    if (
      values.weekday === "Sat" ||
      values.weekday === "Sun"
    ) {
      return false;
    }

    const minutes =
      Number(values.hour) * 60 +
      Number(values.minute);

    return minutes >= 555 && minutes < 930;
  });
}

// =====================================================
// FETCH + CALCULATE FUTURES TECHNICAL DATA
// =====================================================

export async function getNiftyFutureTechnicalIndicators(
  interval = "5minute",
  days = 5
) {
  const result = await getNiftyFutureHistoricalData(interval, days);

  if (!result || !Array.isArray(result.candles)) {
    throw new Error("Invalid NIFTY Futures historical response");
  }

  const completedCandles =
    filterCompletedNiftySessionCandles(result.candles);

  if (completedCandles.length < 50) {
    throw new Error(
      `Insufficient completed Futures candles: ${completedCandles.length}`
    );
  }

  return calculateNiftyFutureTechnicalIndicators(
    completedCandles,
    result
  );
}
