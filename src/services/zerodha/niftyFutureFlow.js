
const CANDLE_INTERVAL_MS = 5 * 60 * 1000;

const MIN_VOLUME_HISTORY = 10;
const MAX_VOLUME_HISTORY = 20;

// Initial OI anomaly threshold: 0.50%
const OI_ANOMALY_THRESHOLD_PERCENT = 0.5;

// Convert timestamp into Indian trading date
function getTradingDate(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

// Calculate median
function getMedian(values) {
  if (!values.length) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

// Check whether a 5-minute candle is completed
function isCompletedCandle(candle, now) {
  const candleStart = new Date(candle.date).getTime();

  if (!Number.isFinite(candleStart)) return false;

  return candleStart + CANDLE_INTERVAL_MS <= now;
}

// Get previous candle OI change percentage
function getPreviousOIChangePercent(previousCandles) {
  if (previousCandles.length < 2) return null;

  const previous = previousCandles.at(-1);
  const beforePrevious = previousCandles.at(-2);

  if (
    !Number.isFinite(previous.oi) ||
    !Number.isFinite(beforePrevious.oi) ||
    beforePrevious.oi <= 0
  ) {
    return null;
  }

  const change = previous.oi - beforePrevious.oi;

  return (change / beforePrevious.oi) * 100;
}

// Detect OI anomalies
function detectOIAnomaly(oiChangePercent, previousCandles) {
  const result = {
    isAnomaly: false,
    type: null,
    reason: null,
  };

  if (oiChangePercent === null) {
    return result;
  }

  const currentIsLarge =
    Math.abs(oiChangePercent) >= OI_ANOMALY_THRESHOLD_PERCENT;

  const previousOIChangePercent =
    getPreviousOIChangePercent(previousCandles);

  const previousIsLarge =
    previousOIChangePercent !== null &&
    Math.abs(previousOIChangePercent) >=
      OI_ANOMALY_THRESHOLD_PERCENT;

  // Detect sudden reversal between consecutive candles
  if (
    currentIsLarge &&
    previousIsLarge &&
    Math.sign(oiChangePercent) !==
      Math.sign(previousOIChangePercent)
  ) {
    return {
      isAnomaly: true,
      type: "OI_SPIKE_REVERSAL",
      reason: "Large OI change reversed direction in consecutive candles",
    };
  }

  // Detect individual large OI movement
  if (currentIsLarge) {
    return {
      isAnomaly: true,
      type: "OI_SPIKE",
      reason: "OI change exceeded the configured threshold",
    };
  }

  return result;
}

// Analyze individual candle
function analyzeCandle(candle, previousCandles) {
  const previous = previousCandles.at(-1) || null;

  const priceChange = previous
    ? Number((candle.close - previous.close).toFixed(2))
    : null;

  const oiChange =
    previous &&
    Number.isFinite(candle.oi) &&
    Number.isFinite(previous.oi)
      ? candle.oi - previous.oi
      : null;

  const oiChangePercent =
    oiChange !== null && previous.oi > 0
      ? Number(((oiChange / previous.oi) * 100).toFixed(3))
      : null;

  // Volume baseline uses previous candles only
  const volumeHistory = previousCandles
    .slice(-MAX_VOLUME_HISTORY)
    .map((item) => Number(item.volume))
    .filter(
      (volume) => Number.isFinite(volume) && volume > 0
    );

  // Require minimum 10 previous candles
  const baselineVolume =
    volumeHistory.length >= MIN_VOLUME_HISTORY
      ? getMedian(volumeHistory)
      : null;

  const relativeVolume =
    baselineVolume !== null && baselineVolume > 0
      ? Number((candle.volume / baselineVolume).toFixed(2))
      : null;

  // OI anomaly detection
  const oiAnomaly = detectOIAnomaly(
    oiChangePercent,
    previousCandles
  );

  // Price + OI interpretation
  let marketPosition = "NO_CLEAR_SIGNAL";

  if (priceChange !== null && oiChange !== null) {
    if (priceChange > 0 && oiChange > 0) {
      marketPosition = "LONG_BUILD_UP_CANDIDATE";
    } else if (priceChange < 0 && oiChange > 0) {
      marketPosition = "SHORT_BUILD_UP_CANDIDATE";
    } else if (priceChange > 0 && oiChange < 0) {
      marketPosition = "SHORT_COVERING_CANDIDATE";
    } else if (priceChange < 0 && oiChange < 0) {
      marketPosition = "LONG_UNWINDING_CANDIDATE";
    }
  }

  // Do not trust normal OI classification when anomaly exists
  if (oiAnomaly.isAnomaly) {
    marketPosition = "OI_ANOMALY_WARNING";
  }

  return {
    ...candle,

    priceChange,

    oiChange,
    oiChangePercent,

    baselineVolume:
      baselineVolume !== null
        ? Number(baselineVolume.toFixed(2))
        : null,

    relativeVolume,
    volumeHistoryCount: volumeHistory.length,

    marketPosition,

    oiAnomaly: oiAnomaly.isAnomaly,
    oiAnomalyType: oiAnomaly.type,
    oiAnomalyReason: oiAnomaly.reason,

    oiSignalQuality: oiAnomaly.isAnomaly
      ? "LOW"
      : "NORMAL",
  };
}

// Main NIFTY Futures flow analysis
export function analyzeNiftyFutureFlow(candles = []) {
  if (!Array.isArray(candles) || candles.length === 0) {
    return {
      totalCandles: 0,
      removedIncompleteCandles: 0,
      anomalyCount: 0,
      latest: null,
      candles: [],
    };
  }

  const now = Date.now();

  // Sort candles by timestamp
  const sortedCandles = [...candles].sort(
    (a, b) =>
      new Date(a.date).getTime() -
      new Date(b.date).getTime()
  );

  // Remove incomplete candles
  const completedCandles = sortedCandles.filter((candle) =>
    isCompletedCandle(candle, now)
  );

  // Group candles by Indian trading date
  const groupedCandles = new Map();

  for (const candle of completedCandles) {
    const tradingDate = getTradingDate(candle.date);

    if (!groupedCandles.has(tradingDate)) {
      groupedCandles.set(tradingDate, []);
    }

    groupedCandles.get(tradingDate).push({
      ...candle,
      tradingDate,
    });
  }

  const analyzedCandles = [];

  // Analyze each trading day separately
  for (const [tradingDate, dayCandles] of groupedCandles) {
    const previousCandles = [];

    for (const candle of dayCandles) {
      const analysis = analyzeCandle(
        candle,
        previousCandles
      );

      analyzedCandles.push({
        ...analysis,
        tradingDate,
      });

      previousCandles.push(candle);
    }
  }

  const anomalyCandles = analyzedCandles.filter(
    (candle) => candle.oiAnomaly
  );

  return {
    totalCandles: analyzedCandles.length,

    removedIncompleteCandles:
      sortedCandles.length - completedCandles.length,

    anomalyCount: anomalyCandles.length,

    latest: analyzedCandles.at(-1) || null,

    candles: analyzedCandles,
  };
}
