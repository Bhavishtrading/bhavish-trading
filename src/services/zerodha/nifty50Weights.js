// ======================================================
// NIFTY 50 WEIGHTS
// Reference: 01-Oct-2026 EOD
//
// Source:
// NSE constituent weights as reported by Flash Finance
//
// NIFTY 50:
// - BSE included
// - WIPRO excluded
//
// Displayed weights are rounded to 2 decimals.
// Total displayed weight = 99.98%
// ======================================================

export const NIFTY50_WEIGHTS = {
  HDFCBANK: 10.66,
  ICICIBANK: 9.05,
  RELIANCE: 7.53,
  BHARTIARTL: 5.10,
  LT: 4.17,
  SBIN: 3.80,
  INFY: 3.52,
  AXISBANK: 3.37,
  KOTAKBANK: 2.97,
  BAJFINANCE: 2.49,

  "M&M": 2.46,
  ITC: 2.38,
  ETERNAL: 2.19,
  TCS: 2.04,
  SUNPHARMA: 1.84,
  TITAN: 1.80,
  HINDUNILVR: 1.57,
  NTPC: 1.44,
  MARUTI: 1.43,
  TATASTEEL: 1.42,

  BEL: 1.32,
  HINDALCO: 1.31,
  ADANIPORTS: 1.31,
  SHRIRAMFIN: 1.28,
  HCLTECH: 1.26,
  ULTRACEMCO: 1.22,
  BSE: 1.20,
  JSWSTEEL: 1.14,
  POWERGRID: 1.11,
  GRASIM: 1.08,

  INDIGO: 1.08,
  "BAJAJ-AUTO": 1.06,
  ASIANPAINT: 1.05,
  BAJAJFINSV: 0.97,
  COALINDIA: 0.97,
  TECHM: 0.94,
  ADANIENT: 0.92,
  EICHERMOT: 0.92,
  NESTLEIND: 0.90,
  ONGC: 0.83,

  TRENT: 0.83,
  APOLLOHOSP: 0.81,
  SBILIFE: 0.75,
  CIPLA: 0.73,
  DRREDDY: 0.71,
  MAXHEALTH: 0.67,
  JIOFIN: 0.67,
  TATACONSUM: 0.60,
  TMPV: 0.56,
  HDFCLIFE: 0.55,
};


// ======================================================
// VALIDATE NIFTY 50 WEIGHTS
// ======================================================

export function validateNifty50Weights(
  weights = NIFTY50_WEIGHTS
) {
  const symbols = Object.keys(weights);

  const missingWeights = symbols.filter(
    (symbol) =>
      weights[symbol] === null ||
      weights[symbol] === undefined
  );

  const invalidWeights = symbols.filter((symbol) => {
    const value = Number(weights[symbol]);

    return (
      Number.isNaN(value) ||
      value < 0
    );
  });

  const totalWeight = symbols.reduce(
    (total, symbol) =>
      total + Number(weights[symbol] || 0),
    0
  );

  return {
    stockCount: symbols.length,

    missingWeightCount:
      missingWeights.length,

    invalidWeightCount:
      invalidWeights.length,

    totalWeight:
      Number(totalWeight.toFixed(4)),

    missingWeights,

    invalidWeights,

    isComplete:
      symbols.length === 50 &&
      missingWeights.length === 0 &&
      invalidWeights.length === 0 &&
      Math.abs(totalWeight - 100) < 0.05,
  };
}