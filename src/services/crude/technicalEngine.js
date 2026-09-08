// =====================================================
// CRUDE OIL TECHNICAL ENGINE
// EMA 9 / 20 / 50 / 200 + VWAP
// =====================================================

// =====================================================
// EMA
// =====================================================
export function calculateEMA(values, period) {
  if (!Array.isArray(values) || values.length === 0) {
    return [];
  }

  const result = new Array(values.length).fill(null);

  if (values.length < period) {
    return result;
  }

  // First EMA value = SMA
  let sum = 0;

  for (let i = 0; i < period; i++) {
    sum += Number(values[i]);
  }

  let ema = sum / period;
  result[period - 1] = ema;

  const multiplier = 2 / (period + 1);

  // Remaining EMA values
  for (let i = period; i < values.length; i++) {
    const price = Number(values[i]);

    ema = (price - ema) * multiplier + ema;

    result[i] = ema;
  }

  return result;
}

// =====================================================
// INTRADAY VWAP
// =====================================================
export function calculateVWAP(candles) {
  if (!Array.isArray(candles) || candles.length === 0) {
    return [];
  }

  const result = new Array(candles.length).fill(null);

  let cumulativePV = 0;
  let cumulativeVolume = 0;
  let currentTradingDay = null;

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];

    const date = new Date(candle.date);

    // MCX Crude trading day
    const tradingDay = date.toISOString().slice(0, 10);

    // Reset VWAP at new trading day
    if (currentTradingDay !== tradingDay) {
      currentTradingDay = tradingDay;

      cumulativePV = 0;
      cumulativeVolume = 0;
    }

    const high = Number(candle.high);
    const low = Number(candle.low);
    const close = Number(candle.close);
    const volume = Number(candle.volume) || 0;

    const typicalPrice = (high + low + close) / 3;

    cumulativePV += typicalPrice * volume;
    cumulativeVolume += volume;

    if (cumulativeVolume > 0) {
      result[i] = cumulativePV / cumulativeVolume;
    }
  }

  return result;
}

// =====================================================
// CRUDE TECHNICAL ANALYSIS
// =====================================================
export function calculateCrudeTechnicalIndicators(candles) {
  if (!Array.isArray(candles) || candles.length === 0) {
    throw new Error("Candles are required");
  }

  const closes = candles.map((candle) => Number(candle.close));

  // TREND
  const ema9 = calculateEMA(closes, 9);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const vwap = calculateVWAP(candles);

  // MOMENTUM
  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes, 12, 26, 9);

  // STRENGTH
  const adx = calculateADX(candles, 14);

  // VOLATILITY
  const atr = calculateATR(candles, 14);

  const lastIndex = candles.length - 1;

  return {
    ema9: ema9[lastIndex],
    ema20: ema20[lastIndex],
    ema50: ema50[lastIndex],
    ema200: ema200[lastIndex],
    vwap: vwap[lastIndex],

    rsi14: rsi[lastIndex],

    macd: {
      macd: macd.macdLine[lastIndex],
      signal: macd.signalLine[lastIndex],
      histogram: macd.histogram[lastIndex],
    },

    adx14: adx[lastIndex],

    atr14: atr[lastIndex],

    series: {
      ema9,
      ema20,
      ema50,
      ema200,
      vwap,
      rsi14: rsi,
      macdLine: macd.macdLine,
      macdSignal: macd.signalLine,
      macdHistogram: macd.histogram,
      adx14: adx,
      atr14: atr,
    },
  };
}
// =====================================================
// RSI 14
// =====================================================
export function calculateRSI(values, period = 14) {
  const result = new Array(values.length).fill(null);

  if (values.length <= period) {
    return result;
  }

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];

    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  result[period] =
    averageLoss === 0
      ? 100
      : 100 - 100 / (1 + averageGain / averageLoss);

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];

    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    averageGain =
      (averageGain * (period - 1) + gain) / period;

    averageLoss =
      (averageLoss * (period - 1) + loss) / period;

    if (averageLoss === 0) {
      result[i] = 100;
    } else {
      const rs = averageGain / averageLoss;
      result[i] = 100 - 100 / (1 + rs);
    }
  }

  return result;
}

// =====================================================
// MACD
// 12 / 26 / 9
// =====================================================
export function calculateMACD(
  values,
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
) {
  const fastEMA = calculateEMA(values, fastPeriod);
  const slowEMA = calculateEMA(values, slowPeriod);

  const macdLine = new Array(values.length).fill(null);

  for (let i = 0; i < values.length; i++) {
    if (
      fastEMA[i] !== null &&
      slowEMA[i] !== null
    ) {
      macdLine[i] = fastEMA[i] - slowEMA[i];
    }
  }

  const validMACD = [];
  const validIndexes = [];

  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] !== null) {
      validMACD.push(macdLine[i]);
      validIndexes.push(i);
    }
  }

  const signalValues = calculateEMA(
    validMACD,
    signalPeriod
  );

  const signalLine = new Array(values.length).fill(null);

  for (let i = 0; i < validIndexes.length; i++) {
    const originalIndex = validIndexes[i];

    if (signalValues[i] !== null) {
      signalLine[originalIndex] = signalValues[i];
    }
  }

  const histogram = new Array(values.length).fill(null);

  for (let i = 0; i < values.length; i++) {
    if (
      macdLine[i] !== null &&
      signalLine[i] !== null
    ) {
      histogram[i] =
        macdLine[i] - signalLine[i];
    }
  }

  return {
    macdLine,
    signalLine,
    histogram,
  };
}

