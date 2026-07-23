import { marketModel } from "../lib/marketModel";
import { getLiveMarketData } from "./marketDataAdapter";
import { testInstruments } from "./zerodha/market";
import { getYahooMarketData } from "./yahooEngine";
import { generateAISignal } from "./aiEngine";
import { getLiveOptionData } from "./liveOptionEngine";
import { analyzeOptionChain } from "./optionAnalyzer";
import { calculateOIChange } from "./oiChangeEngine";
import { classifyOIChanges } from "./oiClassifier";
import { analyzeMarketStructure } from "./marketStructure";
import { analyzeMarketBias } from "./marketBias";

import {
  addSnapshot,
  historySize,
} from "./oiHistory";

import {
  saveSnapshot,
  getPreviousSnapshot,
  hasSnapshot,
} from "./oiSnapshot";

import { analyzeOIChange } from "./oiAnalyzer";

export async function getMarketData() {
  console.log("==================================");
  console.log("📊 getMarketData Started");

  const live = await getLiveMarketData();

  // await testInstruments();

  const yahoo = await getYahooMarketData();

  let optionData = null;
  let optionAnalysis = null;
  let oiSignals = [];
  let classifiedSignals = [];
  let marketStructure = null;
  let marketBias = null;

  try {
    optionData = await getLiveOptionData(live.nifty);

    optionAnalysis = analyzeOptionChain(optionData.chain);
    marketStructure = analyzeMarketStructure(optionData.chain);



    console.log("==================================");
console.log("MARKET STRUCTURE");
console.table(marketStructure);

    console.log("==================================");
    console.log("📈 LIVE OPTION DATA");
    console.log(JSON.stringify(optionData, null, 2));

    console.log("==================================");
    console.log("OPTION ANALYSIS");
    console.log(optionAnalysis);

   if (hasSnapshot()) {
  console.log("==================================");
  console.log("Comparing With Previous Snapshot");

  const previousSnapshot = getPreviousSnapshot();

  // Existing Signal Analysis
  oiSignals = analyzeOIChange(
    previousSnapshot,
    optionData.chain
  );
  console.log("OI SIGNALS RAW:");
console.dir(oiSignals, { depth: null });

  console.table(
    oiSignals.map((x) => ({
      Strike: x.strike,
      CE: x.ce.signal,
      PE: x.pe.signal,
    }))
  );

  // NEW OI Change Engine
  const oiChanges = calculateOIChange(
    previousSnapshot,
    optionData.chain
  );

  console.log("==================================");
  console.log("OI CHANGE ENGINE");

  console.table(
    oiChanges.map((item) => ({
      Strike: item.strike,
      CE_OI_Change: item.ce.oiDiff,
      CE_OI_Pct: item.ce.oiChangePct.toFixed(2) + "%",
      PE_OI_Change: item.pe.oiDiff,
      PE_OI_Pct: item.pe.oiChangePct.toFixed(2) + "%",
    }))
  );
  classifiedSignals = classifyOIChanges(oiChanges);
  console.log("===== CLASSIFIED SIGNALS =====");
console.dir(classifiedSignals, { depth: null });

console.log("==================================");
console.log("OI CLASSIFIER");

console.table(
  classifiedSignals.map((item) => ({
    Strike: item.strike,
    CE: item.ce.signal,
    PE: item.pe.signal,
  }))
);
} else {
  console.log("First Snapshot Created...");
}

saveSnapshot(optionData.chain);
addSnapshot(optionData.chain);

console.log("History Size:", historySize());
    console.log("==================================");
  } catch (err) {
    console.error(err);
  }

  const data = structuredClone(marketModel);

  data.nifty = live.nifty;
  data.bankNifty = live.bankNifty;
  data.vix = live.vix;
  data.close = live.close;

  if (optionAnalysis) {
    data.pcr = optionAnalysis.pcr;

    data.optionChain.atm = optionData.atm;
    data.optionChain.maxPain = optionData.atm;

    data.optionChain.highestCallOI =
      optionAnalysis.resistance;

    data.optionChain.highestPutOI =
      optionAnalysis.support;
  } else {
    data.pcr = 0;
  }

  data.strength = 88;

  data.momentum.buying = 82;
  data.momentum.selling = 18;
  data.momentum.trend = "Strong Bullish";
  data.momentum.status = "Increasing";

  if (yahoo) {
    data.ema.ema9 = yahoo.ema9;
    data.ema.ema20 = yahoo.ema20;
    data.ema.ema50 = yahoo.ema50;

    if (
      live.nifty > yahoo.ema9 &&
      yahoo.ema9 > yahoo.ema20 &&
      yahoo.ema20 > yahoo.ema50
    ) {
      data.ema.trend = "Bullish";
    } else if (
      live.nifty < yahoo.ema9 &&
      yahoo.ema9 < yahoo.ema20 &&
      yahoo.ema20 < yahoo.ema50
    ) {
      data.ema.trend = "Bearish";
    } else {
      data.ema.trend = "Sideways";
    }

    data.rsi = yahoo.rsi ?? 0;
        if (yahoo.macd) {
      data.macd.macd = yahoo.macd.macd;
      data.macd.signal = yahoo.macd.signal;
      data.macd.histogram = yahoo.macd.histogram;
      data.macd.trend = yahoo.macd.trend;
    }

    if (yahoo.adx) {
      data.adx.adx = yahoo.adx.adx;
      data.adx.plusDI = yahoo.adx.plusDI;
      data.adx.minusDI = yahoo.adx.minusDI;
      data.adx.trend = yahoo.adx.trend;
    }

    if (yahoo.atr) {
      data.atr.atr = yahoo.atr.atr;
      data.atr.volatility = yahoo.atr.volatility;
    }

    if (data.rsi >= 60) {
      data.status = "Bullish";
    } else if (data.rsi <= 40) {
      data.status = "Bearish";
    } else {
      data.status = "Sideways";
    }
  }

  // --------------------------------
  // Temporary OI Values
  // (Will be replaced in next phase)
  // --------------------------------

 let longBuildUp = 0;
let shortBuildUp = 0;
let shortCovering = 0;
let longUnwinding = 0;

for (const row of classifiedSignals) {
  if (row.ce.signal === "Long Build-up") longBuildUp++;
  if (row.pe.signal === "Long Build-up") longBuildUp++;

  if (row.ce.signal === "Short Build-up") shortBuildUp++;
  if (row.pe.signal === "Short Build-up") shortBuildUp++;

  if (row.ce.signal === "Short Covering") shortCovering++;
  if (row.pe.signal === "Short Covering") shortCovering++;

  if (row.ce.signal === "Long Unwinding") longUnwinding++;
  if (row.pe.signal === "Long Unwinding") longUnwinding++;
}
console.log("==================================");
console.log("COUNT DEBUG");

console.log({
  longBuildUp,
  shortBuildUp,
  shortCovering,
  longUnwinding,
  classifiedSignals: classifiedSignals.length,
});

data.oi.longBuildUp = longBuildUp;
data.oi.shortBuildUp = shortBuildUp;
data.oi.shortCovering = shortCovering;
data.oi.longUnwinding = longUnwinding;

marketBias = analyzeMarketBias({
  marketStructure,
  oi: data.oi,
  pcr: data.pcr,
  emaTrend: data.ema.trend,
  rsi: data.rsi,
  macdTrend: data.macd.trend,
  adx: data.adx.adx,
});

console.log("==================================");
console.log("MARKET BIAS");
console.table(marketBias);

  // --------------------------------
  // AI Engine
  // --------------------------------

  const ai = generateAISignal({
  price: data.nifty,
  ema9: data.ema.ema9,
  ema20: data.ema.ema20,
  ema50: data.ema.ema50,
  rsi: data.rsi,
  macd: data.macd.macd,
  macdSignal: data.macd.signal,
  adx: data.adx.adx,
  atr: data.atr.atr,
  marketBias,
});

  data.ai.signal = ai.signal;
  data.ai.confidence = ai.confidence;
  data.ai.risk = ai.risk;
  data.ai.score = ai.score;
  data.ai.reasons = ai.reasons;

  console.log("==================================");
  console.log("LIVE OI SUMMARY");

  console.table({
    LongBuildUp: data.oi.longBuildUp,
    ShortBuildUp: data.oi.shortBuildUp,
    ShortCovering: data.oi.shortCovering,
    LongUnwinding: data.oi.longUnwinding,
  });

  console.log("==================================");

 // Live Option Chain Data
data.optionChain.chain = optionData?.chain ?? [];
data.optionChain.atm = optionData?.atm ?? null;
data.optionChain.expiry = optionData?.expiry ?? "";

return data;
}