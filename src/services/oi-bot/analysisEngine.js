
const MAX_DATA_AGE_MS = 20 * 60 * 1000;
const MAX_SNAPSHOT_GAP_MS = 20 * 60 * 1000;
const MAX_SOURCE_TIME_DIFF_MS = 5 * 60 * 1000;

function getTimestamp(snapshot) {
  if (Number.isFinite(Number(snapshot?.capturedAt))) {
    return Number(snapshot.capturedAt);
  }

  const parsed = Date.parse(snapshot?.capturedAtISO || "");
  return Number.isFinite(parsed) ? parsed : null;
}

function getValidHistory(history = []) {
  return history
    .map((item) => {
      if (typeof item === "string") {
        try {
          return JSON.parse(item);
        } catch {
          return null;
        }
      }
      return item;
    })
    .filter(Boolean)
    .map((snapshot) => ({
      snapshot,
      timestamp: getTimestamp(snapshot),
    }))
    .filter((item) => item.timestamp !== null)
    .sort((a, b) => a.timestamp - b.timestamp);
}

function getFuturesAnalysis(current, previous) {
  if (!current || !previous) {
    return {
      valid: false,
      reason: "Insufficient Futures history",
    };
  }

  if (
    current.symbol !== previous.symbol ||
    current.expiry !== previous.expiry
  ) {
    return {
      valid: false,
      reason: "Futures contract changed",
    };
  }

  const priceChange = Number(current.ltp) - Number(previous.ltp);
  const oiChange = Number(current.oi) - Number(previous.oi);

  if (
    !Number.isFinite(priceChange) ||
    !Number.isFinite(oiChange) ||
    Number(previous.ltp) <= 0 ||
    Number(previous.oi) <= 0
  ) {
    return {
      valid: false,
      reason: "Invalid Futures values",
    };
  }

  let classification = "NEUTRAL";

  if (priceChange > 0 && oiChange > 0) {
    classification = "LONG_BUILDUP_CANDIDATE";
  } else if (priceChange < 0 && oiChange > 0) {
    classification = "SHORT_BUILDUP_CANDIDATE";
  } else if (priceChange > 0 && oiChange < 0) {
    classification = "SHORT_COVERING_CANDIDATE";
  } else if (priceChange < 0 && oiChange < 0) {
    classification = "LONG_UNWINDING_CANDIDATE";
  }

  return {
    valid: true,
    symbol: current.symbol,
    currentPrice: Number(current.ltp),
    previousPrice: Number(previous.ltp),
    priceChange: Number(priceChange.toFixed(2)),
    currentOI: Number(current.oi),
    previousOI: Number(previous.oi),
    oiChange,
    oiChangePercent: Number(
      ((oiChange / Number(previous.oi)) * 100).toFixed(3)
    ),
    classification,
  };
}

function getOptionsAnalysis(current, previous) {
  if (!current || !previous) {
    return {
      valid: false,
      reason: "Insufficient Options history",
    };
  }

  if (current.expiry !== previous.expiry) {
    return {
      valid: false,
      reason: "Options expiry changed",
    };
  }

  const previousMap = new Map(
    (previous.options || []).map((item) => [
      item.tradingsymbol,
      item,
    ])
  );

  const matched = (current.options || [])
    .map((option) => {
      const old = previousMap.get(option.tradingsymbol);

      if (!old) return null;

      const currentOI = Number(option.oi);
      const previousOI = Number(old.oi);
      const currentPremium = Number(option.ltp);
      const previousPremium = Number(old.ltp);

      if (
        !Number.isFinite(currentOI) ||
        !Number.isFinite(previousOI) ||
        !Number.isFinite(currentPremium) ||
        !Number.isFinite(previousPremium) ||
        previousOI <= 0 ||
        currentPremium < 0 ||
        previousPremium < 0
      ) {
        return null;
      }

      const oiChange = currentOI - previousOI;
      const premiumChange = currentPremium - previousPremium;

      let interpretation = "NEUTRAL";

      if (oiChange > 0 && premiumChange > 0) {
        interpretation = "LONG_BUILDUP_CANDIDATE";
      } else if (oiChange > 0 && premiumChange < 0) {
        interpretation =
          option.optionType === "CE"
            ? "CALL_WRITING_CANDIDATE"
            : "PUT_WRITING_CANDIDATE";
      } else if (oiChange < 0 && premiumChange > 0) {
        interpretation = "SHORT_COVERING_CANDIDATE";
      } else if (oiChange < 0 && premiumChange < 0) {
        interpretation = "LONG_UNWINDING_CANDIDATE";
      }

      return {
        strike: Number(option.strike),
        optionType: option.optionType,
        tradingsymbol: option.tradingsymbol,
        oiChange,
        premiumChange: Number(premiumChange.toFixed(2)),
        interpretation,
      };
    })
    .filter(Boolean);

  const calls = matched.filter((item) => item.optionType === "CE");
  const puts = matched.filter((item) => item.optionType === "PE");

  const highestCallOI = calls.reduce(
    (best, item) =>
      !best || item.oiChange > best.oiChange ? item : best,
    null
  );

  const highestPutOI = puts.reduce(
    (best, item) =>
      !best || item.oiChange > best.oiChange ? item : best,
    null
  );

  const highestCallWriting = calls
    .filter(
      (item) => item.interpretation === "CALL_WRITING_CANDIDATE"
    )
    .sort((a, b) => b.oiChange - a.oiChange)[0] || null;

  const highestPutWriting = puts
    .filter(
      (item) => item.interpretation === "PUT_WRITING_CANDIDATE"
    )
    .sort((a, b) => b.oiChange - a.oiChange)[0] || null;

  return {
    valid: matched.length > 0,

    // ATM strike required for Options Intelligence Scoring V2
    atmStrike: Number(current.atmStrike),

    matchedContracts: matched.length,
    callsMatched: calls.length,
    putsMatched: puts.length,
    highestCallOI,
    highestPutOI,
    resistanceCandidate: highestCallWriting?.strike ?? null,
    supportCandidate: highestPutWriting?.strike ?? null,
    contracts: matched,
  };
}

