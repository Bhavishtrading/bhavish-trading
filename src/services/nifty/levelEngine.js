// =====================================================
// NIFTY LEVEL ENGINE
// Support / Resistance / Breakout / Breakdown
// =====================================================

export function calculateNiftyLevels(candles = [], currentPrice = 0) {
  try {
    if (!Array.isArray(candles) || candles.length < 10) {
      return {
        support: null,
        resistance: null,
        supportStrength: 0,
        resistanceStrength: 0,
        breakout: false,
        breakdown: false,
        breakoutWatch: false,
        breakdownWatch: false,
        breakoutReference: null,
        breakdownReference: null,
        previousHigh: null,
        previousLow: null,
        latestClose: null,
        latestHigh: null,
        latestLow: null,
        volumeRatio: 0,
        volumeConfirmed: false,
        rangePosition: 50,
        levelBias: "NEUTRAL",
      };
    }

    // =================================================
    // CLEAN CANDLES
    // =================================================

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

    if (validCandles.length < 10) {
      return {
        support: null,
        resistance: null,
        supportStrength: 0,
        resistanceStrength: 0,
        breakout: false,
        breakdown: false,
        breakoutWatch: false,
        breakdownWatch: false,
        breakoutReference: null,
        breakdownReference: null,
        previousHigh: null,
        previousLow: null,
        latestClose: null,
        latestHigh: null,
        latestLow: null,
        volumeRatio: 0,
        volumeConfirmed: false,
        rangePosition: 50,
        levelBias: "NEUTRAL",
      };
    }

    // =================================================
    // LAST 100 CANDLES
    // =================================================

    const recentCandles = validCandles.slice(-100);

    const latestCandle =
      recentCandles[recentCandles.length - 1];

    const previousCandles =
      recentCandles.slice(0, -1);

    const price = Number(currentPrice);

    // =================================================
    // WINDOW HIGH / LOW
    // =================================================

    const windowHigh = Math.max(
      ...recentCandles.map((c) => c.high)
    );

    const windowLow = Math.min(
      ...recentCandles.map((c) => c.low)
    );

    // =================================================
    // PREVIOUS HIGH / LOW
    // Excluding latest candle
    // =================================================

    const previousHigh = Math.max(
      ...previousCandles.map((c) => c.high)
    );

    const previousLow = Math.min(
      ...previousCandles.map((c) => c.low)
    );

    // =================================================
    // LATEST CANDLE
    // =================================================

    const latestClose = latestCandle.close;
    const latestHigh = latestCandle.high;
    const latestLow = latestCandle.low;

    // =================================================
    // SWING HIGH / LOW DETECTION
    // =================================================

    const swingHighs = [];
    const swingLows = [];

    for (let i = 2; i < recentCandles.length - 2; i++) {
      const current = recentCandles[i];

      const left1 = recentCandles[i - 1];
      const left2 = recentCandles[i - 2];

      const right1 = recentCandles[i + 1];
      const right2 = recentCandles[i + 2];

      // Swing High
      if (
        current.high >= left1.high &&
        current.high >= left2.high &&
        current.high >= right1.high &&
        current.high >= right2.high
      ) {
        swingHighs.push(current.high);
      }

      // Swing Low
      if (
        current.low <= left1.low &&
        current.low <= left2.low &&
        current.low <= right1.low &&
        current.low <= right2.low
      ) {
        swingLows.push(current.low);
      }
    }

    // =================================================
    // RESISTANCE CANDIDATES
    // =================================================

    const resistanceCandidates = [
      ...swingHighs,
      previousHigh,
      windowHigh,
    ]
      .filter(
        (level) =>
          Number.isFinite(level) &&
          level >= price
      )
      .sort((a, b) => a - b);

    // =================================================
    // SUPPORT CANDIDATES
    // =================================================

    const supportCandidates = [
      ...swingLows,
      previousLow,
      windowLow,
    ]
      .filter(
        (level) =>
          Number.isFinite(level) &&
          level <= price
      )
      .sort((a, b) => b - a);

    // =================================================
    // NEAREST LEVELS
    // =================================================

    const resistance =
      resistanceCandidates.length > 0
        ? resistanceCandidates[0]
        : windowHigh;

    const support =
      supportCandidates.length > 0
        ? supportCandidates[0]
        : windowLow;

    // =================================================
    // TOUCH / REJECTION ANALYSIS
    // =================================================

    let supportTouches = 0;
    let resistanceTouches = 0;

    let supportRejections = 0;
    let resistanceRejections = 0;

    const supportTolerance = Math.max(
      price * 0.0005,
      5
    );

    const resistanceTolerance = Math.max(
      price * 0.0005,
      5
    );

    for (const candle of recentCandles) {
      // Support touch
      if (
        Math.abs(candle.low - support) <=
        supportTolerance
      ) {
        supportTouches++;

        if (candle.close > candle.open) {
          supportRejections++;
        }
      }

      // Resistance touch
      if (
        Math.abs(candle.high - resistance) <=
        resistanceTolerance
      ) {
        resistanceTouches++;

        if (candle.close < candle.open) {
          resistanceRejections++;
        }
      }
    }

    // =================================================
    // SUPPORT STRENGTH
    // =================================================

    const supportTouchScore = Math.min(
      supportTouches * 10,
      40
    );

    const supportRejectionScore = Math.min(
      supportRejections * 10,
      30
    );

    const supportAgeScore =
      supportTouches > 0 ? 20 : 0;

    const supportStrength = Math.min(
      supportTouchScore +
        supportRejectionScore +
        supportAgeScore,
      100
    );

    // =================================================
    // RESISTANCE STRENGTH
    // =================================================

    const resistanceTouchScore = Math.min(
      resistanceTouches * 10,
      40
    );

    const resistanceRejectionScore = Math.min(
      resistanceRejections * 10,
      30
    );

    const resistanceAgeScore =
      resistanceTouches > 0 ? 20 : 0;

    const resistanceStrength = Math.min(
      resistanceTouchScore +
        resistanceRejectionScore +
        resistanceAgeScore,
      100
    );

    // =================================================
// VOLUME ANALYSIS
// =================================================

const volumeLookback =
  recentCandles.slice(-21, -1);

const volumes = volumeLookback
  .map((c) => Number(c.volume))
  .filter(
    (v) =>
      Number.isFinite(v) &&
      v > 0
  );

const averageVolume =
  volumes.length > 0
    ? volumes.reduce(
        (sum, value) => sum + value,
        0
      ) / volumes.length
    : null;

const latestVolume =
  Number(latestCandle.volume) || null;

const volumeAvailable =
  averageVolume !== null &&
  latestVolume !== null &&
  averageVolume > 0 &&
  latestVolume > 0;

const volumeRatio =
  volumeAvailable
    ? latestVolume / averageVolume
    : null;

const volumeConfirmed =
  volumeAvailable &&
  volumeRatio >= 1.2;
    // =================================================
    // BREAKOUT REFERENCE
    // Previous candles only
    // =================================================

    const breakoutReference = Math.max(
      ...previousCandles.map((c) => c.high)
    );

    const breakdownReference = Math.min(
      ...previousCandles.map((c) => c.low)
    );

    // =================================================
    // BREAKOUT CONDITIONS
    // =================================================

    const priceAboveBreakoutReference =
      price > breakoutReference;

    const candleClosedAboveBreakoutReference =
      latestClose > breakoutReference;

    const breakout =
      priceAboveBreakoutReference &&
      candleClosedAboveBreakoutReference &&
      volumeConfirmed;

    // =================================================
    // BREAKDOWN CONDITIONS
    // =================================================

    const priceBelowBreakdownReference =
      price < breakdownReference;

    const candleClosedBelowBreakdownReference =
      latestClose < breakdownReference;

    const breakdown =
      priceBelowBreakdownReference &&
      candleClosedBelowBreakdownReference &&
      volumeConfirmed;

    // =================================================
    // BREAKOUT WATCH
    // =================================================

    const breakoutWatch =
      !breakout &&
      price >= breakoutReference &&
      latestHigh >= breakoutReference;

    // =================================================
    // BREAKDOWN WATCH
    // =================================================

    const breakdownWatch =
      !breakdown &&
      price <= breakdownReference &&
      latestLow <= breakdownReference;

    // =================================================
    // RANGE POSITION
    // =================================================

    const range =
      windowHigh - windowLow;

    const rangePosition =
      range > 0
        ? Math.max(
            0,
            Math.min(
              100,
              ((price - windowLow) / range) *
                100
            )
          )
        : 50;

    // =================================================
    // LEVEL BIAS
    // =================================================

    let levelBias = "NEUTRAL";

    if (breakout) {
      levelBias = "BULLISH BREAKOUT";
    } else if (breakdown) {
      levelBias = "BEARISH BREAKDOWN";
    } else if (
      resistanceStrength >= 70 &&
      price >= resistance - resistanceTolerance
    ) {
      levelBias = "RESISTANCE";
    } else if (
      supportStrength >= 70 &&
      price <= support + supportTolerance
    ) {
      levelBias = "SUPPORT";
    } else if (rangePosition >= 70) {
      levelBias = "UPPER RANGE";
    } else if (rangePosition <= 30) {
      levelBias = "LOWER RANGE";
    }

    // =================================================
    // DISTANCES
    // =================================================

    const supportDistance =
      support !== null
        ? price - support
        : null;

    const resistanceDistance =
      resistance !== null
        ? resistance - price
        : null;

    // =================================================
    // RESULT
    // =================================================

    return {
      support,
      resistance,

      supportStrength,
      resistanceStrength,

      supportTouches,
      resistanceTouches,

      supportRejections,
      resistanceRejections,

      supportDistance,
      resistanceDistance,

      windowHigh,
      windowLow,

      previousHigh,
      previousLow,

      latestClose,
      latestHigh,
      latestLow,

      breakoutReference,
      breakdownReference,

      priceAboveBreakoutReference,
      candleClosedAboveBreakoutReference,

      priceBelowBreakdownReference,
      candleClosedBelowBreakdownReference,

      breakout,
      breakdown,

      breakoutWatch,
      breakdownWatch,

      volumeRatio,
      volumeConfirmed,

      rangePosition,
      levelBias,
    };
  } catch (error) {
    console.error(
      "NIFTY LEVEL ENGINE ERROR ================="
    );
    console.error(error);

    return {
      support: null,
      resistance: null,
      supportStrength: 0,
      resistanceStrength: 0,
      breakout: false,
      breakdown: false,
      breakoutWatch: false,
      breakdownWatch: false,
      breakoutReference: null,
      breakdownReference: null,
      previousHigh: null,
      previousLow: null,
      latestClose: null,
      latestHigh: null,
      latestLow: null,
      volumeRatio: 0,
      volumeConfirmed: false,
      rangePosition: 50,
      levelBias: "NEUTRAL",
    };
  }
}