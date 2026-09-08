// =====================================================
// NIFTY TECHNICAL ENGINE
// Zerodha Historical Candles
// EMA / VWAP / RSI / MACD / ATR / ADX
// =====================================================

function getCloses(candles) {
  return candles.map((c) => Number(c.close));
}

// =====================================================
// EMA
// =====================================================

function calculateEMA(values, period) {
  if (!values || values.length < period) {
    return null;
  }

  const multiplier = 2 / (period + 1);

  let ema =
    values
      .slice(0, period)
      .reduce((sum, value) => sum + value, 0) / period;

  for (let i = period; i < values.length; i++) {
    ema =
      (values[i] - ema) * multiplier + ema;
  }

  return ema;
}

// =====================================================
// RSI
// =====================================================

function calculateRSI(values, period = 14) {
  if (!values || values.length <= period) {
    return null;
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

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];

    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    averageGain =
      (averageGain * (period - 1) + gain) /
      period;

    averageLoss =
      (averageLoss * (period - 1) + loss) /
      period;
  }

  if (averageLoss === 0) {
    return 100;
  }

  const rs = averageGain / averageLoss;

  return 100 - 100 / (1 + rs);
}

// =====================================================
// MACD
// =====================================================

function calculateMACD(values) {
  if (!values || values.length < 35) {
    return {
      macd: null,
      signal: null,
      histogram: null,
      trend: "Neutral",
    };
  }

  const ema12Series = [];
  const ema26Series = [];

  const multiplier12 = 2 / (12 + 1);
  const multiplier26 = 2 / (26 + 1);

  let ema12 =
    values
      .slice(0, 12)
      .reduce((sum, value) => sum + value, 0) / 12;

  let ema26 =
    values
      .slice(0, 26)
      .reduce((sum, value) => sum + value, 0) / 26;

  for (let i = 12; i < values.length; i++) {
    ema12 =
      (values[i] - ema12) * multiplier12 + ema12;

    ema12Series.push({
      index: i,
      value: ema12,
    });
  }

  for (let i = 26; i < values.length; i++) {
    ema26 =
      (values[i] - ema26) * multiplier26 + ema26;

    ema26Series.push({
      index: i,
      value: ema26,
    });
  }

  const macdValues = [];

  for (const slow of ema26Series) {
    const fast = ema12Series.find(
      (item) => item.index === slow.index
    );

    if (fast) {
      macdValues.push(
        fast.value - slow.value
      );
    }
  }

  if (macdValues.length < 9) {
    return {
      macd: null,
      signal: null,
      histogram: null,
      trend: "Neutral",
    };
  }

  const signal =
    calculateEMA(macdValues, 9);

  const macd =
    macdValues[macdValues.length - 1];

  const histogram =
    macd - signal;

  return {
    macd,
    signal,
    histogram,
    trend:
      histogram > 0
        ? "Bullish"
        : histogram < 0
        ? "Bearish"
        : "Neutral",
  };
}

// =====================================================
// TRUE RANGE
// =====================================================

function calculateTrueRanges(candles) {
  const trueRanges = [];

  for (let i = 0; i < candles.length; i++) {
    const current = candles[i];

    if (i === 0) {
      trueRanges.push(
        current.high - current.low
      );
      continue;
    }

    const previous = candles[i - 1];

    const range1 =
      current.high - current.low;

    const range2 =
      Math.abs(
        current.high - previous.close
      );

    const range3 =
      Math.abs(
        current.low - previous.close
      );

    trueRanges.push(
      Math.max(range1, range2, range3)
    );
  }

  return trueRanges;
}

// =====================================================
// ATR
// =====================================================

function calculateATR(candles, period = 14) {
  const trueRanges =
    calculateTrueRanges(candles);

  if (trueRanges.length < period) {
    return null;
  }

  let atr =
    trueRanges
      .slice(0, period)
      .reduce((sum, value) => sum + value, 0) /
    period;

  for (
    let i = period;
    i < trueRanges.length;
    i++
  ) {
    atr =
      (atr * (period - 1) +
        trueRanges[i]) /
      period;
  }

  return atr;
}

