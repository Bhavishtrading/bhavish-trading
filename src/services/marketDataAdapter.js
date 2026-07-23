import { getLiveQuote } from "./zerodha/market";

console.log("====================================");
console.log("ZERODHA MARKET DATA ADAPTER LOADED");
console.log("====================================");

export async function getLiveMarketData() {
  try {
  const live = await getLiveQuote();

    console.log("========== ZERODHA LIVE DATA ==========");
    console.log(live);

    return {
      nifty: live.nifty,
      bankNifty: live.bankNifty,
      vix: null,
      close: live.niftyClose,
      candles: [],
      source: "Zerodha",
    };
  } catch (error) {
  console.error("========== ZERODHA ERROR ==========");
  console.error(error);

  if (error.stack) {
    console.error(error.stack);
  }

  return {
    nifty: null,
    bankNifty: null,
    vix: null,
    close: null,
    candles: [],
    source: "Error",
  };
}
}