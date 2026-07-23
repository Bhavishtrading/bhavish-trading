export function analyzeMarketBias({
  marketStructure,
  oi,
  pcr,
  emaTrend,
  rsi,
  macdTrend,
  adx,
}) {
  let score = 0;
  const reasons = [];

  // PCR
  if (pcr > 1.1) {
    score += 20;
    reasons.push("PCR Bullish");
  } else if (pcr < 0.9) {
    score -= 20;
    reasons.push("PCR Bearish");
  }

  // EMA Trend
  if (emaTrend === "Bullish") {
    score += 20;
    reasons.push("EMA Bullish");
  } else if (emaTrend === "Bearish") {
    score -= 20;
    reasons.push("EMA Bearish");
  }

  // RSI
  if (rsi >= 60) {
    score += 15;
    reasons.push("RSI Bullish");
  } else if (rsi <= 40) {
    score -= 15;
    reasons.push("RSI Bearish");
  }

  // MACD
  if (macdTrend === "Bullish") {
    score += 15;
    reasons.push("MACD Bullish");
  } else if (macdTrend === "Bearish") {
    score -= 15;
    reasons.push("MACD Bearish");
  }

  // ADX
  if (adx >= 25) {
    reasons.push("Strong Trend");
  } else {
    reasons.push("Weak Trend");
  }

  // ===========================
// OI ANALYSIS
// ===========================

if (oi.longBuildUp > 0) {
  score += oi.longBuildUp * 10;
  reasons.push(`Long Build-up (${oi.longBuildUp})`);
}

if (oi.shortCovering > 0) {
  score += oi.shortCovering * 8;
  reasons.push(`Short Covering (${oi.shortCovering})`);
}

if (oi.shortBuildUp > 0) {
  score -= oi.shortBuildUp * 10;
  reasons.push(`Short Build-up (${oi.shortBuildUp})`);
}

if (oi.longUnwinding > 0) {
  score -= oi.longUnwinding * 8;
  reasons.push(`Long Unwinding (${oi.longUnwinding})`);
}

  // Market Structure
  if (marketStructure?.supportStrength === "Strong") {
    reasons.push("Strong Support");
  }

  if (marketStructure?.resistanceStrength === "Strong") {
    reasons.push("Strong Resistance");
  }

  let bias = "Neutral";

  if (score >= 30) {
    bias = "Bullish";
  } else if (score <= -30) {
    bias = "Bearish";
  }

  return {
    bias,
    score,
    confidence: Math.min(Math.abs(score), 100),
    reasons,
  };
}