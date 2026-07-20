import { analyzeOI } from "./oiEngine";
import { calculatePCR, getPCRSignal } from "./pcrEngine";
import { analyzeEMA } from "./emaEngine";

export function generateTrade(data) {
  let score = 0;
  const reasons = [];

  // -----------------------------
  // Price vs Previous Close
  // -----------------------------
  if (data.nifty > data.close) {
    score += 20;
    reasons.push("Price Above Previous Close");
  } else {
    score -= 10;
    reasons.push("Price Below Previous Close");
  }

  // -----------------------------
  // EMA Analysis
  // -----------------------------
  const ema = analyzeEMA(
    data.nifty,
    data.ema.ema9,
    data.ema.ema20,
    data.ema.ema50
  );

  score += ema.score;
  reasons.push(...ema.reasons);

  // -----------------------------
  // PCR Analysis
  // -----------------------------
  const pcr = calculatePCR(96000, 100000); // Live values later

  const pcrResult = getPCRSignal(pcr);

  score += pcrResult.score;
  reasons.push(`PCR : ${pcrResult.signal}`);

  // -----------------------------
  // OI Analysis
  // -----------------------------
  const oi = analyzeOI(
    data.oi.longBuildUp,
    data.oi.shortBuildUp,
    data.oi.shortCovering,
    data.oi.longUnwinding
  );

  score += oi.score;
  reasons.push(...oi.reasons);

  // -----------------------------
  // Market Strength
  // -----------------------------
  if (data.strength >= 80) {
    score += 20;
    reasons.push("Strong Market");
  } else if (data.strength >= 60) {
    score += 10;
    reasons.push("Healthy Market");
  } else {
    reasons.push("Weak Market");
  }

  // -----------------------------
  // Momentum
  // -----------------------------
  if (data.momentum.buying > data.momentum.selling) {
    score += 15;
    reasons.push("Buying Momentum");
  } else if (data.momentum.buying < data.momentum.selling) {
    score -= 15;
    reasons.push("Selling Momentum");
  }

  // -----------------------------
  // Normalize Score
  // -----------------------------
  score = Math.max(0, Math.min(score, 100));

  let signal = "WAIT";
  let risk = "HIGH";

  if (score >= 80) {
    signal = "BUY CE";
    risk = "LOW";
  } else if (score >= 60) {
    signal = "BUY CE";
    risk = "MEDIUM";
  } else if (score >= 40) {
    signal = "WAIT";
    risk = "MEDIUM";
  } else {
    signal = "BUY PE";
    risk = "LOW";
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