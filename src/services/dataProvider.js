import { marketModel } from "../lib/marketModel";
import { getLiveMarketData } from "./marketDataAdapter";
import { getYahooMarketData } from "./yahooEngine";

import {
  getNiftyHistoricalData
} from "./zerodha/market";

import { generateAISignal } from "./aiEngine";

import { getLiveOptionData } from "./liveOptionEngine";
import { analyzeOptionChain } from "./optionAnalyzer";

import { calculateOIChange } from "./oiChangeEngine";
import { classifyOIChanges } from "./oiClassifier";

import { analyzeMarketStructure } from "./marketStructure";
import { analyzeMarketBias } from "./marketBias";

import { analyzeOITrend } from "./oiTrendEngine";
import { analyzeOILeaders } from "./oiLeaders";
import {
  shouldTakeSnapshot,
  getLastSnapshotTime,
} from "./snapshotScheduler";

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
import { getOIChangeSummary } from "./oiChangeSummary";
import { calculateNiftyTechnicalIndicators } from "./nifty/technicalEngine";
import { calculateNiftyLevels } from "./nifty/levelEngine";
import { calculateNiftyIntelligence } from "./nifty/intelligenceEngine";

export async function getMarketData() {
  console.log("==================================");
  console.log("📊 getMarketData Started");

  const live = await getLiveMarketData();
  
  const niftyHistorical = await getNiftyHistoricalData(
  "5minute",
  5
);

console.log(
  "NIFTY HISTORICAL CANDLES:",
  niftyHistorical.candles.length
);

  // await testInstruments();

  const yahoo = await getYahooMarketData();
  const niftyTechnical =
  calculateNiftyTechnicalIndicators(
    niftyHistorical.candles
  );

const niftyLevels =
  calculateNiftyLevels(
    niftyHistorical.candles,
    live.nifty
  );

console.log("NIFTY TECHNICAL:", niftyTechnical);
console.log("NIFTY LEVELS:", niftyLevels);
const niftyIntelligence =
  calculateNiftyIntelligence({
    currentPrice: live.nifty,
    technical: niftyTechnical,
    levels: niftyLevels,
    marketBias: {
      confidence: 0,
      reasons: [],
    },
    pcr: null,
  });

console.log(
  "NIFTY INTELLIGENCE:",
  niftyIntelligence
);

  let optionData = null;
  let optionAnalysis = null;
  let oiSignals = [];
  let classifiedSignals = [];
  let marketStructure = null;
  let marketBias = null;
  let oiTrend = [];

  let oiSummary = {
  topCEIncrease: [],
  topPEIncrease: [],
  topCEDecrease: [],
  topPEDecrease: [],
};

  try {
    optionData = await getLiveOptionData(live.nifty);

const takeSnapshot = shouldTakeSnapshot();

console.log("==================================");
console.log("DEBUG SNAPSHOT");
console.log("takeSnapshot :", takeSnapshot);
console.log("hasSnapshot  :", hasSnapshot());
console.log("historySize  :", historySize());
console.log("==================================");

    // =========================================
// Snapshot Compare
// =========================================



 const analysisChain =
  optionData.fullChain && optionData.fullChain.length > 0
    ? optionData.fullChain
    : optionData.chain;

console.log("==================================");
console.log("ANALYSIS CHAIN");
console.log("Rows :", analysisChain.length);
console.log("==================================");

optionAnalysis = analyzeOptionChain(analysisChain);

marketStructure = analyzeMarketStructure(analysisChain);



    console.log("==================================");
console.log("MARKET STRUCTURE");
console.table(marketStructure);

    console.log("==================================");
    console.log("📈 LIVE OPTION DATA");
    console.log(JSON.stringify(optionData, null, 2));

    console.log("==================================");
    console.log("OPTION ANALYSIS");
    console.log(optionAnalysis);

 // =========================================
// Snapshot Compare
// =========================================
if (hasSnapshot()) {

  console.log("==================================");
  console.log("📊 Comparing Previous Snapshot");

  const previousSnapshot = getPreviousSnapshot();

  console.log("Previous Snapshot Rows:", previousSnapshot?.length ?? 0);
  console.log("Current Snapshot Rows :", optionData.chain.length);

  // -------------------------
  // Calculate OI Difference
  // -------------------------
  const oiChanges = calculateOIChange(
    previousSnapshot,
    optionData.chain
  );
  console.log("OI Changes Count:", oiChanges.length);
console.log("First OI Change:", oiChanges[0]);
console.table(oiChanges.slice(0, 5));

  // -------------------------
  // Classify Signals
  // -------------------------
  classifiedSignals = classifyOIChanges(
    previousSnapshot,
    optionData.chain
  );

  // -------------------------
  // OI Summary
  // -------------------------
  oiSummary = getOIChangeSummary(oiChanges);

  // -------------------------
  // Merge OI Change
  // -------------------------
  for (const change of oiChanges) {

    const row = optionData.chain.find(
      x => x.strike === change.strike
    );

    if (!row) continue;

    if (row.ce) {
      row.ce.oiChange = change.ce.oiDiff;
    }

    if (row.pe) {
      row.pe.oiChange = change.pe.oiDiff;
    }
  }

  console.log("==================================");
  console.log("✅ Snapshot Compare Completed");

  console.table(
    optionData.chain.map(x => ({
      Strike: x.strike,
      CE_OI_Change: x.ce?.oiChange,
      PE_OI_Change: x.pe?.oiChange,
    }))
  );

} else {

  console.log("==================================");
  console.log("📸 First Snapshot - No Comparison");
}

console.log("Previous Snapshot Rows:", getPreviousSnapshot()?.length);
console.log("Current Chain Rows:", optionData.chain.length);
// ======================================
// Snapshot Scheduler
// ======================================


// =========================================
// Save Snapshot
// =========================================
if (takeSnapshot) {

  console.log("==================================");
  console.log("📸 Saving Current Snapshot");

  saveSnapshot(optionData.chain);

  addSnapshot(optionData.chain);

  // Update Trend only when enough history exists
  if (historySize() >= 2) {
    oiTrend = analyzeOITrend();
  } else {
    oiTrend = [];
  }

  console.log("History Size :", historySize());
  console.log("OI Trend Rows:", oiTrend.length);
  console.log("==================================");

} else {

  console.log("==================================");
  console.log("⏳ Waiting For Next Snapshot");
  console.log(
    "Last Snapshot:",
    getLastSnapshotTime()?.toLocaleTimeString()
  );
}

const oiLeaders = analyzeOILeaders(optionData.chain);


console.log("==================================");
console.log("OI LEADERS");

console.table({
  CallWriting: oiLeaders.callWriting
    ? `${oiLeaders.callWriting.strike} CE (${oiLeaders.callWriting.oi})`
    : "-",

  PutWriting: oiLeaders.putWriting
    ? `${oiLeaders.putWriting.strike} PE (${oiLeaders.putWriting.oi})`
    : "-",
});

console.log("History Size:", historySize());
    console.log("==================================");
  } catch (err) {
    console.error(err);
  }

  const data = structuredClone(marketModel);

const oiLeaders = analyzeOILeaders(optionData?.chain ?? []);

data.oiLeaders = {
  callWriting: oiLeaders.callWriting,
  putWriting: oiLeaders.putWriting,
  callUnwinding: oiLeaders.callUnwinding,
  putUnwinding: oiLeaders.putUnwinding,
};

  data.nifty = live.nifty;
  data.bankNifty = live.bankNifty;
  data.vix = live.vix;
  data.close = live.close;

  if (optionAnalysis) {
    data.pcr = optionAnalysis.pcr;

    data.optionChain.atm = optionData.atm;
   data.optionChain.maxPain = optionAnalysis.maxPain;

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

let totalSignals = 0;

for (const row of classifiedSignals) {
  totalSignals += 2;

  if (row.ce.signal === "Long Build-up") longBuildUp++;
  if (row.pe.signal === "Long Build-up") longBuildUp++;

  if (row.ce.signal === "Short Build-up") shortBuildUp++;
  if (row.pe.signal === "Short Build-up") shortBuildUp++;

  if (row.ce.signal === "Short Covering") shortCovering++;
  if (row.pe.signal === "Short Covering") shortCovering++;

  if (row.ce.signal === "Long Unwinding") longUnwinding++;
  if (row.pe.signal === "Long Unwinding") longUnwinding++;
}

if (totalSignals > 0) {
  data.oi.longBuildUp = Math.round((longBuildUp / totalSignals) * 100);
  data.oi.shortBuildUp = Math.round((shortBuildUp / totalSignals) * 100);
  data.oi.shortCovering = Math.round((shortCovering / totalSignals) * 100);
  data.oi.longUnwinding = Math.round((longUnwinding / totalSignals) * 100);
} else {
  data.oi.longBuildUp = 0;
  data.oi.shortBuildUp = 0;
  data.oi.shortCovering = 0;
  data.oi.longUnwinding = 0;
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


marketBias = analyzeMarketBias({
  marketStructure,
  oi: data.oi,
  pcr: data.pcr,
  emaTrend: data.ema.trend,
  rsi: data.rsi,
  macdTrend: data.macd.trend,
  adx: data.adx.adx,
});
const finalNiftyIntelligence =
  calculateNiftyIntelligence({
    currentPrice: live.nifty,
    technical: niftyTechnical,
    levels: niftyLevels,
    marketBias: marketBias,
    pcr: data.pcr,
  });

data.niftyIntelligence = finalNiftyIntelligence;
// ------------------------------
// Market Structure
// ------------------------------

if (marketStructure) {
  data.marketStructure.trend = marketStructure.trend;
  data.marketStructure.support = marketStructure.support;
  data.marketStructure.resistance = marketStructure.resistance;
}
// ------------------------------
// Market Bias
// ------------------------------

if (marketBias) {
  data.marketBias.signal = marketBias.signal;
  data.marketBias.confidence = marketBias.confidence;
  data.marketBias.reasons = marketBias.reasons;
}

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

// ------------------------------
// OI Trend Summary
// ------------------------------

let bullish = 0;
let bearish = 0;
let neutral = 0;

for (const row of oiTrend) {
  if (row.ce.trend === "Bullish") bullish++;
  else if (row.ce.trend === "Bearish") bearish++;
  else neutral++;

  if (row.pe.trend === "Bullish") bullish++;
  else if (row.pe.trend === "Bearish") bearish++;
  else neutral++;
}

const total = bullish + bearish + neutral;

if (total > 0) {
  data.oiTrend.bullish = Math.round((bullish / total) * 100);
  data.oiTrend.bearish = Math.round((bearish / total) * 100);
  data.oiTrend.neutral = Math.round((neutral / total) * 100);
}
data.oiSummary = oiSummary;

return data;
}