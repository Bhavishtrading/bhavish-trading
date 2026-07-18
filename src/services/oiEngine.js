export function analyzeOI(longBuildUp, shortBuildUp, shortCovering, longUnwinding) {

  let signal = "Neutral";
  let score = 0;
  const reasons = [];

  if (longBuildUp > shortBuildUp) {
    signal = "Bullish";
    score += 20;
    reasons.push("Long Build-up Dominating");
  }

  if (shortCovering > longUnwinding) {
    score += 15;
    reasons.push("Short Covering Active");
  }

  if (longUnwinding > longBuildUp) {
    signal = "Bearish";
    score -= 20;
    reasons.push("Long Unwinding Increasing");
  }

  return {
    signal,
    score,
    reasons,
  };
}