export function analyzeOI(
  longBuildUp = 0,
  shortBuildUp = 0,
  shortCovering = 0,
  longUnwinding = 0
) {
  let signal = "Neutral";
  let score = 0;
  const reasons = [];

  // -----------------------------
  // Long Build-up
  // -----------------------------
  if (longBuildUp > shortBuildUp) {
    signal = "Bullish";
    score += 20;
    reasons.push("Long Build-up Dominating");
  }

  // -----------------------------
  // Short Build-up
  // -----------------------------
  if (shortBuildUp > longBuildUp) {
    signal = "Bearish";
    score -= 20;
    reasons.push("Short Build-up Dominating");
  }

  // -----------------------------
  // Short Covering
  // -----------------------------
  if (shortCovering > longUnwinding) {
    score += 15;
    reasons.push("Short Covering Active");
  }

  // -----------------------------
  // Long Unwinding
  // -----------------------------
  if (longUnwinding > shortCovering) {
    score -= 15;
    reasons.push("Long Unwinding Increasing");
  }

  // -----------------------------
  // Normalize Score
  // -----------------------------
  score = Math.max(-35, Math.min(score, 35));

  return {
    signal,
    score,
    reasons,
  };
}