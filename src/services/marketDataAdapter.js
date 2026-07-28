import { getLiveQuote } from "./zerodha/market";
import { getYahooMarketData } from "./yahooEngine";

console.log("====================================");
console.log("MARKET DATA ADAPTER LOADED");
console.log("====================================");

export async function getLiveMarketData() {
  // -----------------------------
  // Try Zerodha First
  // -----------------------------
  try {
    const live = await getLiveQuote();

    console.log("✅ Zerodha Live Data");

    return {
      nifty: live.nifty,
      bankNifty: live.bankNifty,
      vix: null,
      close: live.niftyClose,
      candles: [],
      source: "Zerodha",
    };
  } catch (err) {
    console.log("❌ Zerodha Failed");
    console.log(err.message);
  }

  // -----------------------------
  // Yahoo Fallback
  // -----------------------------
  try {
    const yahoo = await getYahooMarketData();

    if (!yahoo) {
      throw new Error("Yahoo returned null");
    }

    console.log("✅ Yahoo Fallback Working");

    return {
      nifty: yahoo.nifty,
      bankNifty: null,
      vix: null,
      close: yahoo.nifty,
      candles: yahoo.quotes ?? [],
      source: "Yahoo",
    };
  } catch (err) {
    console.log("❌ Yahoo Failed");
    console.log(err.message);

    return {
      nifty: null,
      bankNifty: null,
      vix: null,
      close: null,
      candles: [],
      source: "Unavailable",
    };
  }
}