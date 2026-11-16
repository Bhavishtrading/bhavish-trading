
import { analyzeBreakoutRetest } from "../breakoutRetestEngine.js";

const FIVE_MINUTES = 5 * 60 * 1000;

function createCandle(index, { open, high, low, close }) {
  return {
    date: new Date(
      Date.now() - (20 - index) * FIVE_MINUTES
    ).toISOString(),
    open,
    high,
    low,
    close,
  };
}

function createBaseCandles(length = 10) {
  return Array.from({ length }, (_, index) =>
    createCandle(index, {
      open: 100,
      high: 105,
      low: 95,
      close: 100,
    })
  );
}

const structure = {
  success: true,
  latestSwings: {
    latestHigh: { price: 110 },
    latestLow: { price: 90 },
  },
};

function runTest(name, candles, expectedDirection, expectedStatus) {
  const result = analyzeBreakoutRetest({
    candles,
    structure,
    atr: { atr: 10 },
  });

  const actualDirection = result.breakout?.direction;
  const actualStatus = result.breakout?.status;

  const passed =
    result.success &&
    actualDirection === expectedDirection &&
    actualStatus === expectedStatus;

  console.log(`${passed ? "PASS" : "FAIL"}: ${name}`, {
    expected: {
      direction: expectedDirection,
      status: expectedStatus,
    },
    actual: result.breakout ?? result,
  });

  return passed;
}

// Original bullish breakout and immediate retest.
function createImmediateBullishRetest() {
  const candles = createBaseCandles();

  candles[8] = createCandle(8, {
    open: 111,
    high: 115,
    low: 110,
    close: 113,
  });

  candles[9] = createCandle(9, {
    open: 111,
    high: 113,
    low: 109.6,
    close: 112,
  });

  return candles;
}

// Original bearish breakdown and immediate retest.
function createImmediateBearishRetest() {
  const candles = createBaseCandles();

  candles[8] = createCandle(8, {
    open: 89,
    high: 90,
    low: 85,
    close: 87,
  });

  candles[9] = createCandle(9, {
    open: 89.8,
    high: 90.4,
    low: 87,
    close: 88.8,
  });

  return candles;
}

// Create a breakout followed by a retest after N candles.
function createDelayedRetest(direction, retestAfter) {
  const candles = createBaseCandles(9);

  if (direction === "BULLISH") {
    candles[8] = createCandle(8, {
      open: 111,
      high: 115,
      low: 110,
      close: 113,
    });

    for (let elapsed = 1; elapsed < retestAfter; elapsed++) {
      candles.push(
        createCandle(8 + elapsed, {
          open: 112,
          high: 115,
          low: 111,
          close: 114,
        })
      );
    }

    candles.push(
      createCandle(8 + retestAfter, {
        open: 111,
        high: 113,
        low: 109.6,
        close: 112,
      })
    );
  } else {
    candles[8] = createCandle(8, {
      open: 89,
      high: 90,
      low: 85,
      close: 87,
    });

    for (let elapsed = 1; elapsed < retestAfter; elapsed++) {
      candles.push(
        createCandle(8 + elapsed, {
          open: 87,
          high: 88,
          low: 85,
          close: 86,
        })
      );
    }

    candles.push(
      createCandle(8 + retestAfter, {
        open: 89.8,
        high: 90.4,
        low: 87,
        close: 88.8,
      })
    );
  }

  return candles;
}

// Breakout with no retest for five completed candles.
function createExpiredScenario() {
  const candles = createBaseCandles(9);

  candles[8] = createCandle(8, {
    open: 111,
    high: 115,
    low: 110,
    close: 113,
  });

  for (let index = 9; index <= 13; index++) {
    candles.push(
      createCandle(index, {
        open: 112,
        high: 115,
        low: 111,
        close: 114,
      })
    );
  }

  return candles;
}

// Price closes back below resistance before retesting.
function createInvalidatedScenario() {
  const candles = createBaseCandles();

  candles[8] = createCandle(8, {
    open: 111,
    high: 115,
    low: 110,
    close: 113,
  });

  candles[9] = createCandle(9, {
    open: 111,
    high: 112,
    low: 108,
    close: 109,
  });

  return candles;
}

// Original failed bullish breakout.
const failedCandles = createBaseCandles();

failedCandles[9] = createCandle(9, {
  open: 109,
  high: 112,
  low: 108,
  close: 109,
});

// Original no-breakout scenario.
const waitingCandles = createBaseCandles();

const results = [
  // Original tests
  runTest(
    "Immediate bullish breakout and retest",
    createImmediateBullishRetest(),
    "BULLISH",
    "CONFIRMED"
  ),

  runTest(
    "Immediate bearish breakdown and retest",
    createImmediateBearishRetest(),
    "BEARISH",
    "CONFIRMED"
  ),

  runTest(
    "Failed bullish breakout",
    failedCandles,
    "BULLISH",
    "AVOID"
  ),

  runTest(
    "No breakout",
    waitingCandles,
    "NONE",
    "WAITING"
  ),

  // Multi-candle retest tests
  runTest(
    "Bullish retest on 2nd candle",
    createDelayedRetest("BULLISH", 2),
    "BULLISH",
    "CONFIRMED"
  ),

  runTest(
    "Bearish retest on 3rd candle",
    createDelayedRetest("BEARISH", 3),
    "BEARISH",
    "CONFIRMED"
  ),

  runTest(
    "Bullish retest on 4th candle",
    createDelayedRetest("BULLISH", 4),
    "BULLISH",
    "CONFIRMED"
  ),

  runTest(
    "Bearish retest on 5th candle",
    createDelayedRetest("BEARISH", 5),
    "BEARISH",
    "CONFIRMED"
  ),

  runTest(
    "No retest within 5 candles",
    createExpiredScenario(),
    "BULLISH",
    "EXPIRED"
  ),

  runTest(
    "Price invalidates breakout before retest",
    createInvalidatedScenario(),
    "BULLISH",
    "AVOID"
  ),
];

const passed = results.filter(Boolean).length;
const total = results.length;

console.log(`\nTEST SUMMARY: ${passed}/${total} passed`);

if (passed !== total) {
  throw new Error("Breakout Retest tests failed");
}
