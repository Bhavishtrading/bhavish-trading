// =====================================================
// CRUDE OIL PRO SUPPORT / RESISTANCE ENGINE V2
// Breakout / Breakdown Confirmation
// =====================================================

export function calculateCrudeLevels(candles, price) {
  if (!Array.isArray(candles) || candles.length < 20) {
    throw new Error("Minimum candle data required");
  }

  const currentPrice = Number(price);

  if (!Number.isFinite(currentPrice)) {
    throw new Error("Valid price is required");
  }

  // =====================================================
  // RECENT DATA
  // =====================================================

  const recentCandles = candles.slice(-100);

  const validCandles = recentCandles.filter(
    (c) =>
      Number.isFinite(Number(c.high)) &&
      Number.isFinite(Number(c.low)) &&
      Number.isFinite(Number(c.close))
  );

  if (validCandles.length < 20) {
    throw new Error("Insufficient valid candle data");
  }

  // =====================================================
  // WINDOW HIGH / LOW
  // =====================================================

  const windowHigh = Math.max(
    ...validCandles.map((c) => Number(c.high))
  );

  const windowLow = Math.min(
    ...validCandles.map((c) => Number(c.low))
  );

  // =====================================================
  // SWING HIGH / LOW
  // =====================================================

  const swingHighs = [];
  const swingLows = [];

  for (let i = 2; i < validCandles.length - 2; i++) {
    const candle = validCandles[i];

    const high = Number(candle.high);
    const low = Number(candle.low);

    const prevHigh1 = Number(validCandles[i - 1].high);
    const prevHigh2 = Number(validCandles[i - 2].high);

    const nextHigh1 = Number(validCandles[i + 1].high);
    const nextHigh2 = Number(validCandles[i + 2].high);

    const prevLow1 = Number(validCandles[i - 1].low);
    const prevLow2 = Number(validCandles[i - 2].low);

    const nextLow1 = Number(validCandles[i + 1].low);
    const nextLow2 = Number(validCandles[i + 2].low);

    if (
      high > prevHigh1 &&
      high > prevHigh2 &&
      high >= nextHigh1 &&
      high >= nextHigh2
    ) {
      swingHighs.push({
        price: high,
        index: i,
      });
    }

    if (
      low < prevLow1 &&
      low < prevLow2 &&
      low <= nextLow1 &&
      low <= nextLow2
    ) {
      swingLows.push({
        price: low,
        index: i,
      });
    }
  }

  // =====================================================
  // RESISTANCE
  // =====================================================

  const resistanceCandidates = [
    ...swingHighs.map((x) => x.price),
    windowHigh,
  ]
    .filter((level) => level > currentPrice)
    .sort((a, b) => a - b);

  const resistance =
    resistanceCandidates.length > 0
      ? resistanceCandidates[0]
      : windowHigh;

  // =====================================================
  // SUPPORT
  // =====================================================

  const supportCandidates = [
    ...swingLows.map((x) => x.price),
    windowLow,
  ]
    .filter((level) => level < currentPrice)
    .sort((a, b) => b - a);

  const support =
    supportCandidates.length > 0
      ? supportCandidates[0]
      : windowLow;

  // =====================================================
  // DISTANCE
  // =====================================================

  const supportDistance = Number(
    (currentPrice - support).toFixed(2)
  );

  const resistanceDistance = Number(
    (resistance - currentPrice).toFixed(2)
  );

  const supportDistancePercent =
    currentPrice > 0
      ? Number(
          ((supportDistance / currentPrice) * 100).toFixed(2)
        )
      : 0;

  const resistanceDistancePercent =
    currentPrice > 0
      ? Number(
          ((resistanceDistance / currentPrice) * 100).toFixed(2)
        )
      : 0;

  const nearSupport =
    supportDistancePercent <= 0.30;

  const nearResistance =
    resistanceDistancePercent <= 0.30;

  // =====================================================
  // TOUCH / REJECTION
  // =====================================================

  const supportTolerance = Math.max(
    currentPrice * 0.0015,
    2
  );

  const resistanceTolerance = Math.max(
    currentPrice * 0.0015,
    2
  );

  let supportTouches = 0;
  let resistanceTouches = 0;

  let supportRejections = 0;
  let resistanceRejections = 0;

  for (const candle of validCandles) {
    const high = Number(candle.high);
    const low = Number(candle.low);
    const open = Number(candle.open);
    const close = Number(candle.close);

    if (
      Number.isFinite(low) &&
      Math.abs(low - support) <= supportTolerance
    ) {
      supportTouches++;

      if (
        Number.isFinite(open) &&
        Number.isFinite(close) &&
        close > open
      ) {
        supportRejections++;
      }
    }

    if (
      Number.isFinite(high) &&
      Math.abs(high - resistance) <= resistanceTolerance
    ) {
      resistanceTouches++;

      if (
        Number.isFinite(open) &&
        Number.isFinite(close) &&
        close < open
      ) {
        resistanceRejections++;
      }
    }
  }

  // =====================================================
  // VOLUME
  // =====================================================

  const volumes = validCandles
    .map((c) => Number(c.volume))
    .filter(Number.isFinite);

  let volumeRatio = 1;

  if (volumes.length > 1) {
    const previousVolumes = volumes.slice(0, -1);

    const averageVolume =
      previousVolumes.reduce(
        (sum, value) => sum + value,
        0
      ) / previousVolumes.length;

    const latestVolume =
      volumes[volumes.length - 1];

    if (averageVolume > 0) {
      volumeRatio =
        latestVolume / averageVolume;
    }
  }

  const volumeConfirmed =
    volumeRatio >= 1.20;

  // =====================================================
  // STRENGTH
  // =====================================================

  const supportTouchScore = Math.min(
    supportTouches * 10,
    30
  );

  const resistanceTouchScore = Math.min(
    resistanceTouches * 10,
    30
  );

  const supportRejectionScore = Math.min(
    supportRejections * 10,
    25
  );

  const resistanceRejectionScore = Math.min(
    resistanceRejections * 10,
    25
  );

  const supportProximityScore =
    nearSupport ? 20 : 0;

  const resistanceProximityScore =
    nearResistance ? 20 : 0;

  const volumeStrength = Math.min(
    volumeRatio * 25,
    25
  );

  const supportStrength = Math.min(
    Math.round(
      supportTouchScore +
      supportRejectionScore +
      supportProximityScore +
      volumeStrength
    ),
    100
  );

  const resistanceStrength = Math.min(
    Math.round(
      resistanceTouchScore +
      resistanceRejectionScore +
      resistanceProximityScore +
      volumeStrength
    ),
    100
  );

// =====================================================
// BREAKOUT / BREAKDOWN
// STEP 8
// Previous candle structure is used as fixed reference
// Existing S/R formula remains unchanged
// =====================================================

const previousCandles =
  validCandles.slice(0, -1);

const latestCandle =
  validCandles[validCandles.length - 1];

// -----------------------------------------------------
// PREVIOUS HIGH / LOW
// Latest candle excluded
// -----------------------------------------------------

const previousHigh = Math.max(
  ...previousCandles.map(
    (c) => Number(c.high)
  )
);

const previousLow = Math.min(
  ...previousCandles.map(
    (c) => Number(c.low)
  )
);

const latestClose =
  Number(latestCandle.close);

const latestHigh =
  Number(latestCandle.high);

const latestLow =
  Number(latestCandle.low);

// =====================================================
// FIXED BREAKOUT REFERENCE
// =====================================================

// Highest resistance from previous candles
const breakoutReference =
  Math.max(
    ...previousCandles.map(
      (c) => Number(c.high)
    )
  );

// Lowest support from previous candles
const breakdownReference =
  Math.min(
    ...previousCandles.map(
      (c) => Number(c.low)
    )
  );

// =====================================================
// BREAKOUT
// Price + Candle Close + Volume
// =====================================================

const priceAboveBreakoutReference =
  currentPrice > breakoutReference;

const candleClosedAboveBreakoutReference =
  latestClose > breakoutReference;

const breakout =
  priceAboveBreakoutReference &&
  candleClosedAboveBreakoutReference &&
  volumeConfirmed;

// =====================================================
// BREAKDOWN
// Price + Candle Close + Volume
// =====================================================

const priceBelowBreakdownReference =
  currentPrice < breakdownReference;

const candleClosedBelowBreakdownReference =
  latestClose < breakdownReference;

const breakdown =
  priceBelowBreakdownReference &&
  candleClosedBelowBreakdownReference &&
  volumeConfirmed;

// =====================================================
// BREAKOUT WATCH
// =====================================================

const breakoutWatch =
  !breakout &&
  currentPrice >= breakoutReference &&
  latestHigh >= breakoutReference;

// =====================================================
// BREAKDOWN WATCH
// =====================================================

const breakdownWatch =
  !breakdown &&
  currentPrice <= breakdownReference &&
  latestLow <= breakdownReference;
// =====================================================
// NEXT CANDLE HOLD CONFIRMATION
// =====================================================

// Need at least 2 candles:
// 1. Breakout / Breakdown candle
// 2. Next confirmation candle

let nextCandleHold = false;
let nextCandleBreakdownHold = false;

if (validCandles.length >= 2) {

  const breakoutCandle =
    validCandles[validCandles.length - 2];

  const confirmationCandle =
    validCandles[validCandles.length - 1];

  const breakoutCandleClose =
    Number(breakoutCandle.close);

  const confirmationCandleClose =
    Number(confirmationCandle.close);

  // ---------------------------------------------------
  // BREAKOUT HOLD
  // Previous candle closed above breakout reference
  // AND next candle also holds above it
  // ---------------------------------------------------

  nextCandleHold =
    breakoutCandleClose > breakoutReference &&
    confirmationCandleClose > breakoutReference;

  // ---------------------------------------------------
  // BREAKDOWN HOLD
  // Previous candle closed below breakdown reference
  // AND next candle also holds below it
  // ---------------------------------------------------

  nextCandleBreakdownHold =
    breakoutCandleClose < breakdownReference &&
    confirmationCandleClose < breakdownReference;
}
  // =====================================================
  // RANGE POSITION
  // =====================================================

  const range =
    windowHigh - windowLow;

  let rangePosition = 50;

  if (range > 0) {
    rangePosition = Number(
      (
        ((currentPrice - windowLow) / range) *
        100
      ).toFixed(2)
    );
  }

  // =====================================================
  // LEVEL BIAS
  // =====================================================

  let levelBias = "NEUTRAL";

  if (nearSupport && !nearResistance) {
    levelBias = "SUPPORT_ZONE";
  } else if (
    nearResistance &&
    !nearSupport
  ) {
    levelBias = "RESISTANCE_ZONE";
  } else if (
    nearSupport &&
    nearResistance
  ) {
    levelBias = "TIGHT_RANGE";
  }

  // =====================================================
  // RETURN
  // =====================================================

  return {
    support: Number(
      support.toFixed(2)
    ),

    resistance: Number(
      resistance.toFixed(2)
    ),

    windowHigh: Number(
      windowHigh.toFixed(2)
    ),

    windowLow: Number(
      windowLow.toFixed(2)
    ),

    previousHigh: Number(
      previousHigh.toFixed(2)
    ),

    previousLow: Number(
      previousLow.toFixed(2)
    ),
    breakoutReference: Number(
  breakoutReference.toFixed(2)
),

breakdownReference: Number(
  breakdownReference.toFixed(2)
),

    supportDistance,
    resistanceDistance,

    supportDistancePercent,
    resistanceDistancePercent,

    nearSupport,
    nearResistance,

    supportTouches,
    resistanceTouches,

    supportRejections,
    resistanceRejections,

    supportStrength,
    resistanceStrength,

    volumeRatio: Number(
      volumeRatio.toFixed(2)
    ),

    volumeConfirmed,

    latestClose,
    latestHigh,
    latestLow,

    breakout,
    breakdown,

    breakoutWatch,
    breakdownWatch,
    nextCandleHold,
    nextCandleBreakdownHold,

    rangePosition,

    levelBias,

    swingHighCount:
      swingHighs.length,

    swingLowCount:
      swingLows.length,
  };
}