// =====================================================
// ADX / +DI / -DI
// =====================================================

function calculateADX(candles, period = 14) {
  if (candles.length < period * 2) {
    return {
      adx: null,
      plusDI: null,
      minusDI: null,
      trend: "Sideways",
    };
  }

  const tr = [];
  const plusDM = [];
  const minusDM = [];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];

    const highDiff =
      current.high - previous.high;

    const lowDiff =
      previous.low - current.low;

    const trueRange = Math.max(
      current.high - current.low,
      Math.abs(
        current.high - previous.close
      ),
      Math.abs(
        current.low - previous.close
      )
    );

    tr.push(trueRange);

    plusDM.push(
      highDiff > lowDiff && highDiff > 0
        ? highDiff
        : 0
    );

    minusDM.push(
      lowDiff > highDiff && lowDiff > 0
        ? lowDiff
        : 0
    );
  }

  if (tr.length < period) {
    return {
      adx: null,
      plusDI: null,
      minusDI: null,
      trend: "Sideways",
    };
  }

  let smoothedTR =
    tr
      .slice(0, period)
      .reduce((sum, value) => sum + value, 0);

  let smoothedPlusDM =
    plusDM
      .slice(0, period)
      .reduce((sum, value) => sum + value, 0);

  let smoothedMinusDM =
    minusDM
      .slice(0, period)
      .reduce((sum, value) => sum + value, 0);

  const dxValues = [];

  let latestPlusDI = 0;
  let latestMinusDI = 0;

  for (let i = period; i < tr.length; i++) {
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

    if (smoothedTR === 0) {
      continue;
    }

    const plusDI =
      (smoothedPlusDM / smoothedTR) * 100;

    const minusDI =
      (smoothedMinusDM / smoothedTR) * 100;

    latestPlusDI = plusDI;
    latestMinusDI = minusDI;

    const diSum =
      plusDI + minusDI;

    const dx =
      diSum === 0
        ? 0
        : (Math.abs(
            plusDI - minusDI
          ) /
            diSum) *
          100;

    dxValues.push(dx);
  }

  if (dxValues.length < period) {
    return {
      adx: null,
      plusDI: latestPlusDI,
      minusDI: latestMinusDI,
      trend: "Sideways",
    };
  }

  let adx =
    dxValues
      .slice(0, period)
      .reduce((sum, value) => sum + value, 0) /
    period;

  for (
    let i = period;
    i < dxValues.length;
    i++
  ) {
    adx =
      (adx * (period - 1) +
        dxValues[i]) /
      period;
  }

  let trend = "Sideways";

  if (adx >= 25) {
    if (latestPlusDI > latestMinusDI) {
      trend = "Strong Bullish";
    } else if (
      latestMinusDI > latestPlusDI
    ) {
      trend = "Strong Bearish";
    } else {
      trend = "Strong";
    }
  } else if (adx >= 20) {
    if (latestPlusDI > latestMinusDI) {
      trend = "Moderate Bullish";
    } else if (
      latestMinusDI > latestPlusDI
    ) {
      trend = "Moderate Bearish";
    } else {
      trend = "Moderate";
    }
  }

  return {
    adx,
    plusDI: latestPlusDI,
    minusDI: latestMinusDI,
    trend,
  };
}

// =====================================================
// VWAP
// =====================================================

function calculateVWAP(candles) {
  let cumulativePV = 0;
  let cumulativeVolume = 0;

  for (const candle of candles) {
    const volume = Number(candle.volume) || 0;

    const typicalPrice =
      (candle.high +
        candle.low +
        candle.close) /
      3;

    cumulativePV +=
      typicalPrice * volume;

    cumulativeVolume += volume;
  }

  if (cumulativeVolume === 0) {
    return null;
  }

  return cumulativePV / cumulativeVolume;
}

// =====================================================
// MAIN TECHNICAL ENGINE
// =====================================================

