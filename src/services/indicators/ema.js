export function calculateEMA(prices, period) {
  if (!prices || prices.length < period) {
    return null;
  }

  const multiplier = 2 / (period + 1);

  let ema = prices[0];

  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return Number(ema.toFixed(2));
}

export function getEMAValues(quotes) {
  const closes = quotes.map((q) => q.close);

  return {
    ema9: calculateEMA(closes, 9),
    ema20: calculateEMA(closes, 20),
    ema50: calculateEMA(closes, 50),
  };
}