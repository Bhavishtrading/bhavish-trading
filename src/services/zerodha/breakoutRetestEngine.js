
const CANDLE_INTERVAL_MS = 5 * 60 * 1000;

const RETEST_WINDOW_CANDLES = 5;

function getTime(candle) {
  const time = new Date(candle?.date).getTime();
  return Number.isFinite(time) ? time : null;
}

function isValidCandle(candle) {
  const open = Number(candle?.open);
  const high = Number(candle?.high);
  const low = Number(candle?.low);
  const close = Number(candle?.close);

  return (
    [open, high, low, close].every(Number.isFinite) &&
    high >= Math.max(open, close) &&
    low <= Math.min(open, close)
  );
}

function isCompleted(candle, now) {
  const time = getTime(candle);

  return time !== null && time + CANDLE_INTERVAL_MS <= now;
}

function getBody(candle) {
  return Math.abs(Number(candle.close) - Number(candle.open));
}

function getUpperWick(candle) {
  return Number(candle.high) -
    Math.max(Number(candle.open), Number(candle.close));
}

function getLowerWick(candle) {
  return Math.min(Number(candle.open), Number(candle.close)) -
    Number(candle.low);
}

function createResult({
  direction,
  status,
  reason,
  latest,
  support,
  resistance,
  buffer,
  completedCandles,
  breakoutCandle = null,
  retestCandle = null,
  candlesElapsed = 0,
  bullishBreakout = false,
  bearishBreakout = false,
  bullishRetest = false,
  bearishRetest = false,
  bullishRejection = false,
  bearishRejection = false,
}) {
  return {
    success: true,
    timeframe: "5minute",

    breakout: {
      direction,
      status,
      reason,
      breakoutCandle: breakoutCandle?.date || null,
      retestCandle: retestCandle?.date || null,
      candlesElapsed,
      retestWindow: RETEST_WINDOW_CANDLES,
    },

    levels: {
      support,
      resistance,
      buffer: Number(buffer.toFixed(2)),
    },

    candle: {
      date: latest.date,
      open: Number(latest.open),
      high: Number(latest.high),
      low: Number(latest.low),
      close: Number(latest.close),
    },

    diagnostics: {
      completedCandles: completedCandles.length,
      bullishBreakout,
      bearishBreakout,
      bullishRetest,
      bearishRetest,
      bullishRejection,
      bearishRejection,
      confirmationRequiresLaterRetest: true,
      retestWindowCandles: RETEST_WINDOW_CANDLES,
    },
  };
}

