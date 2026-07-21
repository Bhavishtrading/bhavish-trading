export function calculateEMA(prices, period) {
  if (!prices || prices.length < period) {
    return null;
  }

  // Initial SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }

  let ema = sum / period;

  const multiplier = 2 / (period + 1);

  // EMA calculation
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return Number(ema.toFixed(2));
}

export function getEMAValues(quotes) {
  const closes = quotes
    .map((q) => Number(q.close))
    .filter((v) => Number.isFinite(v));

  return {
    ema9: calculateEMA(closes, 9),
    ema20: calculateEMA(closes, 20),
    ema50: calculateEMA(closes, 50),
  };
}