import { fetchOptionChain } from "./nseApi";

export async function getMarketData() {

  // Future lo ikkada real NSE data vasthundi
  const optionData = await fetchOptionChain();

  console.log("Option Data:", optionData);

  return {
    nifty: 24850,
    change: 120,
    changePercent: 0.48,

    status: "Bullish",

    pcr: 0.96,

    strength: 88,

    oi: {
      longBuildUp: 65,
      shortBuildUp: 20,
      shortCovering: 55,
      longUnwinding: 10,
    },

    optionChain: {
      atm: 24850,
      maxPain: 24900,
      highestCallOI: 25000,
      highestPutOI: 24800,
    },

    ai: {
      signal: "BUY CE",
      confidence: 92,
      risk: "Medium",
    },

    momentum: {
      buying: 82,
      selling: 18,
      trend: "Strong Bullish",
      status: "Increasing",
    },
  };
}