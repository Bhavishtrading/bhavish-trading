export function analyzeEMA(price, ema9, ema20, ema50) {
  let signal = "Neutral";
  let score = 0;
  const reasons = [];

  if (price > ema9 && ema9 > ema20 && ema20 > ema50) {
    signal = "Strong Bullish";
    score = 25;
    reasons.push("Price > EMA9 > EMA20 > EMA50");
  } else if (price < ema9 && ema9 < ema20 && ema20 < ema50) {
    signal = "Strong Bearish";
    score = -25;
    reasons.push("Price < EMA9 < EMA20 < EMA50");
  } else if (ema9 > ema20) {
    signal = "Bullish";
    score = 15;
    reasons.push("EMA9 Above EMA20");
  } else if (ema9 < ema20) {
    signal = "Bearish";
    score = -15;
    reasons.push("EMA9 Below EMA20");
  } else {
    signal = "Sideways";
    reasons.push("EMA Trend Not Clear");
  }

  return {
    signal,
    score,
    reasons,
  };
}