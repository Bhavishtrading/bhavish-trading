export function generateAISignal(marketData) {
  let score = 0;
  const reasons = [];

  // ==========================
  // Market Bias (Primary Score)
  // ==========================
  if (marketData.marketBias) {
    score += marketData.marketBias.score;

    reasons.push(
      `Market Bias: ${marketData.marketBias.bias} (${marketData.marketBias.score})`
    );
  }

  // ===================================================
  // Legacy Indicator Scoring
  // ===================================================

  // EMA + Price Trend
  if (
    marketData.price > marketData.ema9 &&
    marketData.ema9 > marketData.ema20 &&
    marketData.ema20 > marketData.ema50
  ) {
    score += 20;
    reasons.push("Strong Bullish Trend");
  } else if (
    marketData.price < marketData.ema9 &&
    marketData.ema9 < marketData.ema20 &&
    marketData.ema20 < marketData.ema50
  ) {
    score -= 20;
    reasons.push("Strong Bearish Trend");
  } else {
    reasons.push("Sideways / Mixed Trend");
  }

  // RSI
  if (marketData.rsi >= 55 && marketData.rsi <= 70) {
    score += 15;
    reasons.push("RSI Bullish");
  } else if (marketData.rsi <= 45) {
    score -= 15;
    reasons.push("RSI Bearish");
  }

  // MACD
  const bullishTrend =
    marketData.price > marketData.ema9 &&
    marketData.ema9 > marketData.ema20 &&
    marketData.ema20 > marketData.ema50;

  const bearishTrend =
    marketData.price < marketData.ema9 &&
    marketData.ema9 < marketData.ema20 &&
    marketData.ema20 < marketData.ema50;

  if (marketData.macd > marketData.macdSignal) {
    if (bullishTrend) {
      score += 20;
      reasons.push("MACD Bullish Crossover");
    } else {
      reasons.push("Bullish MACD (Trend Not Confirmed)");
    }
  } else {
    if (bearishTrend) {
      score -= 20;
      reasons.push("MACD Bearish");
    } else {
      reasons.push("Bearish MACD (Trend Not Confirmed)");
    }
  }

  // ADX
  if (marketData.adx >= 25) {
    score += 15;
    reasons.push("Strong Trend");
  } else {
    reasons.push("Weak Trend");
  }

  // ATR
  if (marketData.atr > 0) {
    score += 10;
    reasons.push("Healthy Volatility");
  }

  // ==========================
  // Final Decision
  // ==========================

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

  // ==========================
  // Entry / StopLoss / Targets
  // ==========================

  let entry = marketData.price;
  let stopLoss = marketData.price;
  let target1 = marketData.price;
  let target2 = marketData.price;

  if (signal === "BUY CE") {
    entry = +(marketData.price + 5).toFixed(2);
    stopLoss = +(marketData.price - 25).toFixed(2);
    target1 = +(marketData.price + 40).toFixed(2);
    target2 = +(marketData.price + 80).toFixed(2);
  }

  if (signal === "BUY PE") {
    entry = +(marketData.price - 5).toFixed(2);
    stopLoss = +(marketData.price + 25).toFixed(2);
    target1 = +(marketData.price - 40).toFixed(2);
    target2 = +(marketData.price - 80).toFixed(2);
  }

  return {
    signal,
    confidence,
    risk,
    score,
    entry,
    stopLoss,
    target1,
    target2,
    reasons,
  };
}