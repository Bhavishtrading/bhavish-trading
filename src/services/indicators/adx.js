export function calculateADX(quotes, period = 14) {
  if (!quotes || quotes.length < period + 1) {
    return null;
  }

  let trSum = 0;
  let plusDMSum = 0;
  let minusDMSum = 0;

  for (let i = 1; i < quotes.length; i++) {
    const current = quotes[i];
    const previous = quotes[i - 1];

    const highDiff = current.high - previous.high;
    const lowDiff = previous.low - current.low;

    const plusDM =
      highDiff > lowDiff && highDiff > 0 ? highDiff : 0;

    const minusDM =
      lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0;

    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );

    trSum += tr;
    plusDMSum += plusDM;
    minusDMSum += minusDM;
  }

  if (trSum === 0) {
    return {
      adx: 0,
      plusDI: 0,
      minusDI: 0,
      trend: "Sideways",
    };
  }

  const plusDI = Number(((plusDMSum / trSum) * 100).toFixed(2));
  const minusDI = Number(((minusDMSum / trSum) * 100).toFixed(2));

  const dx =
    ((Math.abs(plusDI - minusDI) / (plusDI + minusDI || 1)) * 100);

  const adx = Number(dx.toFixed(2));

  let trend = "Sideways";

  if (adx >= 25) {
    trend = plusDI > minusDI ? "Bullish" : "Bearish";
  }

  return {
    adx,
    plusDI,
    minusDI,
    trend,
  };
}