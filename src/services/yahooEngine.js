import YahooFinance from "yahoo-finance2";
import { getEMAValues } from "./indicators/ema";

const yahooFinance = new YahooFinance();

export async function getYahooMarketData() {
  try {
    const result = await yahooFinance.chart("^NSEI", {
      period1: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      interval: "5m",
    });

    const quotes = result.quotes || [];

    if (!quotes.length) {
      return null;
    }

    const last = quotes[quotes.length - 1];
    const ema = getEMAValues(quotes);

    return {
      nifty: last.close,
      candleTime: last.date,
      ema9: ema.ema9,
      ema20: ema.ema20,
      ema50: ema.ema50,
      quotes,
    };
  } catch (err) {
    console.error("Yahoo Engine Error:", err);
    return null;
  }
}