import YahooFinance from "yahoo-finance2";
import { getEMAValues } from "./indicators/ema";
import { calculateRSI } from "./indicators/rsi";
import { calculateMACD } from "./indicators/macd";
import { calculateADX } from "./indicators/adx";
import { calculateATR } from "./indicators/atr";

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

    return {
      nifty: last.close,
      candleTime: last.date,

      ...getEMAValues(quotes),

      rsi: calculateRSI(quotes),

      macd: calculateMACD(quotes),

      adx: calculateADX(quotes),

      atr: calculateATR(quotes),

      quotes,
    };
  } catch (err) {
    console.error("Yahoo Engine Error:", err);
    return null;
  }
}