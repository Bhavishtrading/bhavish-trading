export function analyzeEMA(ema9, ema20) {
  let signal = "Neutral";
  let score = 0;
  const reasons = [];

  if (ema9 > ema20) {
    signal = "Bullish";
    score = 15;
    reasons.push("EMA 9 Above EMA 20");
  } else if (ema9 < ema20) {
    signal = "Bearish";
    score = -15;
    reasons.push("EMA 9 Below EMA 20");
  } else {
    reasons.push("EMA Sideways");
  }

  return {
    signal,
    score,
    reasons,
  };
}