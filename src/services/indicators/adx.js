
export function calculateADX(quotes, period = 14) {
  if (!Array.isArray(quotes) || quotes.length < period * 2) {
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

  const trValues = [];
  const plusDMValues = [];
  const minusDMValues = [];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];

    const upMove = current.high - previous.high;
    const downMove = previous.low - current.low;

    const plusDM =
      upMove > downMove && upMove > 0 ? upMove : 0;

    const minusDM =
      downMove > upMove && downMove > 0 ? downMove : 0;

    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );

    trValues.push(tr);
    plusDMValues.push(plusDM);
    minusDMValues.push(minusDM);
  }

  // Initial Wilder sums
  let smoothedTR = trValues
    .slice(0, period)
    .reduce((sum, value) => sum + value, 0);

  let smoothedPlusDM = plusDMValues
    .slice(0, period)
    .reduce((sum, value) => sum + value, 0);

  let smoothedMinusDM = minusDMValues
    .slice(0, period)
    .reduce((sum, value) => sum + value, 0);

  const dxValues = [];

  function calculateDX() {
    if (smoothedTR <= 0) return 0;

    const plusDI = (smoothedPlusDM / smoothedTR) * 100;
    const minusDI = (smoothedMinusDM / smoothedTR) * 100;

    const denominator = plusDI + minusDI;

    if (denominator === 0) return 0;

    return (
      (Math.abs(plusDI - minusDI) / denominator) * 100
    );
  }

  dxValues.push(calculateDX());

  // Wilder smoothing
  for (let i = period; i < trValues.length; i++) {
    smoothedTR =
      smoothedTR - smoothedTR / period + trValues[i];

    smoothedPlusDM =
      smoothedPlusDM -
      smoothedPlusDM / period +
      plusDMValues[i];

    smoothedMinusDM =
      smoothedMinusDM -
      smoothedMinusDM / period +
      minusDMValues[i];

    dxValues.push(calculateDX());
  }

  // Initial ADX = average of first period DX values
  if (dxValues.length < period) return null;

  let adx =
    dxValues.slice(0, period).reduce(
      (sum, value) => sum + value,
      0
    ) / period;

  // Wilder ADX smoothing
  for (let i = period; i < dxValues.length; i++) {
    adx = ((adx * (period - 1)) + dxValues[i]) / period;
  }

  const plusDI =
    smoothedTR > 0
      ? (smoothedPlusDM / smoothedTR) * 100
      : 0;

  const minusDI =
    smoothedTR > 0
      ? (smoothedMinusDM / smoothedTR) * 100
      : 0;

  let trend = "Sideways";

  if (adx >= 25) {
    if (plusDI > minusDI) {
      trend = "Bullish";
    } else if (minusDI > plusDI) {
      trend = "Bearish";
    }
  }

  return {
    adx: Number(adx.toFixed(2)),
    plusDI: Number(plusDI.toFixed(2)),
    minusDI: Number(minusDI.toFixed(2)),
    trend,
    period,
    method: "Wilder",
  };
}
