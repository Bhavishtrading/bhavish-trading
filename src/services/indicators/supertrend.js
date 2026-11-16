
export function calculateSupertrend(
  candles,
  period = 10,
  multiplier = 3
) {
  if (
    !Array.isArray(candles) ||
    !Number.isInteger(period) ||
    period < 1 ||
    !Number.isFinite(multiplier) ||
    multiplier <= 0 ||
    candles.length < period
  ) {
    return [];
  }

  const sorted = [...candles].sort(
    (a, b) => a.time - b.time
  );

  const validCandles = sorted.filter((candle) => {
    return (
      Number.isFinite(Number(candle.high)) &&
      Number.isFinite(Number(candle.low)) &&
      Number.isFinite(Number(candle.close))
    );
  });

  if (validCandles.length < period) {
    return [];
  }

  const result = [];

  let trSum = 0;
  let previousATR = null;

  let previousUpperBand = null;
  let previousLowerBand = null;

  // Our convention:
  //  1 = Bullish
  // -1 = Bearish
  let previousTrend = -1;

  let previousClose = null;

  for (let i = 0; i < validCandles.length; i++) {
    const candle = validCandles[i];

    const high = Number(candle.high);
    const low = Number(candle.low);
    const close = Number(candle.close);

    const trueRange =
      previousClose === null
        ? high - low
        : Math.max(
            high - low,
            Math.abs(high - previousClose),
            Math.abs(low - previousClose)
          );

    // ATR initialization using SMA
    let atr;

    if (i < period) {
      trSum += trueRange;
      previousClose = close;

      if (i < period - 1) {
        continue;
      }

      atr = trSum / period;
    } else {
      // Wilder's ATR smoothing
      atr =
        (previousATR * (period - 1) + trueRange) /
        period;
    }

    previousATR = atr;

    const hl2 = (high + low) / 2;

    const basicUpperBand =
      hl2 + multiplier * atr;

    const basicLowerBand =
      hl2 - multiplier * atr;

    // Final Upper Band
    const finalUpperBand =
      previousUpperBand === null ||
      basicUpperBand < previousUpperBand ||
      previousClose > previousUpperBand
        ? basicUpperBand
        : previousUpperBand;

    // Final Lower Band
    const finalLowerBand =
      previousLowerBand === null ||
      basicLowerBand > previousLowerBand ||
      previousClose < previousLowerBand
        ? basicLowerBand
        : previousLowerBand;

    // Trend direction based on previous trend
    let trend;

    if (i === period - 1) {
      trend = -1;
    } else if (previousTrend === -1) {
      // Previous trend was bearish.
      // Switch bullish only after price crosses upper band.
      trend =
        close > finalUpperBand ? 1 : -1;
    } else {
      // Previous trend was bullish.
      // Switch bearish only after price crosses lower band.
      trend =
        close < finalLowerBand ? -1 : 1;
    }

    const supertrend =
      trend === 1
        ? finalLowerBand
        : finalUpperBand;

    result.push({
      time: candle.time,
      value: supertrend,
      trend,
      signal:
        trend !== previousTrend
          ? trend === 1
            ? "BUY"
            : "SELL"
          : null,
      atr,
    });

    previousUpperBand = finalUpperBand;
    previousLowerBand = finalLowerBand;
    previousTrend = trend;
    previousClose = close;
  }

  return result;
}
