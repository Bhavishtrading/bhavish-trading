// =====================================================
// NIFTY TECHNICAL ENGINE
// Zerodha Historical Candles
//
// EMA / VWAP / RSI / MACD / ATR / ADX
//
// MACD:
//   Legacy MACD  -> existing dashboard compatibility
//   MACD 15M     -> Zerodha 5M -> completed 15M candles
//   Parameters   -> 12, 26, 9
// =====================================================


// =====================================================
// BASIC HELPERS
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
// EMA SERIES
// Used for accurate MACD 12,26,9
// =====================================================

function calculateEMASeries(values, period) {
  if (!values || values.length < period) {
    return [];
  }

  const multiplier = 2 / (period + 1);

  let ema =
    values
      .slice(0, period)
      .reduce((sum, value) => sum + value, 0) / period;

  const result = Array(values.length).fill(null);

  result[period - 1] = ema;

  for (let i = period; i < values.length; i++) {
    ema =
      (values[i] - ema) * multiplier + ema;

    result[i] = ema;
  }

  return result;
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
    const change =
      values[i] - values[i - 1];

    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  for (
    let i = period + 1;
    i < values.length;
    i++
  ) {
    const change =
      values[i] - values[i - 1];

    const gain =
      change > 0 ? change : 0;

    const loss =
      change < 0 ? Math.abs(change) : 0;

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

  const rs =
    averageGain / averageLoss;

  return 100 - 100 / (1 + rs);
}


// =====================================================
// LEGACY MACD
// Kept for existing dashboard compatibility
// =====================================================

// =====================================================
// 5M MACD 12,26,9
// Includes Fresh Crossover Detection
// =====================================================

function calculateMACD(values) {
  if (!values || values.length < 35) {
    return {
      macd: null,
      signal: null,
      histogram: null,
      trend: "Neutral",

      crossoverDetected: false,
      crossoverDirection: "None",

      previousMacd: null,
      previousSignal: null,
    };
  }

  // -----------------------------------------------
  // EMA 12
  // -----------------------------------------------

  const ema12Series =
    calculateEMASeries(values, 12);

  // -----------------------------------------------
  // EMA 26
  // -----------------------------------------------

  const ema26Series =
    calculateEMASeries(values, 26);

  // -----------------------------------------------
  // MACD LINE
  // MACD = EMA12 - EMA26
  // -----------------------------------------------

  const macdValues = [];

  for (let i = 0; i < values.length; i++) {
    if (
      ema12Series[i] === null ||
      ema26Series[i] === null
    ) {
      continue;
    }

    macdValues.push({
      macd:
        ema12Series[i] -
        ema26Series[i],

      originalIndex: i,
    });
  }

  if (macdValues.length < 9) {
    return {
      macd: null,
      signal: null,
      histogram: null,
      trend: "Neutral",

      crossoverDetected: false,
      crossoverDirection: "None",

      previousMacd: null,
      previousSignal: null,
    };
  }

  // -----------------------------------------------
  // SIGNAL LINE = EMA 9 of MACD
  // -----------------------------------------------

  const macdOnly =
    macdValues.map(
      (item) => item.macd
    );

  const signalSeries =
    calculateEMASeries(
      macdOnly,
      9
    );

  const macdSignalSeries = [];

  for (
    let i = 0;
    i < macdValues.length;
    i++
  ) {
    const signal =
      signalSeries[i];

    if (
      signal === null ||
      signal === undefined
    ) {
      continue;
    }

    const macd =
      macdValues[i].macd;

    macdSignalSeries.push({
      macd,
      signal,
      histogram:
        macd - signal,

      originalIndex:
        macdValues[i].originalIndex,
    });
  }

  if (macdSignalSeries.length < 2) {
    return {
      macd: null,
      signal: null,
      histogram: null,
      trend: "Neutral",

      crossoverDetected: false,
      crossoverDirection: "None",

      previousMacd: null,
      previousSignal: null,
    };
  }

  // -----------------------------------------------
  // CURRENT / PREVIOUS
  // -----------------------------------------------

  const current =
    macdSignalSeries[
      macdSignalSeries.length - 1
    ];

  const previous =
    macdSignalSeries[
      macdSignalSeries.length - 2
    ];

  // -----------------------------------------------
  // FRESH BULLISH CROSSOVER
  //
  // Previous MACD <= Previous Signal
  // Current MACD  >  Current Signal
  // -----------------------------------------------

  const bullishCrossover =
    previous.macd <=
      previous.signal &&
    current.macd >
      current.signal;

  // -----------------------------------------------
  // FRESH BEARISH CROSSOVER
  //
  // Previous MACD >= Previous Signal
  // Current MACD  <  Current Signal
  // -----------------------------------------------

  const bearishCrossover =
    previous.macd >=
      previous.signal &&
    current.macd <
      current.signal;

  // -----------------------------------------------
  // CROSSOVER RESULT
  // -----------------------------------------------

  let crossoverDetected =
    false;

  let crossoverDirection =
    "None";

  let crossover =
    "No Fresh Crossover";

  if (bullishCrossover) {
    crossoverDetected = true;
    crossoverDirection = "Bullish";
    crossover = "Bullish Crossover";
  }

  else if (bearishCrossover) {
    crossoverDetected = true;
    crossoverDirection = "Bearish";
    crossover = "Bearish Crossover";
  }

  // -----------------------------------------------
  // TREND
  // -----------------------------------------------

  let trend = "Neutral";

  if (current.macd > current.signal) {
    trend = "Bullish";
  }

  else if (current.macd < current.signal) {
    trend = "Bearish";
  }

  // -----------------------------------------------
  // RETURN
  // -----------------------------------------------

  return {
    macd:
      Number(
        current.macd.toFixed(3)
      ),

    signal:
      Number(
        current.signal.toFixed(3)
      ),

    histogram:
      Number(
        current.histogram.toFixed(3)
      ),

    trend,

    crossover,
    crossoverDetected,
    crossoverDirection,

    previousMacd:
      Number(
        previous.macd.toFixed(3)
      ),

    previousSignal:
      Number(
        previous.signal.toFixed(3)
      ),
  };
}

// =====================================================
// 5M -> 15M CANDLE AGGREGATION
//
// Important:
// We use only COMPLETED 15-minute candles.
// A complete 15M candle must contain 3 x 5M candles.
//
// NSE:
// 09:15
// 09:30
// 09:45
// ...
// 15:15
// =====================================================

function aggregateTo15MinuteCandles(
  candles
) {
  if (
    !Array.isArray(candles) ||
    candles.length === 0
  ) {
    return [];
  }

  const groups = new Map();

  for (const candle of candles) {
    const timestamp =
      candle.timestamp ??
      candle.date ??
      candle.time;

    if (!timestamp) {
      continue;
    }

    const date =
      new Date(timestamp);

    if (
      Number.isNaN(date.getTime())
    ) {
      continue;
    }

    // Convert timestamp to IST
    const istTime =
      new Date(
        date.getTime() +
          330 * 60 * 1000
      );

    const hours =
      istTime.getUTCHours();

    const minutes =
      istTime.getUTCMinutes();

    const totalMinutes =
      hours * 60 + minutes;

    // NSE regular session
    const sessionStart =
      9 * 60 + 15;

    const sessionEnd =
      15 * 60 + 30;

    if (
      totalMinutes < sessionStart ||
      totalMinutes >= sessionEnd
    ) {
      continue;
    }

    const bucket =
      Math.floor(
        (totalMinutes - sessionStart) /
          15
      );

    const bucketStartMinutes =
      sessionStart + bucket * 15;

    const bucketHour =
      Math.floor(
        bucketStartMinutes / 60
      );

    const bucketMinute =
      bucketStartMinutes % 60;

    const year =
      istTime.getUTCFullYear();

    const month =
      String(
        istTime.getUTCMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        istTime.getUTCDate()
      ).padStart(2, "0");

    const key =
      `${year}-${month}-${day}-${String(
        bucketHour
      ).padStart(2, "0")}:${String(
        bucketMinute
      ).padStart(2, "0")}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups
      .get(key)
      .push(candle);
  }

  const result = [];

  for (const candlesInGroup of groups.values()) {
    const sorted =
      candlesInGroup
        .slice()
        .sort(
          (a, b) =>
            new Date(
              a.timestamp ??
              a.date ??
              a.time
            ) -
            new Date(
              b.timestamp ??
              b.date ??
              b.time
            )
        );

    // Only completed 15M candles
    if (sorted.length !== 3) {
      continue;
    }

    const first =
      sorted[0];

    const last =
      sorted[sorted.length - 1];

    const high =
      Math.max(
        ...sorted.map(
          (c) => Number(c.high)
        )
      );

    const low =
      Math.min(
        ...sorted.map(
          (c) => Number(c.low)
        )
      );

    const volume =
      sorted.reduce(
        (sum, c) =>
          sum +
          (Number(c.volume) || 0),
        0
      );

    result.push({
      open: Number(first.open),
      high,
      low,
      close: Number(last.close),
      volume,

      timestamp:
        last.timestamp ??
        last.date ??
        last.time,

      candleStart:
        first.timestamp ??
        first.date ??
        first.time,

      candleEnd:
        last.timestamp ??
        last.date ??
        last.time,

      sourceCandles: 3,
    });
  }

  return result.sort(
    (a, b) =>
      new Date(a.timestamp) -
      new Date(b.timestamp)
  );
}


// =====================================================
// MACD 12,26,9 SERIES
// =====================================================

function calculateMACDSeries(values) {
  if (
    !values ||
    values.length < 35
  ) {
    return null;
  }

  const ema12 =
    calculateEMASeries(
      values,
      12
    );

  const ema26 =
    calculateEMASeries(
      values,
      26
    );

  const macdValues = [];

  for (
    let i = 0;
    i < values.length;
    i++
  ) {
    if (
      ema12[i] === null ||
      ema26[i] === null
    ) {
      continue;
    }

    macdValues.push({
      originalIndex: i,
      value:
        ema12[i] -
        ema26[i],
    });
  }

  if (
    macdValues.length < 9
  ) {
    return null;
  }

  const macdOnly =
    macdValues.map(
      (item) => item.value
    );

  const signalSeries =
    calculateEMASeries(
      macdOnly,
      9
    );

  const combined = [];

  for (
    let i = 0;
    i < macdValues.length;
    i++
  ) {
    const signal =
      signalSeries[i];

    if (
      signal === null ||
      signal === undefined
    ) {
      continue;
    }

    const macd =
      macdValues[i].value;

    combined.push({
      originalIndex:
        macdValues[i]
          .originalIndex,

      macd,

      signal,

      histogram:
        macd - signal,
    });
  }

  return combined;
}


// =====================================================
// MACD 15M INTELLIGENCE
//
// IMPORTANT:
// Negative histogram alone does NOT mean
// fresh bearish crossover.
//
// Fresh crossover requires:
//
// Bullish:
// Previous MACD <= Signal
// Current MACD  > Signal
//
// Bearish:
// Previous MACD >= Signal
// Current MACD  < Signal
// =====================================================

function calculateMACD15m(
  candles
) {
  const candles15m =
    aggregateTo15MinuteCandles(
      candles
    );

  const emptyResult = {
    macd: null,
    signal: null,
    histogram: null,

    trend: "Neutral",
    direction: "Neutral",

    timeframe: "15M",
    parameters: "12,26,9",

    crossover:
      "Not Available",

    crossoverDetected:
      false,

    confirmation:
      "Not Confirmed",

    momentum:
      "Neutral",

    macdSlope:
      "Neutral",

    histogramSlope:
      "Neutral",

    zeroLine:
      "Neutral",

    completedCandles:
      candles15m.length,

    lastCandleClosed:
      false,

    lastCandleTime:
      null,
  };

  // Need enough completed 15M candles
  if (
    candles15m.length < 40
  ) {
    return emptyResult;
  }

  const closes =
    candles15m.map(
      (c) => c.close
    );

  const series =
    calculateMACDSeries(
      closes
    );

  if (
    !series ||
    series.length < 2
  ) {
    return emptyResult;
  }

  const current =
    series[
      series.length - 1
    ];

  const previous =
    series[
      series.length - 2
    ];

  // ===================================================
  // FRESH CROSSOVER
  // ===================================================

  const bullishCross =
    previous.macd <=
      previous.signal &&
    current.macd >
      current.signal;

  const bearishCross =
    previous.macd >=
      previous.signal &&
    current.macd <
      current.signal;

  let crossover =
    "No Fresh Crossover";

  let crossoverDetected =
    false;

  let crossoverDirection =
    "None";

  if (bullishCross) {
    crossover =
      "Bullish Crossover";

    crossoverDetected =
      true;

    crossoverDirection =
      "Bullish";
  } else if (bearishCross) {
    crossover =
      "Bearish Crossover";

    crossoverDetected =
      true;

    crossoverDirection =
      "Bearish";
  }

  // ===================================================
  // SLOPES
  // ===================================================

  const macdSlopeValue =
    current.macd -
    previous.macd;

  const histogramSlopeValue =
    current.histogram -
    previous.histogram;

  const signalSlopeValue =
    current.signal -
    previous.signal;

  const macdSlope =
    macdSlopeValue > 0
      ? "Rising"
      : macdSlopeValue < 0
      ? "Falling"
      : "Flat";

  const histogramSlope =
    histogramSlopeValue > 0
      ? "Increasing"
      : histogramSlopeValue < 0
      ? "Decreasing"
      : "Flat";

  const signalSlope =
    signalSlopeValue > 0
      ? "Rising"
      : signalSlopeValue < 0
      ? "Falling"
      : "Flat";

  // ===================================================
  // DIRECTION
  // ===================================================

  let direction =
    "Neutral";

  if (
    current.macd >
    current.signal
  ) {
    direction =
      "Bullish";
  } else if (
    current.macd <
    current.signal
  ) {
    direction =
      "Bearish";
  }

  // ===================================================
  // MOMENTUM
  // ===================================================

  let momentum =
    "Neutral";

  if (
    current.histogram > 0
  ) {
    if (
      histogramSlopeValue > 0
    ) {
      momentum =
        "Strengthening Bullish";
    } else if (
      histogramSlopeValue < 0
    ) {
      momentum =
        "Weakening Bullish";
    } else {
      momentum =
        "Bullish Stable";
    }
  } else if (
    current.histogram < 0
  ) {
    if (
      histogramSlopeValue < 0
    ) {
      momentum =
        "Strengthening Bearish";
    } else if (
      histogramSlopeValue > 0
    ) {
      momentum =
        "Weakening Bearish";
    } else {
      momentum =
        "Bearish Stable";
    }
  }

  // ===================================================
  // ZERO LINE
  // ===================================================

  let zeroLine =
    "At Zero";

  if (
    current.macd > 0
  ) {
    zeroLine =
      "Above Zero";
  } else if (
    current.macd < 0
  ) {
    zeroLine =
      "Below Zero";
  }

  // ===================================================
  // CONFIRMATION
  // ===================================================

  let trend =
    "Neutral";

  let confirmation =
    "Not Confirmed";

  // Fresh crossover gets priority.
  if (bullishCross) {
    trend =
      "Bullish";

    confirmation =
      "Confirmed";
  } else if (bearishCross) {
    trend =
      "Bearish";

    confirmation =
      "Confirmed";
  } else {

    // -----------------------------------------------
    // Bullish continuation confirmation
    // -----------------------------------------------

    const bullishConfirmed =
      current.macd >
        current.signal &&
      current.histogram > 0 &&
      macdSlopeValue > 0 &&
      histogramSlopeValue >= 0;

    // -----------------------------------------------
    // Bearish continuation confirmation
    // -----------------------------------------------

    const bearishConfirmed =
      current.macd <
        current.signal &&
      current.histogram < 0 &&
      macdSlopeValue < 0 &&
      histogramSlopeValue <= 0;

    if (
      bullishConfirmed
    ) {
      trend =
        "Bullish";

      confirmation =
        "Confirmed";
    } else if (
      bearishConfirmed
    ) {
      trend =
        "Bearish";

      confirmation =
        "Confirmed";
    } else if (
      direction ===
      "Bullish"
    ) {
      trend =
        "Bullish Pressure";

      confirmation =
        "Not Confirmed";
    } else if (
      direction ===
      "Bearish"
    ) {
      trend =
        "Bearish Pressure";

      confirmation =
        "Not Confirmed";
    } else {
      trend =
        "Transition";
    }
  }

  // ===================================================
  // LAST CLOSED 15M CANDLE
  // ===================================================

  const lastCandle =
    candles15m[
      candles15m.length - 1
    ];

  return {
    macd:
      Number(
        current.macd.toFixed(3)
      ),

    signal:
      Number(
        current.signal.toFixed(3)
      ),

    histogram:
      Number(
        current.histogram.toFixed(3)
      ),

    trend,

    direction,

    timeframe:
      "15M",

    parameters:
      "12,26,9",

    crossover,

    crossoverDetected,

    crossoverDirection,

    confirmation,

    momentum,

    macdSlope,

    histogramSlope,

    signalSlope,

    zeroLine,

    macdSlopeValue:
      Number(
        macdSlopeValue.toFixed(3)
      ),

    histogramSlopeValue:
      Number(
        histogramSlopeValue.toFixed(3)
      ),

    completedCandles:
      candles15m.length,

    lastCandleClosed:
      true,

    lastCandleTime:
      lastCandle.timestamp,

    lastCandleStart:
      lastCandle.candleStart,

    lastCandleEnd:
      lastCandle.candleEnd,
  };
}


// =====================================================
// TRUE RANGE
// =====================================================

function calculateTrueRanges(
  candles
) {
  const trueRanges = [];

  for (
    let i = 0;
    i < candles.length;
    i++
  ) {
    const current =
      candles[i];

    if (i === 0) {
      trueRanges.push(
        current.high -
          current.low
      );

      continue;
    }

    const previous =
      candles[i - 1];

    const range1 =
      current.high -
      current.low;

    const range2 =
      Math.abs(
        current.high -
          previous.close
      );

    const range3 =
      Math.abs(
        current.low -
          previous.close
      );

    trueRanges.push(
      Math.max(
        range1,
        range2,
        range3
      )
    );
  }

  return trueRanges;
}


// =====================================================
// ATR
// =====================================================

function calculateATR(
  candles,
  period = 14
) {
  const trueRanges =
    calculateTrueRanges(
      candles
    );

  if (
    trueRanges.length <
    period
  ) {
    return null;
  }

  let atr =
    trueRanges
      .slice(0, period)
      .reduce(
        (sum, value) =>
          sum + value,
        0
      ) / period;

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
// ADX
// =====================================================

function calculateADX(
  candles,
  period = 14
) {
  if (
    candles.length <
    period * 2
  ) {
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

  for (
    let i = 1;
    i < candles.length;
    i++
  ) {
    const current =
      candles[i];

    const previous =
      candles[i - 1];

    const highDiff =
      current.high -
      previous.high;

    const lowDiff =
      previous.low -
      current.low;

    const trueRange =
      Math.max(
        current.high -
          current.low,

        Math.abs(
          current.high -
            previous.close
        ),

        Math.abs(
          current.low -
            previous.close
        )
      );

    tr.push(trueRange);

    plusDM.push(
      highDiff >
        lowDiff &&
      highDiff > 0
        ? highDiff
        : 0
    );

    minusDM.push(
      lowDiff >
        highDiff &&
      lowDiff > 0
        ? lowDiff
        : 0
    );
  }

  if (
    tr.length < period
  ) {
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
      .reduce(
        (sum, value) =>
          sum + value,
        0
      );

  let smoothedPlusDM =
    plusDM
      .slice(0, period)
      .reduce(
        (sum, value) =>
          sum + value,
        0
      );

  let smoothedMinusDM =
    minusDM
      .slice(0, period)
      .reduce(
        (sum, value) =>
          sum + value,
        0
      );

  const dxValues = [];

  let latestPlusDI = 0;
  let latestMinusDI = 0;

  for (
    let i = period;
    i < tr.length;
    i++
  ) {
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

    if (
      smoothedTR === 0
    ) {
      continue;
    }

    const plusDI =
      (smoothedPlusDM /
        smoothedTR) *
      100;

    const minusDI =
      (smoothedMinusDM /
        smoothedTR) *
      100;

    latestPlusDI =
      plusDI;

    latestMinusDI =
      minusDI;

    const diSum =
      plusDI + minusDI;

    const dx =
      diSum === 0
        ? 0
        : (Math.abs(
            plusDI -
              minusDI
          ) /
            diSum) *
          100;

    dxValues.push(dx);
  }

  if (
    dxValues.length <
    period
  ) {
    return {
      adx: null,
      plusDI:
        latestPlusDI,
      minusDI:
        latestMinusDI,
      trend: "Sideways",
    };
  }

  let adx =
    dxValues
      .slice(0, period)
      .reduce(
        (sum, value) =>
          sum + value,
        0
      ) / period;

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

  let trend =
    "Sideways";

  if (adx >= 25) {
    if (
      latestPlusDI >
      latestMinusDI
    ) {
      trend =
        "Strong Bullish";
    } else if (
      latestMinusDI >
      latestPlusDI
    ) {
      trend =
        "Strong Bearish";
    } else {
      trend =
        "Strong";
    }
  } else if (adx >= 20) {
    if (
      latestPlusDI >
      latestMinusDI
    ) {
      trend =
        "Moderate Bullish";
    } else if (
      latestMinusDI >
      latestPlusDI
    ) {
      trend =
        "Moderate Bearish";
    } else {
      trend =
        "Moderate";
    }
  }

  return {
    adx,
    plusDI:
      latestPlusDI,
    minusDI:
      latestMinusDI,
    trend,
  };
}


// =====================================================
// VWAP
// =====================================================

function calculateVWAP(
  candles
) {
  let cumulativePV = 0;
  let cumulativeVolume = 0;

  for (const candle of candles) {
    const volume =
      Number(candle.volume) ||
      0;

    const typicalPrice =
      (candle.high +
        candle.low +
        candle.close) /
      3;

    cumulativePV +=
      typicalPrice *
      volume;

    cumulativeVolume +=
      volume;
  }

  if (
    cumulativeVolume === 0
  ) {
    return null;
  }

  return (
    cumulativePV /
    cumulativeVolume
  );
}


// =====================================================
// MAIN TECHNICAL ENGINE
// =====================================================

export function calculateNiftyTechnicalIndicators(
  candles = []
) {
  try {
    if (
      !Array.isArray(candles)
    ) {
      throw new Error(
        "Invalid NIFTY candles"
      );
    }

    const validCandles =
      candles
        .map((c) => ({
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
          volume:
            Number(c.volume || 0),

          timestamp:
            c.timestamp ??
            c.date ??
            c.time,
        }))
        .filter(
          (c) =>
            Number.isFinite(
              c.open
            ) &&
            Number.isFinite(
              c.high
            ) &&
            Number.isFinite(
              c.low
            ) &&
            Number.isFinite(
              c.close
            )
        );

    if (
      validCandles.length <
      50
    ) {
      throw new Error(
        `Not enough NIFTY candles: ${validCandles.length}`
      );
    }

    const closes =
      getCloses(
        validCandles
      );

    // =================================================
    // EXISTING 5M INDICATORS
    // =================================================

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

    const ema200 =
      calculateEMA(
        closes,
        200
      );

    const vwap =
      calculateVWAP(
        validCandles
      );

    const rsi =
      calculateRSI(
        closes,
        14
      );

    // Legacy MACD remains available
    const macd =
      calculateMACD(
        closes
      );

    // NEW 15M MACD
    const macd15m =
      calculateMACD15m(
        validCandles
      );

    const atr =
      calculateATR(
        validCandles,
        14
      );

    const adx =
      calculateADX(
        validCandles,
        14
      );

    const currentPrice =
      closes[
        closes.length - 1
      ];

    // =================================================
    // EMA TREND
    // =================================================

    let emaTrend =
      "Neutral";

    if (
      ema9 !== null &&
      ema20 !== null &&
      ema50 !== null
    ) {
      if (
        ema9 > ema20 &&
        ema20 > ema50
      ) {
        emaTrend =
          "Bullish";
      } else if (
        ema9 < ema20 &&
        ema20 < ema50
      ) {
        emaTrend =
          "Bearish";
      }
    }

    // =================================================
    // VWAP TREND
    // =================================================

    let vwapTrend =
      "Neutral";

    if (vwap !== null) {
      if (
        currentPrice >
        vwap
      ) {
        vwapTrend =
          "Bullish";
      } else if (
        currentPrice <
        vwap
      ) {
        vwapTrend =
          "Bearish";
      }
    }

    // =================================================
    // RSI TREND
    // =================================================

    let rsiTrend =
      "Neutral";

    if (rsi !== null) {
      if (rsi >= 55) {
        rsiTrend =
          "Bullish";
      } else if (
        rsi <= 45
      ) {
        rsiTrend =
          "Bearish";
      }
    }

    // =================================================
    // VOLATILITY
    // =================================================

    let volatility =
      "Normal";

    if (atr !== null) {
      const atrPercent =
        (atr /
          currentPrice) *
        100;

      if (
        atrPercent >= 0.8
      ) {
        volatility =
          "High";
      } else if (
        atrPercent <= 0.35
      ) {
        volatility =
          "Low";
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
        trend:
          emaTrend,
      },

      vwap: {
        value: vwap,
        trend:
          vwapTrend,
      },

      rsi: {
        value: rsi,
        trend:
          rsiTrend,
      },

      // Existing MACD
      macd,

      // New 15M MACD intelligence
      macd15m,

      atr: {
        value: atr,
        volatility,
      },

      adx,

      candleCount:
        validCandles.length,

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
        trend:
          "Neutral",
      },

      vwap: {
        value: null,
        trend:
          "Neutral",
      },

      rsi: {
        value: null,
        trend:
          "Neutral",
      },

      macd: {
        macd: null,
        signal: null,
        histogram: null,
        trend:
          "Neutral",
      },

      macd15m: {
        macd: null,
        signal: null,
        histogram: null,

        trend:
          "Neutral",

        direction:
          "Neutral",

        timeframe:
          "15M",

        parameters:
          "12,26,9",

        crossover:
          "Not Available",

        crossoverDetected:
          false,

        crossoverDirection:
          "None",

        confirmation:
          "Not Confirmed",

        momentum:
          "Neutral",

        macdSlope:
          "Neutral",

        histogramSlope:
          "Neutral",

        signalSlope:
          "Neutral",

        zeroLine:
          "Neutral",

        completedCandles:
          0,

        lastCandleClosed:
          false,

        lastCandleTime:
          null,
      },

      atr: {
        value: null,
        volatility:
          "Unknown",
      },

      adx: {
        adx: null,
        plusDI: null,
        minusDI: null,
        trend:
          "Sideways",
      },

      candleCount: 0,

      lastCandle: null,
    };
  }
}