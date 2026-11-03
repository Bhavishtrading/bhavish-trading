
import { KiteTicker } from "kiteconnect";

const VIX_TOKEN = 264969;
const NIFTY_TOKEN = 256265;

const STREAM_KEY = "__BHAVISH_VIX_STREAM__";

const MAX_HISTORY = 3600;
const SAMPLE_INTERVAL_MS = 1000;

// Custom research thresholds — not official classifications.
const VIX_SPIKE_THRESHOLD = 0.5;
const VIX_STRONG_SPIKE_THRESHOLD = 1.0;

// ======================================================
// GLOBAL STREAM STATE
// ======================================================

function getState() {
  if (!globalThis[STREAM_KEY]) {
    globalThis[STREAM_KEY] = {
      ticker: null,
      status: "stopped",
      connected: false,
      vix: null,
      nifty: null,
      lastUpdate: null,
      error: null,
      history: {
        vix: [],
        nifty: [],
      },
    };
  }

  const state = globalThis[STREAM_KEY];

  if (!state.history) {
    state.history = {
      vix: [],
      nifty: [],
    };
  }

  return state;
}

// ======================================================
// TIMESTAMP
// ======================================================

function getTimestamp(value) {
  if (!value) return Date.now();

  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp)
    ? timestamp
    : Date.now();
}

// ======================================================
// STORE LIVE PRICE HISTORY
// ======================================================

function storeSample(history, price, timestamp) {
  if (!Number.isFinite(price)) return;

  const last = history[history.length - 1];

  if (
    last &&
    timestamp - last.timestamp < SAMPLE_INTERVAL_MS
  ) {
    return;
  }

  history.push({
    price,
    timestamp,
  });

  if (history.length > MAX_HISTORY) {
    history.splice(
      0,
      history.length - MAX_HISTORY
    );
  }
}

// ======================================================
// FIND HISTORICAL REFERENCE PRICE
// ======================================================

function findReference(
  history,
  targetTimestamp,
  toleranceMs
) {
  let closest = null;
  let smallestDifference = Infinity;

  for (let i = history.length - 1; i >= 0; i--) {
    const sample = history[i];

    const difference = Math.abs(
      sample.timestamp - targetTimestamp
    );

    if (difference < smallestDifference) {
      smallestDifference = difference;
      closest = sample;
    }

    if (
      sample.timestamp <
      targetTimestamp - toleranceMs
    ) {
      break;
    }
  }

  if (smallestDifference > toleranceMs) {
    return null;
  }

  return closest;
}

// ======================================================
// PRICE MOVEMENT CALCULATION
// ======================================================

function calculateMovement(
  currentPrice,
  referencePrice,
  pointDigits = 2
) {
  if (
    !Number.isFinite(currentPrice) ||
    !Number.isFinite(referencePrice) ||
    referencePrice === 0
  ) {
    return null;
  }

  // Keep raw value for direction calculation.
  const points = currentPrice - referencePrice;

  const percent =
    (points / referencePrice) * 100;

  return {
    points: Number(points.toFixed(pointDigits)),

    percent: Number(percent.toFixed(3)),

    direction:
      points > 0
        ? "UP"
        : points < 0
          ? "DOWN"
          : "FLAT",
  };
}

// ======================================================
// MOMENTUM STRENGTH
// ======================================================

function getMomentumStrength(momentum) {
  if (!momentum) {
    return "INSUFFICIENT_DATA";
  }

  const magnitude = Math.abs(momentum.percent);

  if (magnitude < 0.05) return "WEAK";

  if (magnitude < 0.15) return "MODERATE";

  return "STRONG";
}

// ======================================================
// INSTRUMENT INTELLIGENCE
// ======================================================

function calculateInstrumentIntelligence(
  history,
  currentPrice,
  pointDigits = 2
) {
  const now = Date.now();

  const oneMinute = findReference(
    history,
    now - 60_000,
    15_000
  );

  const twoMinutes = findReference(
    history,
    now - 120_000,
    20_000
  );

  const fiveMinutes = findReference(
    history,
    now - 300_000,
    30_000
  );

  const momentum1m = oneMinute
    ? calculateMovement(
        currentPrice,
        oneMinute.price,
        pointDigits
      )
    : null;

  const momentum5m = fiveMinutes
    ? calculateMovement(
        currentPrice,
        fiveMinutes.price,
        pointDigits
      )
    : null;

  // Acceleration: current 1m move vs previous 1m move.
  let acceleration = null;

  if (oneMinute && twoMinutes) {
    const currentMove =
      currentPrice - oneMinute.price;

    const previousMove =
      oneMinute.price - twoMinutes.price;

    const accelerationPoints =
      currentMove - previousMove;

    acceleration = {
      points: Number(
        accelerationPoints.toFixed(pointDigits)
      ),

      direction:
        accelerationPoints > 0
          ? "ACCELERATING_UP"
          : accelerationPoints < 0
            ? "ACCELERATING_DOWN"
            : "STABLE",
    };
  }

  return {
    momentum1m,
    momentum5m,
    acceleration,

    strength1m:
      getMomentumStrength(momentum1m),

    strength5m:
      getMomentumStrength(momentum5m),

    historySamples: history.length,
  };
}

