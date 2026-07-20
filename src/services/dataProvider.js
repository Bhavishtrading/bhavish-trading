import { marketModel } from "../lib/marketModel";
import { getLiveMarketData } from "./marketDataAdapter";
import { generateTrade } from "./marketEngine";
// import { getYahooMarketData } from "./yahooEngine";
import { generateAISignal } from "./aiEngine";

export async function getMarketData() {
  // Live Market Data (Angel One)
  const live = await getLiveMarketData();

  // Yahoo Finance Data
  const yahoo = null;

  console.log("Live Adapter:", live);
  console.log("Yahoo Engine:", yahoo);

  // Clone Market Model
  const data = structuredClone(marketModel);

  // ----------------------------
  // Live Price
  // ----------------------------
  data.nifty = live?.nifty;
 data.bankNifty = live?.bankNifty;
data.vix = live?.vix;
data.close = live?.close;

  // ----------------------------
  // Temporary Data
  // ----------------------------
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

  // ----------------------------
  // Yahoo Indicators
  // ----------------------------
  if (yahoo) {
    // EMA
    data.ema.ema9 = yahoo.ema9;
    data.ema.ema20 = yahoo.ema20;
    data.ema.ema50 = yahoo.ema50;

    data.ema.trend =
      yahoo.ema9 > yahoo.ema20 && yahoo.ema20 > yahoo.ema50
        ? "Bullish"
        : "Bearish";

    // RSI
    data.rsi = yahoo.rsi ?? 0;

    // MACD
    if (yahoo.macd) {
      data.macd.macd = yahoo.macd.macd;
      data.macd.signal = yahoo.macd.signal;
      data.macd.histogram = yahoo.macd.histogram;
      data.macd.trend = yahoo.macd.trend;
    }

    // ADX
if (yahoo.adx) {
  data.adx.adx = yahoo.adx.adx;
  data.adx.plusDI = yahoo.adx.plusDI;
  data.adx.minusDI = yahoo.adx.minusDI;
  data.adx.trend = yahoo.adx.trend;
}
// ATR
if (yahoo.atr) {
  data.atr.atr = yahoo.atr.atr;
  data.atr.volatility = yahoo.atr.volatility;
}

    // Market Status from RSI
    if (data.rsi >= 60) {
      data.status = "Bullish";
    } else if (data.rsi <= 40) {
      data.status = "Bearish";
    } else {
      data.status = "Sideways";
    }
  }

  // ----------------------------
  // AI Engine
  // ----------------------------
  const ai = generateAISignal({
  ema9: data.ema.ema9,
  ema20: data.ema.ema20,
  ema50: data.ema.ema50,
  rsi: data.rsi,
  macd: data.macd.macd,
  macdSignal: data.macd.signal,
  adx: data.adx.adx,
  atr: data.atr.atr,
});

data.ai.signal = ai.signal;
data.ai.confidence = ai.confidence;
data.ai.risk = ai.risk;
data.ai.score = ai.score;
data.ai.reasons = ai.reasons;

  return data;
}