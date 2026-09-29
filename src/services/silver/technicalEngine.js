// =====================================================
// SILVER TECHNICAL ENGINE
// 5 MINUTE LIVE
//
// EMA 9 / 20 / 50
// MACD 12 / 26 / 9
// RSI 14
// ADX 14
// +DI / -DI
// VOLUME
//
// Price-aware EMA Structure
// =====================================================


// =====================================================
// EMA
// =====================================================

export function calculateEMA(values, period) {

  if (
    !Array.isArray(values) ||
    values.length === 0
  ) {
    return [];
  }

  const result =
    new Array(values.length).fill(null);

  if (values.length < period) {
    return result;
  }

  // First EMA = SMA

  let sum = 0;

  for (
    let i = 0;
    i < period;
    i++
  ) {
    sum += Number(values[i]);
  }

  let ema =
    sum / period;

  result[period - 1] =
    ema;

  const multiplier =
    2 / (period + 1);

  for (
    let i = period;
    i < values.length;
    i++
  ) {

    const price =
      Number(values[i]);

    ema =
      (price - ema) *
        multiplier +
      ema;

    result[i] =
      ema;
  }

  return result;
}


// =====================================================
// RSI 14
// =====================================================

export function calculateRSI(
  values,
  period = 14
) {

  const result =
    new Array(values.length).fill(null);

  if (
    values.length <= period
  ) {
    return result;
  }

  let gains = 0;
  let losses = 0;

  for (
    let i = 1;
    i <= period;
    i++
  ) {

    const change =
      values[i] -
      values[i - 1];

    if (change > 0) {

      gains += change;

    } else {

      losses +=
        Math.abs(change);
    }
  }

  let averageGain =
    gains / period;

  let averageLoss =
    losses / period;

  result[period] =
    averageLoss === 0
      ? 100
      : 100 -
        100 /
          (1 +
            averageGain /
              averageLoss);

  for (
    let i = period + 1;
    i < values.length;
    i++
  ) {

    const change =
      values[i] -
      values[i - 1];

    const gain =
      change > 0
        ? change
        : 0;

    const loss =
      change < 0
        ? Math.abs(change)
        : 0;

    averageGain =
      (
        averageGain *
          (period - 1) +
        gain
      ) /
      period;

    averageLoss =
      (
        averageLoss *
          (period - 1) +
        loss
      ) /
      period;

    if (
      averageLoss === 0
    ) {

      result[i] = 100;

    } else {

      const rs =
        averageGain /
        averageLoss;

      result[i] =
        100 -
        100 /
          (1 + rs);
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

  const fastEMA =
    calculateEMA(
      values,
      fastPeriod
    );

  const slowEMA =
    calculateEMA(
      values,
      slowPeriod
    );

  const macdLine =
    new Array(
      values.length
    ).fill(null);

  for (
    let i = 0;
    i < values.length;
    i++
  ) {

    if (
      fastEMA[i] !== null &&
      slowEMA[i] !== null
    ) {

      macdLine[i] =
        fastEMA[i] -
        slowEMA[i];
    }
  }

  const validMACD = [];
  const validIndexes = [];

  for (
    let i = 0;
    i < macdLine.length;
    i++
  ) {

    if (
      macdLine[i] !== null
    ) {

      validMACD.push(
        macdLine[i]
      );

      validIndexes.push(i);
    }
  }

  const signalValues =
    calculateEMA(
      validMACD,
      signalPeriod
    );

  const signalLine =
    new Array(
      values.length
    ).fill(null);

  for (
    let i = 0;
    i < validIndexes.length;
    i++
  ) {

    const originalIndex =
      validIndexes[i];

    if (
      signalValues[i] !== null
    ) {

      signalLine[
        originalIndex
      ] =
        signalValues[i];
    }
  }

  const histogram =
    new Array(
      values.length
    ).fill(null);

  for (
    let i = 0;
    i < values.length;
    i++
  ) {

    if (
      macdLine[i] !== null &&
      signalLine[i] !== null
    ) {

      histogram[i] =
        macdLine[i] -
        signalLine[i];
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

function calculateTrueRange(
  candles
) {

  const tr =
    new Array(
      candles.length
    ).fill(null);

  for (
    let i = 0;
    i < candles.length;
    i++
  ) {

    const high =
      Number(
        candles[i].high
      );

    const low =
      Number(
        candles[i].low
      );

    if (i === 0) {

      tr[i] =
        high - low;

      continue;
    }

    const previousClose =
      Number(
        candles[i - 1].close
      );

    tr[i] =
      Math.max(
        high - low,

        Math.abs(
          high -
          previousClose
        ),

        Math.abs(
          low -
          previousClose
        )
      );
  }

  return tr;
}


// =====================================================
// ADX 14
// +DI / -DI
// =====================================================

export function calculateADX(
  candles,
  period = 14
) {

  const length =
    candles.length;

  const tr =
    new Array(length).fill(0);

  const plusDM =
    new Array(length).fill(0);

  const minusDM =
    new Array(length).fill(0);

  // ---------------------------------------------------
  // TR / +DM / -DM
  // ---------------------------------------------------

  for (
    let i = 1;
    i < length;
    i++
  ) {

    const high =
      Number(
        candles[i].high
      );

    const low =
      Number(
        candles[i].low
      );

    const previousHigh =
      Number(
        candles[i - 1].high
      );

    const previousLow =
      Number(
        candles[i - 1].low
      );

    const previousClose =
      Number(
        candles[i - 1].close
      );

    tr[i] =
      Math.max(
        high - low,

        Math.abs(
          high -
          previousClose
        ),

        Math.abs(
          low -
          previousClose
        )
      );

    const upMove =
      high -
      previousHigh;

    const downMove =
      previousLow -
      low;

    plusDM[i] =
      upMove > downMove &&
      upMove > 0
        ? upMove
        : 0;

    minusDM[i] =
      downMove > upMove &&
      downMove > 0
        ? downMove
        : 0;
  }

  // ---------------------------------------------------
  // DI / DX / ADX ARRAYS
  // ---------------------------------------------------

  const plusDI =
    new Array(length).fill(null);

  const minusDI =
    new Array(length).fill(null);

  const dx =
    new Array(length).fill(null);

  const adx =
    new Array(length).fill(null);

  if (
    length <= period * 2
  ) {

    return {
      adx,
      plusDI,
      minusDI,
    };
  }

  // ---------------------------------------------------
  // INITIAL SMOOTHING
  // ---------------------------------------------------

  let trSum = 0;

  let plusDMSum = 0;

  let minusDMSum = 0;

  for (
    let i = 1;
    i <= period;
    i++
  ) {

    trSum += tr[i];

    plusDMSum +=
      plusDM[i];

    minusDMSum +=
      minusDM[i];
  }

  let smoothedTR =
    trSum;

  let smoothedPlusDM =
    plusDMSum;

  let smoothedMinusDM =
    minusDMSum;

  // ---------------------------------------------------
  // CALCULATE +DI / -DI / DX
  // ---------------------------------------------------

  for (
    let i = period;
    i < length;
    i++
  ) {

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

    if (
      smoothedTR !== 0
    ) {

      plusDI[i] =
        (
          smoothedPlusDM /
          smoothedTR
        ) *
        100;

      minusDI[i] =
        (
          smoothedMinusDM /
          smoothedTR
        ) *
        100;
    }

    if (
      plusDI[i] !== null &&
      minusDI[i] !== null &&
      plusDI[i] +
        minusDI[i] !==
        0
    ) {

      dx[i] =
        (
          Math.abs(
            plusDI[i] -
            minusDI[i]
          ) /
          (
            plusDI[i] +
            minusDI[i]
          )
        ) *
        100;
    }
  }

  // ---------------------------------------------------
  // FIRST ADX
  // ---------------------------------------------------

  const firstDXIndex =
    period;

  let dxSum = 0;

  let dxCount = 0;

  for (
    let i = firstDXIndex;
    i < length &&
    dxCount < period;
    i++
  ) {

    if (
      dx[i] !== null
    ) {

      dxSum +=
        dx[i];

      dxCount++;
    }
  }

  if (
    dxCount < period
  ) {

    return {
      adx,
      plusDI,
      minusDI,
    };
  }

  const firstADXIndex =
    firstDXIndex +
    period -
    1;

  let currentADX =
    dxSum / period;

  adx[
    firstADXIndex
  ] =
    currentADX;

  // ---------------------------------------------------
  // CONTINUE ADX
  // ---------------------------------------------------

  for (
    let i =
      firstADXIndex + 1;
    i < length;
    i++
  ) {

    if (
      dx[i] !== null
    ) {

      currentADX =
        (
          currentADX *
            (period - 1) +
          dx[i]
        ) /
        period;

      adx[i] =
        currentADX;
    }
  }

  // ---------------------------------------------------
  // RETURN ADX + DI VALUES
  // ---------------------------------------------------

  return {

    adx,

    plusDI,

    minusDI,
  };
}


// =====================================================
// EMA STRUCTURE
// PRICE-AWARE
// =====================================================

function calculateEMAStructure(
  price,
  ema9,
  ema20,
  ema50
) {

  if (
    price == null ||
    ema9 == null ||
    ema20 == null ||
    ema50 == null
  ) {

    return {

      score: 0,

      trend:
        "Insufficient Data",
    };
  }

  // ---------------------------------------------------
  // FULL BULLISH
  // ---------------------------------------------------

  if (
    price > ema9 &&
    ema9 > ema20 &&
    ema20 > ema50
  ) {

    return {

      score: 30,

      trend:
        "Strong Bullish",
    };
  }

  // ---------------------------------------------------
  // BULLISH BUT PRICE BELOW EMA9
  // ---------------------------------------------------

  if (
    ema9 > ema20 &&
    ema20 > ema50 &&
    price <= ema9
  ) {

    return {

      score: 20,

      trend:
        "Bullish Weakening",
    };
  }

  // ---------------------------------------------------
  // FURTHER BULLISH WEAKENING
  // ---------------------------------------------------

  if (
    ema9 > ema20 &&
    ema20 <= ema50
  ) {

    return {

      score: 10,

      trend:
        "Bullish Weakening",
    };
  }

  // ---------------------------------------------------
  // FULL BEARISH
  // ---------------------------------------------------

  if (
    price < ema9 &&
    ema9 < ema20 &&
    ema20 < ema50
  ) {

    return {

      score: -30,

      trend:
        "Strong Bearish",
    };
  }

  // ---------------------------------------------------
  // BEARISH BUT PRICE ABOVE EMA9
  // ---------------------------------------------------

  if (
    ema9 < ema20 &&
    ema20 < ema50 &&
    price >= ema9
  ) {

    return {

      score: -20,

      trend:
        "Bearish Weakening",
    };
  }

  // ---------------------------------------------------
  // FURTHER BEARISH WEAKENING
  // ---------------------------------------------------

  if (
    ema9 < ema20 &&
    ema20 >= ema50
  ) {

    return {

      score: -10,

      trend:
        "Bearish Weakening",
    };
  }

  // ---------------------------------------------------
  // MIXED
  // ---------------------------------------------------

  return {

    score: 0,

    trend:
      "Mixed",
  };
}


// =====================================================
// SILVER TECHNICAL ANALYSIS
// 5 MINUTE LIVE
// =====================================================

export function calculateSilverTechnicalIndicators(
  candles
) {

  if (
    !Array.isArray(candles) ||
    candles.length === 0
  ) {

    throw new Error(
      "Silver candles are required"
    );
  }

  // ---------------------------------------------------
  // CLOSE / PRICE
  // ---------------------------------------------------

  const closes =
    candles.map(
      (candle) =>
        Number(candle.close)
    );

  const lastIndex =
    candles.length - 1;

  const price =
    closes[lastIndex];

  // ---------------------------------------------------
  // EMA
  // ---------------------------------------------------

  const ema9 =
    calculateEMA(
      closes,
      9
    );

  const ema20 =
    calculateEMA(
      closes,
      20
    );

  const ema50 =
    calculateEMA(
      closes,
      50
    );

  // ---------------------------------------------------
  // MACD
  // ---------------------------------------------------

  const macd =
    calculateMACD(
      closes,
      12,
      26,
      9
    );

  // ---------------------------------------------------
  // RSI
  // ---------------------------------------------------

  const rsi =
    calculateRSI(
      closes,
      14
    );

  // ---------------------------------------------------
  // ADX + DI
  // ---------------------------------------------------

  const adxData =
    calculateADX(
      candles,
      14
    );

  const adx =
    adxData.adx;

  const plusDI =
    adxData.plusDI;

  const minusDI =
    adxData.minusDI;

  // ---------------------------------------------------
  // VOLUME
  // ---------------------------------------------------

  const volumes =
    candles.map(
      (candle) =>
        Number(candle.volume) || 0
    );

  const currentVolume =
    volumes[lastIndex];

  // Average previous 20 candles

  const volumeLookback =
    20;

  const volumeStart =
    Math.max(
      0,
      lastIndex -
        volumeLookback
    );

  const previousVolumes =
    volumes.slice(
      volumeStart,
      lastIndex
    );

  const averageVolume =
    previousVolumes.length > 0
      ? previousVolumes.reduce(
          (
            sum,
            value
          ) =>
            sum + value,
          0
        ) /
        previousVolumes.length
      : 0;

  const volumeRatio =
    averageVolume > 0
      ? currentVolume /
        averageVolume
      : null;

  // ---------------------------------------------------
  // EMA STRUCTURE
  // ---------------------------------------------------

  const emaStructure =
    calculateEMAStructure(
      price,
      ema9[lastIndex],
      ema20[lastIndex],
      ema50[lastIndex]
    );

  // ---------------------------------------------------
  // MACD CURRENT VALUES
  // ---------------------------------------------------

  const macdValue =
    macd.macdLine[
      lastIndex
    ];

  const signalValue =
    macd.signalLine[
      lastIndex
    ];

  const histogramValue =
    macd.histogram[
      lastIndex
    ];

  let macdTrend =
    "Neutral";

  if (
    macdValue !== null &&
    signalValue !== null
  ) {

    if (
      macdValue >
        signalValue &&
      histogramValue > 0
    ) {

      macdTrend =
        "Bullish";

    } else if (
      macdValue <
        signalValue &&
      histogramValue < 0
    ) {

      macdTrend =
        "Bearish";
    }
  }

  // ---------------------------------------------------
  // RSI TREND
  // ---------------------------------------------------

  let rsiTrend =
    "Neutral";

  if (
    rsi[lastIndex] !== null
  ) {

    if (
      rsi[lastIndex] > 55
    ) {

      rsiTrend =
        "Bullish";

    } else if (
      rsi[lastIndex] < 45
    ) {

      rsiTrend =
        "Bearish";
    }
  }

  // ---------------------------------------------------
  // ADX TREND
  // ---------------------------------------------------

  let adxTrend =
    "Neutral";

  if (
    adx[lastIndex] !== null
  ) {

    if (
      adx[lastIndex] >= 25
    ) {

      adxTrend =
        "Trending";

    } else {

      adxTrend =
        "Weak Trend";
    }
  }

  // ---------------------------------------------------
  // DI DIRECTION
  // ---------------------------------------------------

  let diDirection =
    "Neutral";

  if (
    plusDI[lastIndex] !== null &&
    minusDI[lastIndex] !== null
  ) {

    if (
      plusDI[lastIndex] >
      minusDI[lastIndex]
    ) {

      diDirection =
        "Bullish";

    } else if (
      minusDI[lastIndex] >
      plusDI[lastIndex]
    ) {

      diDirection =
        "Bearish";
    }
  }

  // ---------------------------------------------------
  // FINAL RESULT
  // ---------------------------------------------------

  return {

    timeframe:
      "5M",

    live:
      true,

    price,

    // -------------------------------------------------
    // EMA
    // -------------------------------------------------

    ema: {

      ema9:
        ema9[lastIndex],

      ema20:
        ema20[lastIndex],

      ema50:
        ema50[lastIndex],

      structureScore:
        emaStructure.score,

      structure:
        emaStructure.trend,
    },

    // -------------------------------------------------
    // MACD
    // -------------------------------------------------

    macd: {

      macd:
        macdValue,

      signal:
        signalValue,

      histogram:
        histogramValue,

      trend:
        macdTrend,

      parameters:
        "12,26,9",
    },

    // -------------------------------------------------
    // RSI
    // -------------------------------------------------

    rsi: {

      value:
        rsi[lastIndex],

      period:
        14,

      trend:
        rsiTrend,
    },

    // -------------------------------------------------
    // ADX
    // -------------------------------------------------

    adx: {

      value:
        adx[lastIndex],

      plusDI:
        plusDI[lastIndex],

      minusDI:
        minusDI[lastIndex],

      direction:
        diDirection,

      period:
        14,

      trend:
        adxTrend,
    },

    // -------------------------------------------------
    // VOLUME
    // -------------------------------------------------

    volume: {

      current:
        currentVolume,

      average:
        averageVolume,

      ratio:
        volumeRatio,

      timeframe:
        "5M",
    },

    // -------------------------------------------------
    // RAW SERIES
    // -------------------------------------------------

    series: {

      ema9,

      ema20,

      ema50,

      macdLine:
        macd.macdLine,

      macdSignal:
        macd.signalLine,

      macdHistogram:
        macd.histogram,

      rsi14:
        rsi,

      adx14:
        adx,

      plusDI14:
        plusDI,

      minusDI:
        minusDI,

      volume:
        volumes,
    },
  };
}