// ======================================================
// VIX AND NIFTY DIVERGENCE
// ======================================================

function calculateDivergence(
  vixMomentum,
  niftyMomentum
) {
  if (!vixMomentum || !niftyMomentum) {
    return {
      status: "INSUFFICIENT_DATA",
      description:
        "Waiting for matching timeframe data",
    };
  }

  if (
    vixMomentum.direction === "FLAT" ||
    niftyMomentum.direction === "FLAT"
  ) {
    return {
      status: "NO_CLEAR_DIVERGENCE",
      description:
        "One or both instruments are nearly unchanged",
    };
  }

  if (
    vixMomentum.direction !==
    niftyMomentum.direction
  ) {
    return {
      status: "DIVERGENCE",
      description:
        "NIFTY and VIX are moving in opposite directions",
    };
  }

  return {
    status: "BOTH_MOVING_SAME_DIRECTION",
    description:
      "NIFTY and VIX are moving in the same direction",
  };
}

// ======================================================
// VIX SPIKE DETECTION
// ======================================================

function detectVixSpike(momentum1m) {
  if (!momentum1m) {
    return {
      detected: false,
      level: "INSUFFICIENT_DATA",
      thresholdPercent: VIX_SPIKE_THRESHOLD,
    };
  }

  const magnitude = Math.abs(
    momentum1m.percent
  );

  if (
    magnitude >= VIX_STRONG_SPIKE_THRESHOLD
  ) {
    return {
      detected: true,
      level: "STRONG_SPIKE",
      direction: momentum1m.direction,
      changePercent: momentum1m.percent,
      thresholdPercent:
        VIX_STRONG_SPIKE_THRESHOLD,
    };
  }

  if (magnitude >= VIX_SPIKE_THRESHOLD) {
    return {
      detected: true,
      level: "SPIKE",
      direction: momentum1m.direction,
      changePercent: momentum1m.percent,
      thresholdPercent: VIX_SPIKE_THRESHOLD,
    };
  }

  return {
    detected: false,
    level: "NORMAL_MOVEMENT",
    direction: momentum1m.direction,
    changePercent: momentum1m.percent,
    thresholdPercent: VIX_SPIKE_THRESHOLD,
  };
}

// ======================================================
// VOLATILITY REGIME
// ======================================================

function classifyVolatility(vixPrice) {
  if (!Number.isFinite(vixPrice)) {
    return {
      regime: "INSUFFICIENT_DATA",
      description: "VIX price unavailable",
    };
  }

  if (vixPrice < 12) {
    return {
      regime: "LOW",
      description: "Relatively low implied volatility",
    };
  }

  if (vixPrice < 20) {
    return {
      regime: "NORMAL",
      description: "Moderate implied volatility",
    };
  }

  if (vixPrice < 30) {
    return {
      regime: "HIGH",
      description: "Elevated implied volatility",
    };
  }

  return {
    regime: "EXTREME",
    description: "Very elevated implied volatility",
  };
}

// ======================================================
// DATA FRESHNESS
// ======================================================

function getFreshness(lastUpdate) {
  if (!lastUpdate) {
    return {
      status: "NO_DATA",
      ageSeconds: null,
    };
  }

  const ageSeconds = Math.max(
    0,
    (Date.now() - new Date(lastUpdate).getTime()) /
      1000
  );

  return {
    status:
      ageSeconds <= 10
        ? "FRESH"
        : ageSeconds <= 30
          ? "DELAYED"
          : "STALE",

    ageSeconds: Number(
      ageSeconds.toFixed(1)
    ),
  };
}

// ======================================================
// BUILD COMPLETE INTELLIGENCE
// ======================================================

