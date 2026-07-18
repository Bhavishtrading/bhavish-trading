export function generateAISignal(marketData) {
  let score = 0;
  const reasons = [];

  // --------------------------
  // EMA Trend (20 Marks)
  // --------------------------
  if (
    marketData.ema9 > marketData.ema20 &&
    marketData.ema20 > marketData.ema50
  ) {
    score += 20;
    reasons.push("Strong EMA Bullish Trend");
  } else if (
    marketData.ema9 < marketData.ema20 &&
    marketData.ema20 < marketData.ema50
  ) {
    score -= 20;
    reasons.push("Strong EMA Bearish Trend");
  }

  // --------------------------
  // RSI (15 Marks)
  // --------------------------
  if (marketData.rsi >= 55 && marketData.rsi <= 70) {
    score += 15;
    reasons.push("RSI Bullish");
  } else if (marketData.rsi <= 45) {
    score -= 15;
    reasons.push("RSI Bearish");
  }

  // --------------------------
  // MACD (20 Marks)
  // --------------------------
  if (marketData.macd > marketData.macdSignal) {
    score += 20;
    reasons.push("MACD Bullish Crossover");
  } else {
    score -= 20;
    reasons.push("MACD Bearish");
  }

  // --------------------------
  // ADX (15 Marks)
  // --------------------------
  if (marketData.adx >= 25) {
    score += 15;
    reasons.push("Strong Trend");
  } else {
    reasons.push("Weak Trend");
  }

  // --------------------------
  // ATR (10 Marks)
  // --------------------------
  if (marketData.atr > 0) {
    score += 10;
    reasons.push("Healthy Volatility");
  }

  // --------------------------
  // Final Decision
  // --------------------------

  let signal = "WAIT";
  let confidence = Math.min(Math.abs(score), 100);
  let risk = "HIGH";

  if (score >= 60) {
    signal = "BUY CE";
    risk = "LOW";
  } else if (score <= -60) {
    signal = "BUY PE";
    risk = "LOW";
  } else if (Math.abs(score) >= 30) {
    risk = "MEDIUM";
  }

  return {
    signal,
    confidence,
    risk,
    score,
    reasons,
  };
}