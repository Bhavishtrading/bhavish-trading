import { analyzeOI } from "./oiEngine";
import { calculatePCR, getPCRSignal } from "./pcrEngine";
import { analyzeEMA } from "./emaEngine";

export function generateTrade(data) {
  let score = 0;
  const reasons = [];

  // Price vs Previous Close
  if (data.nifty > data.close) {
    score += 20;
    reasons.push("Price Above Previous Close");
  }

  // EMA Analysis 
 const ema = analyzeEMA(
  data.nifty,
  data.ema.ema9,
  data.ema.ema20,
  data.ema.ema50
);

  score += ema.score;
  reasons.push(...ema.reasons);

  // PCR Analysis (Dummy values for now)
  const pcr = calculatePCR(96000, 100000);
  const pcrSignal = getPCRSignal(pcr);

  if (pcrSignal === "Bullish") {
    score += 15;
    reasons.push("PCR Bullish");
  } else if (pcrSignal === "Strong Bullish") {
    score += 20;
    reasons.push("Strong PCR");
  }

  // OI Analysis
  const oi = analyzeOI(
    data.oi.longBuildUp,
    data.oi.shortBuildUp,
    data.oi.shortCovering,
    data.oi.longUnwinding
  );

  score += oi.score;
  reasons.push(...oi.reasons);

  // Market Strength
  if (data.strength > 80) {
    score += 20;
    reasons.push("Strong Market Strength");
  }

  // Momentum
  if (data.momentum.buying > data.momentum.selling) {
    score += 15;
    reasons.push("Buying Momentum");
  }

  // Limit score
  score = Math.max(0, Math.min(score, 95));

  let signal = "WAIT";
  let risk = "High";

  if (score >= 80) {
    signal = "BUY CE";
    risk = "Low";
  } else if (score >= 60) {
    signal = "BUY CE";
    risk = "Medium";
  } else if (score <= 35) {
    signal = "BUY PE";
    risk = "Low";
  }

  return {
    signal,
    confidence: score,
    score,
    risk,
    entry: Number(data.nifty),
    stopLoss: Number((data.nifty - 40).toFixed(2)),
    target: Number((data.nifty + 80).toFixed(2)),
    reasons,
  };
}