function buildIntelligence(state) {
  const vixMetrics = state.vix
    ? calculateInstrumentIntelligence(
        state.history.vix,
        state.vix.ltp,
        4
      )
    : null;

  const niftyMetrics = state.nifty
    ? calculateInstrumentIntelligence(
        state.history.nifty,
        state.nifty.ltp,
        2
      )
    : null;

  return {
    vix: vixMetrics,

    nifty: niftyMetrics,

    divergence: {
      oneMinute: calculateDivergence(
        vixMetrics?.momentum1m,
        niftyMetrics?.momentum1m
      ),

      fiveMinute: calculateDivergence(
        vixMetrics?.momentum5m,
        niftyMetrics?.momentum5m
      ),
    },

    spike: detectVixSpike(
      vixMetrics?.momentum1m
    ),

    volatilityRegime: classifyVolatility(
      state.vix?.ltp
    ),

    freshness: getFreshness(
      state.lastUpdate
    ),

    calculation: {
      momentumWindows: ["1m", "5m"],

      accelerationWindow:
        "1m vs previous 1m",

      spikeThresholds: {
        spikePercent: VIX_SPIKE_THRESHOLD,
        strongSpikePercent:
          VIX_STRONG_SPIKE_THRESHOLD,
      },

      volatilityThresholds: {
        low: "Below 12",
        normal: "12 to below 20",
        high: "20 to below 30",
        extreme: "30 and above",
      },

      type: "Custom live tick analysis",
    },
  };
}

// ======================================================
// GET STREAM STATUS
// ======================================================

export function getVixStreamStatus() {
  const state = getState();

  return {
    status: state.status,
    connected: state.connected,
    vix: state.vix,
    nifty: state.nifty,
    lastUpdate: state.lastUpdate,
    error: state.error,

    intelligence: buildIntelligence(state),
  };
}

// ======================================================
// START ZERODHA VIX + NIFTY STREAM
// ======================================================

export function startVixStream(accessToken) {
  const state = getState();

  if (
    state.ticker &&
    state.status !== "stopped" &&
    state.status !== "error"
  ) {
    return getVixStreamStatus();
  }

  if (
    !process.env.KITE_API_KEY ||
    !accessToken
  ) {
    throw new Error(
      "Kite API key or access token missing"
    );
  }

  const ticker = new KiteTicker({
    api_key: process.env.KITE_API_KEY,
    access_token: accessToken,
  });

  state.ticker = ticker;
  state.status = "connecting";
  state.connected = false;
  state.error = null;

  ticker.on("connect", () => {
    console.log(
      "BHAVISH VIX STREAM CONNECTED"
    );

    state.connected = true;
    state.status = "connected";

    ticker.subscribe([
      VIX_TOKEN,
      NIFTY_TOKEN,
    ]);

    ticker.setMode(
      ticker.modeFull,
      [VIX_TOKEN, NIFTY_TOKEN]
    );
  });

  ticker.on("ticks", (ticks) => {
    for (const tick of ticks) {
      const timestamp = getTimestamp(
        tick.timestamp || tick.last_trade_time
      );

      const previousClose =
        tick.ohlc?.close ?? null;

      const ltp = Number(tick.last_price);

      if (!Number.isFinite(ltp)) continue;

      const data = {
        ltp,

        previousClose,

        change:
          previousClose && previousClose > 0
            ? Number(
                (ltp - previousClose).toFixed(2)
              )
            : null,

        changePercent:
          previousClose && previousClose > 0
            ? Number(
                (
                  ((ltp - previousClose) /
                    previousClose) *
                  100
                ).toFixed(2)
              )
            : null,

        timestamp: new Date(
          timestamp
        ).toISOString(),
      };

      if (tick.instrument_token === VIX_TOKEN) {
        state.vix = data;

        storeSample(
          state.history.vix,
          ltp,
          timestamp
        );
      }

      if (tick.instrument_token === NIFTY_TOKEN) {
        state.nifty = data;

        storeSample(
          state.history.nifty,
          ltp,
          timestamp
        );
      }
    }

    state.lastUpdate = new Date().toISOString();
  });

  ticker.on("disconnect", () => {
    state.connected = false;
    state.status = "disconnected";

    console.log(
      "BHAVISH VIX STREAM DISCONNECTED"
    );
  });

  ticker.on("error", (error) => {
    state.error =
      error?.message || "WebSocket error";

    state.status = "error";
    state.connected = false;

    console.error(
      "BHAVISH VIX STREAM ERROR:",
      state.error
    );
  });

  ticker.on("close", () => {
    state.connected = false;

    if (state.status !== "error") {
      state.status = "disconnected";
    }
  });

  state.status = "connecting";

  ticker.connect();

  return getVixStreamStatus();
}
