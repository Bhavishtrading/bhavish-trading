
import { calculateEMA } from "./ema";

export function calculateMACD(quotes) {
  if (!Array.isArray(quotes) || quotes.length < 35) {
    return null;
  }

  const closes = quotes.map((q) => Number(q.close));

  if (closes.some((value) => !Number.isFinite(value))) {
    return null;
  }

  const multiplier = 2 / (12 + 1);
  const ema26Multiplier = 2 / (26 + 1);

  // Build EMA12 and EMA26 series
  function buildEMASeries(values, period) {
    if (values.length < period) return [];

    let sum = 0;

    for (let i = 0; i < period; i++) {
      sum += values[i];
    }

    let ema = sum / period;
    const series = [ema];
    const alpha = 2 / (period + 1);

    for (let i = period; i < values.length; i++) {
      ema = (values[i] - ema) * alpha + ema;
      series.push(ema);
    }

    return series;
  }

  const ema12Series = buildEMASeries(closes, 12);
  const ema26Series = buildEMASeries(closes, 26);

  // Align both series to the same candle positions
  const macdSeries = [];

  const startIndex = 26 - 12;

  for (let i = 0; i < ema26Series.length; i++) {
    macdSeries.push(
      ema12Series[i + startIndex] - ema26Series[i]
    );
  }

  if (macdSeries.length < 9) return null;

  // Proper 9 EMA Signal Line
  let signal = macdSeries
    .slice(0, 9)
    .reduce((sum, value) => sum + value, 0) / 9;

  const signalMultiplier = 2 / (9 + 1);

  for (let i = 9; i < macdSeries.length; i++) {
    signal =
      (macdSeries[i] - signal) * signalMultiplier + signal;
  }

  const macd = macdSeries.at(-1);
  const histogram = macd - signal;

  return {
    macd: Number(macd.toFixed(2)),
    signal: Number(signal.toFixed(2)),
    histogram: Number(histogram.toFixed(2)),
    trend: macd > signal ? "Bullish" : "Bearish",
  };
}