export function calculateNiftyTechnicalIndicators(
  candles = []
) {
  try {
    if (!Array.isArray(candles)) {
      throw new Error(
        "Invalid NIFTY candles"
      );
    }

    const validCandles = candles
      .map((c) => ({
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: Number(c.volume || 0),
        timestamp: c.timestamp,
      }))
      .filter(
        (c) =>
          Number.isFinite(c.open) &&
          Number.isFinite(c.high) &&
          Number.isFinite(c.low) &&
          Number.isFinite(c.close)
      );

    if (validCandles.length < 50) {
      throw new Error(
        `Not enough NIFTY candles: ${validCandles.length}`
      );
    }

    const closes =
      getCloses(validCandles);

    const ema9 =
      calculateEMA(closes, 9);

    const ema20 =
      calculateEMA(closes, 20);

    const ema50 =
      calculateEMA(closes, 50);

    const ema200 =
      calculateEMA(closes, 200);

    const vwap =
      calculateVWAP(validCandles);

    const rsi =
      calculateRSI(closes, 14);

    const macd =
      calculateMACD(closes);

    const atr =
      calculateATR(validCandles, 14);

    const adx =
      calculateADX(validCandles, 14);

    const currentPrice =
      closes[closes.length - 1];

    // =================================================
    // EMA TREND
    // =================================================

    let emaTrend = "Neutral";

    if (
      ema9 !== null &&
      ema20 !== null &&
      ema50 !== null
    ) {
      if (
        ema9 > ema20 &&
        ema20 > ema50
      ) {
        emaTrend = "Bullish";
      } else if (
        ema9 < ema20 &&
        ema20 < ema50
      ) {
        emaTrend = "Bearish";
      }
    }

    // =================================================
    // PRICE vs VWAP
    // =================================================

    let vwapTrend = "Neutral";

    if (vwap !== null) {
      if (currentPrice > vwap) {
        vwapTrend = "Bullish";
      } else if (
        currentPrice < vwap
      ) {
        vwapTrend = "Bearish";
      }
    }

    // =================================================
    // RSI TREND
    // =================================================

    let rsiTrend = "Neutral";

    if (rsi !== null) {
      if (rsi >= 55) {
        rsiTrend = "Bullish";
      } else if (rsi <= 45) {
        rsiTrend = "Bearish";
      }
    }

    // =================================================
    // VOLATILITY
    // =================================================

    let volatility = "Normal";

    if (atr !== null) {
      const atrPercent =
        (atr / currentPrice) * 100;

      if (atrPercent >= 0.8) {
        volatility = "High";
      } else if (
        atrPercent <= 0.35
      ) {
        volatility = "Low";
      }
    }

    // =================================================
    // FINAL RESULT
    // =================================================

    return {
      currentPrice,

      ema: {
        ema9,
        ema20,
        ema50,
        ema200,
        trend: emaTrend,
      },

      vwap: {
        value: vwap,
        trend: vwapTrend,
      },

      rsi: {
        value: rsi,
        trend: rsiTrend,
      },

      macd,

      atr: {
        value: atr,
        volatility,
      },

      adx,

      candleCount: validCandles.length,

      lastCandle:
        validCandles[
          validCandles.length - 1
        ],
    };
  } catch (error) {
    console.error(
      "NIFTY TECHNICAL ENGINE ERROR ================="
    );
    console.error(error);

    return {
      currentPrice: null,

      ema: {
        ema9: null,
        ema20: null,
        ema50: null,
        ema200: null,
        trend: "Neutral",
      },

      vwap: {
        value: null,
        trend: "Neutral",
      },

      rsi: {
        value: null,
        trend: "Neutral",
      },

      macd: {
        macd: null,
        signal: null,
        histogram: null,
        trend: "Neutral",
      },

      atr: {
        value: null,
        volatility: "Unknown",
      },

      adx: {
        adx: null,
        plusDI: null,
        minusDI: null,
        trend: "Sideways",
      },

      candleCount: 0,
      lastCandle: null,
    };
  }
}