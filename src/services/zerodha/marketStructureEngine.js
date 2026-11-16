
const CANDLE_INTERVAL_MS = 5 * 60 * 1000;

const DEFAULT_LEFT_BARS = 2;
const DEFAULT_RIGHT_BARS = 2;

function getTimestamp(candle) {
  const timestamp = new Date(candle?.date).getTime();

  return Number.isFinite(timestamp) ? timestamp : null;
}

function isValidCandle(candle) {
  const open = Number(candle?.open);
  const high = Number(candle?.high);
  const low = Number(candle?.low);
  const close = Number(candle?.close);

  return (
    [open, high, low, close].every(Number.isFinite) &&
    high >= low &&
    high >= open &&
    high >= close &&
    low <= open &&
    low <= close
  );
}

function isCompletedCandle(candle, now) {
  const timestamp = getTimestamp(candle);

  return (
    timestamp !== null &&
    timestamp + CANDLE_INTERVAL_MS <= now
  );
}

function findConfirmedSwings(
  candles,
  leftBars = DEFAULT_LEFT_BARS,
  rightBars = DEFAULT_RIGHT_BARS
) {
  const swingHighs = [];
  const swingLows = [];

  for (
    let i = leftBars;
    i < candles.length - rightBars;
    i++
  ) {
    const current = candles[i];

    const left = candles.slice(i - leftBars, i);
    const right = candles.slice(i + 1, i + rightBars + 1);

    const currentHigh = Number(current.high);
    const currentLow = Number(current.low);

    const isSwingHigh =
      left.every((candle) => currentHigh > Number(candle.high)) &&
      right.every((candle) => currentHigh > Number(candle.high));

    const isSwingLow =
      left.every((candle) => currentLow < Number(candle.low)) &&
      right.every((candle) => currentLow < Number(candle.low));

    if (isSwingHigh) {
      swingHighs.push({
        index: i,
        price: currentHigh,
        date: current.date,
      });
    }

    if (isSwingLow) {
      swingLows.push({
        index: i,
        price: currentLow,
        date: current.date,
      });
    }
  }

  return {
    swingHighs,
    swingLows,
  };
}

function compareLastTwoSwings(swings) {
  if (!Array.isArray(swings) || swings.length < 2) {
    return "INSUFFICIENT";
  }

  const previous = swings[swings.length - 2];
  const latest = swings[swings.length - 1];

  if (latest.price > previous.price) return "HIGHER";
  if (latest.price < previous.price) return "LOWER";

  return "EQUAL";
}

export function analyzeMarketStructure({
  candles = [],
  leftBars = DEFAULT_LEFT_BARS,
  rightBars = DEFAULT_RIGHT_BARS,
} = {}) {
  const now = Date.now();

  if (
    !Array.isArray(candles) ||
    !Number.isInteger(leftBars) ||
    !Number.isInteger(rightBars) ||
    leftBars < 1 ||
    rightBars < 1
  ) {
    return {
      success: false,
      message: "Invalid candles or swing settings",
    };
  }

  const completedCandles = candles
    .filter((candle) => isCompletedCandle(candle, now))
    .filter(isValidCandle)
    .sort((a, b) => getTimestamp(a) - getTimestamp(b));

  const {
    swingHighs,
    swingLows,
  } = findConfirmedSwings(
    completedCandles,
    leftBars,
    rightBars
  );

  const highStructure = compareLastTwoSwings(swingHighs);
  const lowStructure = compareLastTwoSwings(swingLows);

  let structure = "UNKNOWN";

  if (
    highStructure === "HIGHER" &&
    lowStructure === "HIGHER"
  ) {
    structure = "BULLISH_STRUCTURE";
  } else if (
    highStructure === "LOWER" &&
    lowStructure === "LOWER"
  ) {
    structure = "BEARISH_STRUCTURE";
  } else if (
    highStructure !== "INSUFFICIENT" &&
    lowStructure !== "INSUFFICIENT"
  ) {
    structure = "MIXED_STRUCTURE";
  }

  return {
    success: true,
    timeframe: "5minute",

    structure,

    swingAnalysis: {
      highStructure,
      lowStructure,
      leftBars,
      rightBars,
    },

    latestSwings: {
      previousHigh: swingHighs.at(-2) || null,
      latestHigh: swingHighs.at(-1) || null,
      previousLow: swingLows.at(-2) || null,
      latestLow: swingLows.at(-1) || null,
    },

    diagnostics: {
      completedCandles: completedCandles.length,
      detectedSwingHighs: swingHighs.length,
      detectedSwingLows: swingLows.length,
      confirmationDelayCandles: rightBars,
      latestCandle:
        completedCandles.at(-1)?.date || null,
    },
  };
}