// =====================================================
// TRUE RANGE
// =====================================================
function calculateTrueRange(candles) {
  const tr = new Array(candles.length).fill(null);

  for (let i = 0; i < candles.length; i++) {
    const high = Number(candles[i].high);
    const low = Number(candles[i].low);

    if (i === 0) {
      tr[i] = high - low;
      continue;
    }

    const previousClose =
      Number(candles[i - 1].close);

    tr[i] = Math.max(
      high - low,
      Math.abs(high - previousClose),
      Math.abs(low - previousClose)
    );
  }

  return tr;
}

// =====================================================
// ATR 14
// =====================================================
export function calculateATR(candles, period = 14) {
  const tr = calculateTrueRange(candles);

  const result = new Array(candles.length).fill(null);

  if (candles.length <= period) {
    return result;
  }

  let sum = 0;

  for (let i = 0; i < period; i++) {
    sum += tr[i];
  }

  let atr = sum / period;

  result[period - 1] = atr;

  for (let i = period; i < candles.length; i++) {
    atr =
      (atr * (period - 1) + tr[i]) / period;

    result[i] = atr;
  }

  return result;
}

// =====================================================
// ADX 14
// =====================================================
export function calculateADX(candles, period = 14) {
  const length = candles.length;

  const tr = new Array(length).fill(0);
  const plusDM = new Array(length).fill(0);
  const minusDM = new Array(length).fill(0);

  for (let i = 1; i < length; i++) {
    const high = Number(candles[i].high);
    const low = Number(candles[i].low);

    const previousHigh =
      Number(candles[i - 1].high);

    const previousLow =
      Number(candles[i - 1].low);

    const previousClose =
      Number(candles[i - 1].close);

    tr[i] = Math.max(
      high - low,
      Math.abs(high - previousClose),
      Math.abs(low - previousClose)
    );

    const upMove = high - previousHigh;
    const downMove = previousLow - low;

    plusDM[i] =
      upMove > downMove && upMove > 0
        ? upMove
        : 0;

    minusDM[i] =
      downMove > upMove && downMove > 0
        ? downMove
        : 0;
  }

  const plusDI = new Array(length).fill(null);
  const minusDI = new Array(length).fill(null);
  const dx = new Array(length).fill(null);
  const adx = new Array(length).fill(null);

  if (length <= period * 2) {
    return adx;
  }

  let trSum = 0;
  let plusDMSum = 0;
  let minusDMSum = 0;

  for (let i = 1; i <= period; i++) {
    trSum += tr[i];
    plusDMSum += plusDM[i];
    minusDMSum += minusDM[i];
  }

  let smoothedTR = trSum;
  let smoothedPlusDM = plusDMSum;
  let smoothedMinusDM = minusDMSum;

  for (let i = period; i < length; i++) {
    if (i > period) {
      smoothedTR =
        smoothedTR -
        smoothedTR / period +
        tr[i];

      smoothedPlusDM =
        smoothedPlusDM -
        smoothedPlusDM / period +
        plusDM[i];

      smoothedMinusDM =
        smoothedMinusDM -
        smoothedMinusDM / period +
        minusDM[i];
    }

    if (smoothedTR !== 0) {
      plusDI[i] =
        (smoothedPlusDM / smoothedTR) * 100;

      minusDI[i] =
        (smoothedMinusDM / smoothedTR) * 100;
    }

    if (
      plusDI[i] !== null &&
      minusDI[i] !== null &&
      plusDI[i] + minusDI[i] !== 0
    ) {
      dx[i] =
        (Math.abs(
          plusDI[i] - minusDI[i]
        ) /
          (plusDI[i] + minusDI[i])) *
        100;
    }
  }

  const firstDXIndex = period;

  let dxSum = 0;
  let dxCount = 0;

  for (
    let i = firstDXIndex;
    i < length && dxCount < period;
    i++
  ) {
    if (dx[i] !== null) {
      dxSum += dx[i];
      dxCount++;
    }
  }

  if (dxCount < period) {
    return adx;
  }

  const firstADXIndex =
    firstDXIndex + period - 1;

  let currentADX = dxSum / period;

  adx[firstADXIndex] = currentADX;

  for (
    let i = firstADXIndex + 1;
    i < length;
    i++
  ) {
    if (dx[i] !== null) {
      currentADX =
        (currentADX * (period - 1) + dx[i]) /
        period;

      adx[i] = currentADX;
    }
  }

  return adx;
}