export function analyzeBreakoutRetest({
  candles = [],
  structure = null,
  atr = null,
} = {}) {
  const now = Date.now();

  if (!Array.isArray(candles)) {
    return {
      success: false,
      message: "Candles must be an array",
    };
  }

  const completedCandles = candles
    .filter((candle) => isCompleted(candle, now))
    .filter(isValidCandle)
    .sort((a, b) => getTime(a) - getTime(b));

  if (completedCandles.length < 10) {
    return {
      success: false,
      message: "At least 10 completed candles are required",
      availableCandles: completedCandles.length,
    };
  }

  const latest = completedCandles.at(-1);

  const swingHigh = structure?.latestSwings?.latestHigh?.price;
  const swingLow = structure?.latestSwings?.latestLow?.price;

  if (
    !Number.isFinite(swingHigh) ||
    !Number.isFinite(swingLow)
  ) {
    return {
      success: false,
      message: "Confirmed swing high and low are required",
      status: "WAITING",
    };
  }

  const atrValue = Number(atr?.atr);

  const buffer =
    Number.isFinite(atrValue) && atrValue > 0
      ? atrValue * 0.05
      : 0;

  const support = Number(swingLow);
  const resistance = Number(swingHigh);

  // Only inspect breakout events that can still be
  // inside the current 5-candle retest window.
  const firstCandidateIndex = Math.max(
    1,
    completedCandles.length - RETEST_WINDOW_CANDLES - 1
  );

  let latestBreakout = null;

  for (
    let i = firstCandidateIndex;
    i < completedCandles.length;
    i++
  ) {
    const current = completedCandles[i];
    const previous = completedCandles[i - 1];

    const currentClose = Number(current.close);
    const previousClose = Number(previous.close);

    const bullishBreakout =
      currentClose > resistance + buffer &&
      previousClose <= resistance + buffer;

    const bearishBreakout =
      currentClose < support - buffer &&
      previousClose >= support - buffer;

    if (bullishBreakout || bearishBreakout) {
      latestBreakout = {
        index: i,
        direction: bullishBreakout ? "BULLISH" : "BEARISH",
        candle: current,
      };
    }
  }

  // No fresh breakout found in the active window.
  if (!latestBreakout) {
    const latestHigh = Number(latest.high);
    const latestLow = Number(latest.low);
    const latestClose = Number(latest.close);

    const failedBullishBreakout =
      latestHigh > resistance + buffer &&
      latestClose <= resistance;

    const failedBearishBreakout =
      latestLow < support - buffer &&
      latestClose >= support;

    if (failedBullishBreakout || failedBearishBreakout) {
      return createResult({
        direction: failedBullishBreakout ? "BULLISH" : "BEARISH",
        status: "AVOID",
        reason: "Possible failed breakout; price closed back inside level",
        latest,
        support,
        resistance,
        buffer,
        completedCandles,
      });
    }

    return createResult({
      direction: "NONE",
      status: "WAITING",
      reason: "No confirmed breakout detected",
      latest,
      support,
      resistance,
      buffer,
      completedCandles,
    });
  }

  const direction = latestBreakout.direction;
  const breakoutIndex = latestBreakout.index;
  const breakoutCandle = latestBreakout.candle;

  const candlesElapsed =
    completedCandles.length - 1 - breakoutIndex;

  // Inspect only candles AFTER the breakout candle.
  for (
    let i = breakoutIndex + 1;
    i < completedCandles.length;
    i++
  ) {
    const candle = completedCandles[i];

    const open = Number(candle.open);
    const high = Number(candle.high);
    const low = Number(candle.low);
    const close = Number(candle.close);

    const body = getBody(candle);

    if (direction === "BULLISH") {
      // Closing back inside resistance invalidates the setup.
      if (close <= resistance) {
        return createResult({
          direction,
          status: "AVOID",
          reason: "Price closed back below breakout resistance",
          latest,
          support,
          resistance,
          buffer,
          completedCandles,
          breakoutCandle,
          candlesElapsed,
        });
      }

      const bullishRetest =
        low <= resistance + buffer &&
        low >= resistance - buffer &&
        close > resistance &&
        close > open;

      const bullishRejection =
        bullishRetest &&
        getLowerWick(candle) > body * 0.5;

      if (bullishRetest && bullishRejection) {
        return createResult({
          direction,
          status: "CONFIRMED",
          reason: "Bullish breakout retest with rejection",
          latest,
          support,
          resistance,
          buffer,
          completedCandles,
          breakoutCandle,
          retestCandle: candle,
          candlesElapsed,
          bullishRetest: true,
          bullishRejection: true,
        });
      }
    }

    if (direction === "BEARISH") {
      // Closing back above support invalidates the setup.
      if (close >= support) {
        return createResult({
          direction,
          status: "AVOID",
          reason: "Price closed back above breakdown support",
          latest,
          support,
          resistance,
          buffer,
          completedCandles,
          breakoutCandle,
          candlesElapsed,
        });
      }

      const bearishRetest =
        high >= support - buffer &&
        high <= support + buffer &&
        close < support &&
        close < open;

      const bearishRejection =
        bearishRetest &&
        getUpperWick(candle) > body * 0.5;

      if (bearishRetest && bearishRejection) {
        return createResult({
          direction,
          status: "CONFIRMED",
          reason: "Bearish breakdown retest with rejection",
          latest,
          support,
          resistance,
          buffer,
          completedCandles,
          breakoutCandle,
          retestCandle: candle,
          candlesElapsed,
          bearishRetest: true,
          bearishRejection: true,
        });
      }
    }
  }

  if (candlesElapsed >= RETEST_WINDOW_CANDLES) {
    return createResult({
      direction,
      status: "EXPIRED",
      reason: "No valid retest and rejection within 5 completed candles",
      latest,
      support,
      resistance,
      buffer,
      completedCandles,
      breakoutCandle,
      candlesElapsed,
    });
  }

  return createResult({
    direction,
    status: "RETEST_PENDING",
    reason: `Breakout detected; waiting for retest (${candlesElapsed}/${RETEST_WINDOW_CANDLES} candles)`,
    latest,
    support,
    resistance,
    buffer,
    completedCandles,
    breakoutCandle,
    candlesElapsed,
  });
}
