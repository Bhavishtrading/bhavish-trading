import YahooFinance from "yahoo-finance2";
import { calculateIndicators } from "./indicators";

const yahooFinance = new YahooFinance();

console.log("Yahoo Engine Started...");

export async function getYahooMarketData() {
  try {
    const result = await yahooFinance.chart("^NSEI", {
      period1: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      interval: "5m",
    });

    console.log("Yahoo Result Received");
    console.log(result.meta);

    // ==============================
// INDIA VIX TEST
// ==============================
try {
  const vixResult = await yahooFinance.chart("^INDIAVIX", {
    period1: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    interval: "5m",
  });

  console.log("========== INDIA VIX ==========");
  console.log(vixResult.meta);
  console.log(vixResult.quotes?.at(-1));
} catch (err) {
  console.log("========== VIX ERROR ==========");
  console.log(err.message);
}

    const quotes = result.quotes || [];

    if (!quotes.length) {
      return null;
    }

    const last = quotes[quotes.length - 1];

    const indicators = calculateIndicators(quotes);

    return {
      nifty: last.close,
      candleTime: last.date,

      ema9: indicators.ema9,
      ema20: indicators.ema20,
      ema50: indicators.ema50,

      rsi: indicators.rsi,

      macd: indicators.macd,

      adx: indicators.adx,

      atr: indicators.atr,

      quotes,
    };
  } catch (err) {
    console.error("Yahoo Engine Error:", err);
    return null;
  }
}