// =====================================================
// CRUDE OIL INTELLIGENCE ENGINE V4
// Technical + S/R + Momentum + Breakout Protection
// =====================================================

export function calculateCrudeIntelligence(
  indicators,
  live,
  levels = null
) {
  const price = Number(live?.ltp);

  if (!Number.isFinite(price)) {
    throw new Error("Valid live price required");
  }

  let score = 50;
  const reasons = [];

  // =====================================================
  // 1. EMA TREND
  // =====================================================

  const emaBullish =
    indicators.ema9 > indicators.ema20 &&
    indicators.ema20 > indicators.ema50 &&
    indicators.ema50 > indicators.ema200;

  const emaBearish =
    indicators.ema9 < indicators.ema20 &&
    indicators.ema20 < indicators.ema50 &&
    indicators.ema50 < indicators.ema200;

  if (emaBullish) {
    score += 18;
    reasons.push("Bullish EMA alignment");
  } else if (emaBearish) {
    score -= 18;
    reasons.push("Bearish EMA alignment");
  }

  // Short-term EMA
  if (indicators.ema9 > indicators.ema20) {
    score += 5;
  } else if (indicators.ema9 < indicators.ema20) {
    score -= 5;
  }

  // =====================================================
  // 2. VWAP
  // =====================================================

  if (price > indicators.vwap) {
    score += 8;
    reasons.push("Price above VWAP");
  } else if (price < indicators.vwap) {
    score -= 8;
    reasons.push("Price below VWAP");
  }

  // =====================================================
  // 3. RSI
  // =====================================================

  if (indicators.rsi14 >= 55 && indicators.rsi14 < 70) {
    score += 7;
    reasons.push("RSI bullish");
  } else if (indicators.rsi14 <= 45 && indicators.rsi14 > 30) {
    score -= 7;
    reasons.push("RSI bearish");
  }

  if (indicators.rsi14 >= 70) {
    score -= 4;
    reasons.push("RSI overbought");
  }

  if (indicators.rsi14 <= 30) {
    score += 4;
    reasons.push("RSI oversold");
  }

  // =====================================================
  // 4. MACD
  // =====================================================

  const macdBullish =
    indicators.macd.macd >
    indicators.macd.signal;

  const macdBearish =
    indicators.macd.macd <
    indicators.macd.signal;

  if (macdBullish) {
    score += 8;
    reasons.push("MACD bullish");
  } else if (macdBearish) {
    score -= 8;
    reasons.push("MACD bearish");
  }

  // Weak MACD momentum
  if (
    Math.abs(indicators.macd.histogram) < 0.20
  ) {
    score = 50 + (score - 50) * 0.90;
    reasons.push("MACD momentum weak");
  }

  // =====================================================
  // 5. ADX TREND STRENGTH
  // =====================================================

  let trendStrength = "WEAK";

  if (indicators.adx14 >= 25) {
    trendStrength = "STRONG";
    reasons.push("Strong trend confirmed");
  } else if (indicators.adx14 >= 20) {
    trendStrength = "MODERATE";
    reasons.push("Moderate trend");
  } else {
    // Strong penalty for weak trend
    score = 50 + (score - 50) * 0.65;
    reasons.push("ADX weak - trend confirmation missing");
  }

  // =====================================================
  // 6. PRICE vs EMA9
  // =====================================================

  if (price > indicators.ema9) {
    score += 3;
    reasons.push("Price above EMA9");
  } else if (price < indicators.ema9) {
    score -= 3;
    reasons.push("Price below EMA9");
  }

  // =====================================================
  // 7. SUPPORT / RESISTANCE
  // =====================================================

  let resistanceBlocked = false;
  let supportProtected = false;

  if (levels) {
    // -------------------------------------------------
    // Strong Support
    // -------------------------------------------------

    if (
      levels.nearSupport &&
      levels.supportStrength >= 70
    ) {
      score += 4;
      supportProtected = true;

      reasons.push(
        `Strong support nearby (${levels.support})`
      );
    }

    // -------------------------------------------------
    // Strong Resistance
    // -------------------------------------------------

    if (
      levels.nearResistance &&
      levels.resistanceStrength >= 70
    ) {
      score -= 8;
      resistanceBlocked = true;

      reasons.push(
        `Strong resistance nearby (${levels.resistance})`
      );
    }

    // -------------------------------------------------
    // Tight Range
    // -------------------------------------------------

    if (
      levels.levelBias === "TIGHT_RANGE"
    ) {
      score = 50 + (score - 50) * 0.85;

      reasons.push(
        "Price trapped between support and resistance"
      );
    }

    // -------------------------------------------------
    // Confirmed Breakout
    // -------------------------------------------------

    if (levels.breakout) {
      score += 18;

      reasons.push(
        "Resistance breakout confirmed"
      );
    }

    // -------------------------------------------------
    // Confirmed Breakdown
    // -------------------------------------------------

    if (levels.breakdown) {
      score -= 18;

      reasons.push(
        "Support breakdown confirmed"
      );
    }
  }

  // =====================================================
  // 8. SCORE CLAMP
  // =====================================================

  score = Math.max(
    0,
    Math.min(100, Math.round(score))
  );

  // =====================================================
  // 9. BIAS
  // =====================================================

  let bias = "NEUTRAL";

  if (score >= 70) {
    bias = "BULLISH";
  } else if (score >= 58) {
    bias = "MILD BULLISH";
  } else if (score <= 30) {
    bias = "BEARISH";
  } else if (score <= 42) {
    bias = "MILD BEARISH";
  }

  // =====================================================
  // 10. CONFIDENCE
  // =====================================================

  let confidence =
    Math.abs(score - 50) * 2;

  // Weak ADX
  if (indicators.adx14 < 20) {
    confidence -= 20;
  }

  // Weak MACD
  if (
    Math.abs(indicators.macd.histogram) < 0.20
  ) {
    confidence -= 10;
  }

  // Strong resistance blocking upside
  if (resistanceBlocked) {
    confidence -= 10;
  }

  confidence = Math.max(
    0,
    Math.min(100, Math.round(confidence))
  );

  // =====================================================
  // 11. ACTION
  // =====================================================

  let action = "WAIT";

  // Highest priority = confirmed breakout
  if (
    levels?.breakout &&
    indicators.adx14 >= 20
  ) {
    action = "BUY BREAKOUT";
  }

  // Confirmed breakdown
  else if (
    levels?.breakdown &&
    indicators.adx14 >= 20
  ) {
    action = "SELL BREAKDOWN";
  }

  // Strong resistance
  else if (
    levels?.nearResistance &&
    levels.resistanceStrength >= 70
  ) {
    action = "WAIT FOR BREAKOUT";
  }

  // Strong support
  else if (
    levels?.nearSupport &&
    levels.supportStrength >= 70 &&
    score < 70
  ) {
    action = "WAIT FOR SUPPORT";
  }

  // Strong bullish trend
  else if (
    score >= 75 &&
    indicators.adx14 >= 25
  ) {
    action = "BUY / HOLD";
  }

  // Strong bearish trend
  else if (
    score <= 25 &&
    indicators.adx14 >= 25
  ) {
    action = "SELL / HOLD";
  }

  // Bullish but trend not strong
  else if (
    score >= 65 &&
    indicators.adx14 >= 20
  ) {
    action = "BUY ON DIP";
  }

  // Bearish but trend not strong
  else if (
    score <= 35 &&
    indicators.adx14 >= 20
  ) {
    action = "SELL ON RISE";
  }

  // Bullish but weak trend
  else if (score >= 65) {
    action = "WAIT FOR CONFIRMATION";
  }

  // Bearish but weak trend
  else if (score <= 35) {
    action = "WAIT FOR BREAKDOWN";
  }

  // =====================================================
  // 12. RETURN
  // =====================================================

  return {
    score,
    bias,
    trendStrength,
    confidence,
    action,
    reasons,

    volatility: indicators.atr14,

    support: levels?.support ?? null,
    resistance: levels?.resistance ?? null,

    supportStrength:
      levels?.supportStrength ?? null,

    resistanceStrength:
      levels?.resistanceStrength ?? null,

    nearSupport:
      levels?.nearSupport ?? false,

    nearResistance:
      levels?.nearResistance ?? false,

    breakout:
      levels?.breakout ?? false,

    breakdown:
      levels?.breakdown ?? false,
  };
}