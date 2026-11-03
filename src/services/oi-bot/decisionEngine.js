
const MIN_CONFIDENCE = 100;
const MIN_OPTIONS_SCORE = 2;
const MIN_OI_CHANGE = 10000;
const MAX_CANDLE_AGE_MINUTES = 10;
const ATM_RANGE = 100;

// ======================================================
// OPTIONS INTELLIGENCE V2
// ======================================================

function getOptionsBias(options, atmStrike) {
  if (!options?.valid || !Array.isArray(options.contracts)) {
    return {
      bias: "NEUTRAL",
      score: 0,
      reason: "Options data unavailable",
    };
  }

  const atm = Number(atmStrike);

  if (!Number.isFinite(atm)) {
    return {
      bias: "NEUTRAL",
      score: 0,
      reason: "ATM strike unavailable",
    };
  }

  // ATM ± 2 strikes (NIFTY strike interval = 50)
  const relevant = options.contracts.filter((item) => {
    const strike = Number(item.strike);

    return (
      Number.isFinite(strike) &&
      Math.abs(strike - atm) <= ATM_RANGE &&
      ["CE", "PE"].includes(item.optionType)
    );
  });

  if (relevant.length === 0) {
    return {
      bias: "NEUTRAL",
      score: 0,
      reason: "No ATM nearby contracts available",
    };
  }

  let bullishScore = 0;
  let bearishScore = 0;

  let callWritingCount = 0;
  let putWritingCount = 0;
  let callCoveringCount = 0;
  let putCoveringCount = 0;

  const strikeDetails = [];

  for (const item of relevant) {
    const oiChange = Number(item.oiChange);
    const premiumChange = Number(item.premiumChange);

    if (
      !Number.isFinite(oiChange) ||
      !Number.isFinite(premiumChange) ||
      oiChange === 0 ||
      premiumChange === 0
    ) {
      continue;
    }

    const oiStrength = Math.abs(oiChange);

    if (oiStrength < MIN_OI_CHANGE) {
      continue;
    }

    // Square-root weighting reduces domination by one large strike.
    const weight = Math.sqrt(oiStrength);

    let interpretation = "NEUTRAL";
    let bullishContribution = 0;
    let bearishContribution = 0;

    // CALL WRITING = BEARISH
    if (
      item.optionType === "CE" &&
      oiChange > 0 &&
      premiumChange < 0
    ) {
      bearishContribution = weight;
      bearishScore += bearishContribution;
      callWritingCount++;
      interpretation = "CALL_WRITING_CANDIDATE";
    }

    // PUT WRITING = BULLISH
    else if (
      item.optionType === "PE" &&
      oiChange > 0 &&
      premiumChange < 0
    ) {
      bullishContribution = weight;
      bullishScore += bullishContribution;
      putWritingCount++;
      interpretation = "PUT_WRITING_CANDIDATE";
    }

    // CALL SHORT COVERING = BULLISH CANDIDATE
    else if (
      item.optionType === "CE" &&
      oiChange < 0 &&
      premiumChange > 0
    ) {
      bullishContribution = weight * 0.5;
      bullishScore += bullishContribution;
      callCoveringCount++;
      interpretation = "CALL_COVERING_CANDIDATE";
    }

    // PUT SHORT COVERING = BEARISH CANDIDATE
    else if (
      item.optionType === "PE" &&
      oiChange < 0 &&
      premiumChange > 0
    ) {
      bearishContribution = weight * 0.5;
      bearishScore += bearishContribution;
      putCoveringCount++;
      interpretation = "PUT_COVERING_CANDIDATE";
    }

    else if (oiChange > 0 && premiumChange > 0) {
      interpretation = "LONG_BUILDUP_CANDIDATE";
    }

    else if (oiChange < 0 && premiumChange < 0) {
      interpretation = "LONG_UNWINDING_CANDIDATE";
    }

    strikeDetails.push({
      strike: Number(item.strike),
      optionType: item.optionType,
      oiChange,
      premiumChange,
      interpretation,
      bullishContribution: Number(bullishContribution.toFixed(2)),
      bearishContribution: Number(bearishContribution.toFixed(2)),
    });
  }

  const totalScore = bullishScore + bearishScore;

  if (totalScore === 0) {
    return {
      bias: "NEUTRAL",
      score: 0,
      reason: "No meaningful directional ATM OI activity",
      contractsAnalyzed: relevant.length,
      strikeDetails,
    };
  }

  const dominance =
    Math.abs(bullishScore - bearishScore) / totalScore;

  if (dominance < 0.20) {
    return {
      bias: "NEUTRAL",
      score: 0,
      reason: "CE and PE activity are conflicting",
      bullishScore: Number(bullishScore.toFixed(2)),
      bearishScore: Number(bearishScore.toFixed(2)),
      contractsAnalyzed: relevant.length,
      strikeDetails,
    };
  }

  const bias =
    bullishScore > bearishScore ? "BULLISH" : "BEARISH";

  const score = Math.round(dominance * 5);

  if (score < MIN_OPTIONS_SCORE) {
    return {
      bias: "NEUTRAL",
      score,
      reason: "Options directional strength is weak",
      bullishScore: Number(bullishScore.toFixed(2)),
      bearishScore: Number(bearishScore.toFixed(2)),
      contractsAnalyzed: relevant.length,
      strikeDetails,
    };
  }

  let reason = "Directional options activity detected";

  if (bias === "BULLISH") {
    const activities = [];

    if (putWritingCount > 0) {
      activities.push("put writing");
    }

    if (callCoveringCount > 0) {
      activities.push("call covering");
    }

    reason = activities.length
      ? `Bullish candidate: ${activities.join(" and ")}`
      : "Bullish options positioning candidate";
  }

  if (bias === "BEARISH") {
    const activities = [];

    if (callWritingCount > 0) {
      activities.push("call writing");
    }

    if (putCoveringCount > 0) {
      activities.push("put covering");
    }

    reason = activities.length
      ? `Bearish candidate: ${activities.join(" and ")}`
      : "Bearish options positioning candidate";
  }

  return {
    bias,
    score,
    reason,

    bullishScore: Number(bullishScore.toFixed(2)),
    bearishScore: Number(bearishScore.toFixed(2)),

    callWritingCount,
    putWritingCount,
    callCoveringCount,
    putCoveringCount,

    contractsAnalyzed: relevant.length,
    strikeDetails,
  };
}

