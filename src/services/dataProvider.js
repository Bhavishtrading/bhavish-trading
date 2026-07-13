import { marketModel } from "../lib/marketModel";
import { fetchOptionChain } from "./nseApi";
import { getLiveMarketData } from "./marketDataAdapter";

export async function getMarketData() {

  // Future Live Market Data
  const live = await getLiveMarketData();

  console.log("Live Adapter:", live);

  // Future Option Chain Data
  const optionData = await fetchOptionChain();

  console.log("Option Data:", optionData);

  // Create a copy of the market model
  const data = structuredClone(marketModel);

  // Temporary Dummy Values
  data.nifty = live.nifty ?? 24850;
  data.bankNifty = live.bankNifty ?? 56500;
  data.vix = live.vix ?? 12.35;
  data.close = live.close ?? 23962.8;

  data.status = "Bullish";
  data.pcr = 0.96;
  data.strength = 88;

  data.oi.longBuildUp = 65;
  data.oi.shortBuildUp = 20;
  data.oi.shortCovering = 55;
  data.oi.longUnwinding = 10;

  data.optionChain.atm = 24850;
  data.optionChain.maxPain = 24900;
  data.optionChain.highestCallOI = 25000;
  data.optionChain.highestPutOI = 24800;

  data.ai.signal = "BUY CE";
  data.ai.confidence = 92;
  data.ai.risk = "Medium";
  data.ai.score = 95;
  data.ai.reasons = [
    "PCR Bullish",
    "Buying Pressure",
    "Long Build-up",
  ];

  data.momentum.buying = 82;
  data.momentum.selling = 18;
  data.momentum.trend = "Strong Bullish";
  data.momentum.status = "Increasing";

  return data;
}