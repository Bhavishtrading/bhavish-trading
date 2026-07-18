import { marketModel } from "../lib/marketModel";
import { getLiveMarketData } from "./marketDataAdapter";
import { generateTrade } from "./marketEngine";

export async function getMarketData() {
  // Live Market Data
  const live = await getLiveMarketData();

  console.log("Live Adapter:", live);

  // Create a copy of market model
  const data = structuredClone(marketModel);

  // Live Data
  data.nifty = live.nifty ?? 24850;
  data.bankNifty = live.bankNifty ?? 56500;
  data.vix = live.vix ?? 12.35;
  data.close = live.close ?? 23962.8;

  // Temporary Values (Later we will replace these with Live APIs)
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

  data.momentum.buying = 82;
  data.momentum.selling = 18;
  data.momentum.trend = "Strong Bullish";
  data.momentum.status = "Increasing";

data.ema.ema9 = 24220;
data.ema.ema20 = 24190;
data.ema.trend = "Bullish";

  // Generate AI Trade
  const trade = generateTrade(data);

  data.ai.signal = trade.signal;
  data.ai.confidence = trade.confidence;
  data.ai.risk = trade.risk;
  data.ai.score = trade.score;
  data.ai.entry = trade.entry;
  data.ai.stopLoss = trade.stopLoss;
  data.ai.target = trade.target;

 data.ai.reasons = trade.reasons;

  return data;
}