// ======================================================
// MARKET CONFIRMATION
// ======================================================

function getMarketBias(market) {
  if (!market?.success) {
    return {
      bias: "NEUTRAL",
      reason: "Market confirmation unavailable",
    };
  }

  if (
    market.candleAgeMinutes == null ||
    market.candleAgeMinutes < 0 ||
    market.candleAgeMinutes > MAX_CANDLE_AGE_MINUTES
  ) {
    return {
      bias: "NEUTRAL",
      reason: "Market candle is stale",
    };
  }

  if (market.volume?.confirmation !== "VOLUME_CONFIRMED") {
    return {
      bias: "NEUTRAL",
      reason: "Volume confirmation missing",
    };
  }

  const structure = market.structure?.structure;

  const bullish =
    market.vwapPosition === "ABOVE_VWAP" &&
    market.emaTrend === "BULLISH" &&
    market.momentum === "UP" &&
    structure === "BULLISH_STRUCTURE";

  const bearish =
    market.vwapPosition === "BELOW_VWAP" &&
    market.emaTrend === "BEARISH" &&
    market.momentum === "DOWN" &&
    structure === "BEARISH_STRUCTURE";

  if (bullish) {
    return {
      bias: "BULLISH",
      reason: "VWAP, EMA, momentum, volume and structure bullish",
    };
  }

  if (bearish) {
    return {
      bias: "BEARISH",
      reason: "VWAP, EMA, momentum, volume and structure bearish",
    };
  }

  return {
    bias: "NEUTRAL",
    reason: "Market confirmations are mixed or structure is not aligned",
  };
}

// ======================================================
// TRAP DETECTION
// ======================================================

function getTrapStatus(market) {
  if (!market?.success) return true;

  if (market.breakout?.trapWarning === true) {
    return true;
  }

  if (
    market.breakout?.breakout !== "NONE" &&
    market.volume?.confirmation !== "VOLUME_CONFIRMED"
  ) {
    return true;
  }

  return false;
}

// ======================================================
// FINAL DECISION ENGINE
// ======================================================

export function generateOIBotDecision({
  analysis,
  marketConfirmation,
  dataSync,
}) {
  if (
    !analysis?.success ||
    !analysis.futures?.valid ||
    !analysis.options?.valid
  ) {
    return {
      success: true,
      signal: "NO_TRADE",
      bias: "NEUTRAL",
      confidence: 0,
      reason: "Futures or Options analysis is invalid",
    };
  }

  if (!dataSync?.valid) {
    return {
      success: true,
      signal: "NO_TRADE",
      bias: "NEUTRAL",
      confidence: 0,
      reason: "Market data synchronization failed",
    };
  }

  const futures = analysis.bias || "NEUTRAL";

  const options = getOptionsBias(
    analysis.options,
    analysis.options.atmStrike
  );

  const market = getMarketBias(marketConfirmation);

  const bullishVotes = [
    futures === "BULLISH",
    options.bias === "BULLISH",
    market.bias === "BULLISH",
  ].filter(Boolean).length;

  const bearishVotes = [
    futures === "BEARISH",
    options.bias === "BEARISH",
    market.bias === "BEARISH",
  ].filter(Boolean).length;

  const trapWarning = getTrapStatus(marketConfirmation);

  const confidence = Math.round(
    (Math.max(bullishVotes, bearishVotes) / 3) * 100
  );

  let signal = "WAIT";
  let reason = "Directional confirmations are insufficient";

  if (trapWarning) {
    reason = "Potential breakout trap detected";
  } else if (
    market.bias === "NEUTRAL"
  ) {
    reason = market.reason;
  } else if (
    bullishVotes === 3 &&
    bearishVotes === 0 &&
    confidence >= MIN_CONFIDENCE
  ) {
    signal = "BUY_CE";
    reason =
      "Futures, Options and Market confirmations are bullish";
  } else if (
    bearishVotes === 3 &&
    bullishVotes === 0 &&
    confidence >= MIN_CONFIDENCE
  ) {
    signal = "BUY_PE";
    reason =
      "Futures, Options and Market confirmations are bearish";
  }

  return {
    success: true,

    signal,

    bias:
      bullishVotes > bearishVotes
        ? "BULLISH"
        : bearishVotes > bullishVotes
          ? "BEARISH"
          : "NEUTRAL",

    confidence,
    reason,
    trapWarning,

    confirmations: {
      futures,
      options,
      market,
    },

    votes: {
      bullish: bullishVotes,
      bearish: bearishVotes,
    },

    analyzedAt: new Date().toISOString(),
  };
}
