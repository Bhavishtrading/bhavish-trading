export function calculateATR(quotes, period = 14) {
  if (!quotes || quotes.length < period + 1) {
    return null;
  }

  const trueRanges = [];

  for (let i = 1; i < quotes.length; i++) {
    const current = quotes[i];
    const previous = quotes[i - 1];

    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );

    trueRanges.push(tr);
  }

  const recentTR = trueRanges.slice(-period);

  const atr =
    recentTR.reduce((sum, value) => sum + value, 0) / period;

  let volatility = "Normal";

  if (atr >= 80) {
    volatility = "High";
  } else if (atr <= 30) {
    volatility = "Low";
  }

  return {
    atr: Number(atr.toFixed(2)),
    volatility,
  };
}