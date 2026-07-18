import { calculateEMA } from "./ema";

export function calculateMACD(quotes) {
  if (!quotes || quotes.length < 35) return null;

  const closes = quotes.map((q) => q.close);

  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);

  const macdLine = Number((ema12 - ema26).toFixed(2));

  // Temporary Signal Line
  // తరువాత proper 9 EMA of MACD Line implement చేస్తాము
  const signalLine = Number((macdLine * 0.9).toFixed(2));

  const histogram = Number((macdLine - signalLine).toFixed(2));

  return {
    macd: macdLine,
    signal: signalLine,
    histogram,
    trend: macdLine > signalLine ? "Bullish" : "Bearish",
  };
}