export function analyzeOIBot({
  futuresHistory = [],
  optionsHistory = [],
  now = Date.now(),
}) {
  const futures = getValidHistory(futuresHistory);
  const options = getValidHistory(optionsHistory);

  const latestFutures = futures.at(-1);
  const previousFutures = futures.at(-2);
  const latestOptions = options.at(-1);
  const previousOptions = options.at(-2);

  if (
    !latestFutures ||
    !previousFutures ||
    !latestOptions ||
    !previousOptions
  ) {
    return {
      success: false,
      signal: "NO_TRADE",
      reason: "Need at least two valid Futures and Options snapshots",
    };
  }

  const futuresAge = now - latestFutures.timestamp;
  const optionsAge = now - latestOptions.timestamp;

  if (
    futuresAge < 0 ||
    optionsAge < 0 ||
    futuresAge > MAX_DATA_AGE_MS ||
    optionsAge > MAX_DATA_AGE_MS
  ) {
    return {
      success: false,
      signal: "NO_TRADE",
      reason: "Market data is stale",
    };
  }

  const futuresGap =
    latestFutures.timestamp - previousFutures.timestamp;

  const optionsGap =
    latestOptions.timestamp - previousOptions.timestamp;

  if (
    futuresGap <= 0 ||
    optionsGap <= 0 ||
    futuresGap > MAX_SNAPSHOT_GAP_MS ||
    optionsGap > MAX_SNAPSHOT_GAP_MS
  ) {
    return {
      success: false,
      signal: "NO_TRADE",
      reason: "Snapshot interval is invalid",
    };
  }

  if (
    Math.abs(
      latestFutures.timestamp - latestOptions.timestamp
    ) > MAX_SOURCE_TIME_DIFF_MS
  ) {
    return {
      success: false,
      signal: "NO_TRADE",
      reason: "Futures and Options timestamps do not match",
    };
  }

  const futuresResult = getFuturesAnalysis(
    latestFutures.snapshot,
    previousFutures.snapshot
  );

  const optionsResult = getOptionsAnalysis(
    latestOptions.snapshot,
    previousOptions.snapshot
  );

  if (!futuresResult.valid || !optionsResult.valid) {
    return {
      success: false,
      signal: "NO_TRADE",
      reason: !futuresResult.valid
        ? futuresResult.reason
        : optionsResult.reason,
    };
  }

  let bias = "NEUTRAL";

  if (
    [
      "LONG_BUILDUP_CANDIDATE",
      "SHORT_COVERING_CANDIDATE",
    ].includes(futuresResult.classification)
  ) {
    bias = "BULLISH";
  } else if (
    [
      "SHORT_BUILDUP_CANDIDATE",
      "LONG_UNWINDING_CANDIDATE",
    ].includes(futuresResult.classification)
  ) {
    bias = "BEARISH";
  }

  const signal = "WAIT";

  return {
    success: true,
    signal,
    bias,
    confidence: null,
    reason: "Initial analysis only. More confirmations are required.",
    futures: futuresResult,
    options: optionsResult,
    dataQuality: {
      futuresAgeMinutes: Number((futuresAge / 60000).toFixed(1)),
      optionsAgeMinutes: Number((optionsAge / 60000).toFixed(1)),
      futuresGapMinutes: Number((futuresGap / 60000).toFixed(1)),
      optionsGapMinutes: Number((optionsGap / 60000).toFixed(1)),
    },
    analyzedAt: new Date(now).toISOString(),
  };
}
