
export function calculateATR(quotes, period = 14) {
  if (!Array.isArray(quotes) || quotes.length < period + 1) {
    return null;
  }

  const candles = quotes.map((q) => ({
    high: Number(q.high),
    low: Number(q.low),
    close: Number(q.close),
  }));

  if (
    candles.some(
      (c) =>
        !Number.isFinite(c.high) ||
        !Number.isFinite(c.low) ||
        !Number.isFinite(c.close)
    )
  ) {
    return null;
  }

  const trueRanges = [];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];

    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );

    trueRanges.push(tr);
  }

  if (trueRanges.length < period) return null;

  // Initial ATR = average of first period TR values
  let atr =
    trueRanges.slice(0, period).reduce(
      (sum, value) => sum + value,
      0
    ) / period;

  // Wilder smoothing
  for (let i = period; i < trueRanges.length; i++) {
    atr = ((atr * (period - 1)) + trueRanges[i]) / period;
  }

  let volatility = "Normal";

  return {
    atr: Number(atr.toFixed(2)),
    volatility,
    period,
    method: "Wilder",
  };
}
