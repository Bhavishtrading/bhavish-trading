
import { marketModel } from "../lib/marketModel";
import { getLiveMarketData } from "./marketDataAdapter";
import { getYahooMarketData } from "./yahooEngine";

import {
  getNiftyHistoricalData,
  getNiftyFutureHistoricalData,
} from "./zerodha/market";

import { calculateFuturesVolume } from "./nifty/futuresVolumeEngine";

import { generateAISignal } from "./aiEngine";
import { getLiveOptionData } from "./liveOptionEngine";
import { analyzeOptionChain } from "./optionAnalyzer";

import { calculateOIChange } from "./oiChangeEngine";
import { classifyOIChanges } from "./oiClassifier";

import { analyzeMarketStructure } from "./marketStructure";
import { analyzeMarketBias } from "./marketBias";
import { getNiftyFutureVWAP } from "@/services/zerodha/niftyFutureVWAP";

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

import { calculateBhavishScore } from "@/services/bhavishScoreEngine";


// ======================================================
// SAFE NUMBER
// ======================================================

function safeNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}


// ======================================================
// GET MARKET DATA
// ======================================================

export async function getMarketData() {
  console.log("==================================");
  console.log("BHAVISH MARKET DATA STARTED");
  console.log("==================================");

  // ====================================================
  // 1. LIVE MARKET DATA
  // ====================================================

  const live = await getLiveMarketData();

  // ====================================================
  // 2. NIFTY SPOT 5M HISTORICAL DATA
  // ====================================================

  const niftyHistorical = await getNiftyHistoricalData(
    "5minute",
    5
  );

  console.log(
    "NIFTY SPOT 5M CANDLES:",
    niftyHistorical?.candles?.length ?? 0
  );
    // ====================================================
  // NIFTY SPOT VWAP DEBUG
  // ====================================================

  console.log("========== NIFTY SPOT VWAP DEBUG ==========");

  console.log(
    "Latest Candle:",
    niftyHistorical?.candles?.slice(-1)[0]
  );

  console.log(
    "Last 5 Candle Volumes:",
    niftyHistorical?.candles?.slice(-5).map(c => ({
      time: c.time,
      close: c.close,
      volume: c.volume
    }))
  );

  console.log(
    "Total Volume:",
    niftyHistorical?.candles?.reduce(
      (sum, c) => sum + (Number(c.volume) || 0),
      0
    )
  );

  console.log("===========================================");

  // ====================================================
  // 3. NIFTY FUTURES 5M DATA
  // ====================================================

  let niftyFutureHistorical = null;
  let futuresVolume = null;

  try {
    niftyFutureHistorical = await getNiftyFutureHistoricalData(
      "5minute",
      5
    );

    futuresVolume = calculateFuturesVolume(
      niftyFutureHistorical?.candles ?? []
    );

    console.log("NIFTY FUTURES VOLUME:", futuresVolume);
  } catch (error) {
    console.error(
      "NIFTY FUTURES VOLUME ERROR:",
      error.message
    );
  }

  // ====================================================
  // 4. NIFTY FUTURES VWAP
  // ====================================================

  let niftyFutureVWAP = null;

  try {
    niftyFutureVWAP = await getNiftyFutureVWAP();
  } catch (error) {
    console.error(
      "NIFTY FUTURES VWAP ERROR:",
      error.message
    );
  }

  // ====================================================
  // 5. YAHOO MARKET DATA
  // ====================================================

  const yahoo = await getYahooMarketData();

  // ====================================================
  // 6. NIFTY SPOT TECHNICAL INDICATORS
  // ====================================================

  const niftyTechnical =
    calculateNiftyTechnicalIndicators(
      niftyHistorical?.candles ?? []
    );

  console.log("NIFTY 5M TECHNICAL:", niftyTechnical);

  // ====================================================
  // 7. NIFTY LEVELS
  // ====================================================

  const niftyLevels = calculateNiftyLevels(
    niftyHistorical?.candles ?? [],
    live.nifty
  );

  console.log("NIFTY LEVELS:", niftyLevels);

  // ====================================================
  // 8. INITIAL NIFTY INTELLIGENCE
  // ====================================================

  const niftyIntelligence = calculateNiftyIntelligence({
    currentPrice: live.nifty,
    technical: niftyTechnical,
    levels: niftyLevels,
    marketBias: {
      confidence: 0,
      reasons: [],
    },
    pcr: null,
  });

  // ====================================================
  // 9. OPTION DATA VARIABLES
  // ====================================================

  let optionData = null;
  let optionAnalysis = null;

  let oiSignals = [];
  let classifiedSignals = [];

  let marketStructure = null;
  let marketBias = null;
  let oiTrend = [];

  // OI CHANGE DATA
  let oiChanges = [];

  let ceOIChange = null;
  let peOIChange = null;

  let oiSummary = {
    topCEIncrease: [],
    topPEIncrease: [],
    topCEDecrease: [],
    topPEDecrease: [],
  };

  // ====================================================
  // 10. LIVE OPTION CHAIN
  // ====================================================

  try {
    optionData = await getLiveOptionData(live.nifty);

    if (!optionData) {
      throw new Error("Option data unavailable");
    }

    console.log("==================================");
    console.log("LIVE OPTION DATA");
    console.log("==================================");

    console.log(
      "OPTION CHAIN ROWS:",
      optionData.chain?.length ?? 0
    );

    // ==================================================
    // ANALYSIS CHAIN
    // ==================================================

    const analysisChain =
      optionData.fullChain &&
      optionData.fullChain.length > 0
        ? optionData.fullChain
        : optionData.chain ?? [];

    console.log(
      "ANALYSIS CHAIN ROWS:",
      analysisChain.length
    );

    optionAnalysis = analyzeOptionChain(analysisChain);

    marketStructure = analyzeMarketStructure(analysisChain);

    console.log("OPTION ANALYSIS:", optionAnalysis);
    console.log("MARKET STRUCTURE:", marketStructure);

    // ==================================================
    // 11. SNAPSHOT COMPARISON
    // ==================================================

    const takeSnapshot = shouldTakeSnapshot();

    console.log("==================================");
    console.log("SNAPSHOT DEBUG");
    console.log("takeSnapshot:", takeSnapshot);
    console.log("hasSnapshot:", await hasSnapshot());
    console.log("historySize:", historySize());
    console.log("==================================");

    if (await hasSnapshot()) {
      const previousSnapshot = await getPreviousSnapshot();

      console.log(
        "PREVIOUS SNAPSHOT ROWS:",
        previousSnapshot?.length ?? 0
      );

      console.log(
        "CURRENT SNAPSHOT ROWS:",
        optionData.chain?.length ?? 0
      );

      // ----------------------------------------------
      // CALCULATE OI DIFFERENCE
      // ----------------------------------------------

      oiChanges = calculateOIChange(
        previousSnapshot,
        optionData.chain
      );

      console.log("OI CHANGES COUNT:", oiChanges.length);
      console.log("FIRST OI CHANGE:", oiChanges[0]);

      // ----------------------------------------------
      // CLASSIFY OI SIGNALS
      // ----------------------------------------------

      classifiedSignals = classifyOIChanges(
        previousSnapshot,
        optionData.chain
      );

      // ----------------------------------------------
      // OI SUMMARY
      // ----------------------------------------------

      oiSummary = getOIChangeSummary(oiChanges);

      // ----------------------------------------------
      // AGGREGATE CE AND PE OI CHANGE
      // ----------------------------------------------

      ceOIChange = oiChanges.reduce(
        (sum, item) =>
          sum + (Number(item.ce?.oiDiff) || 0),
        0
      );

      peOIChange = oiChanges.reduce(
        (sum, item) =>
          sum + (Number(item.pe?.oiDiff) || 0),
        0
      );

      console.log("TOTAL CE OI CHANGE:", ceOIChange);
      console.log("TOTAL PE OI CHANGE:", peOIChange);

      // ----------------------------------------------
      // MERGE OI CHANGE INTO OPTION CHAIN
      // ----------------------------------------------

      for (const change of oiChanges) {
        const row = optionData.chain.find(
          (item) => item.strike === change.strike
        );

        if (!row) continue;

        if (row.ce) {
          row.ce.oiChange = change.ce.oiDiff;
        }

        if (row.pe) {
          row.pe.oiChange = change.pe.oiDiff;
        }
      }

      console.log("OI SNAPSHOT COMPARISON COMPLETED");
    } else {
      console.log(
        "FIRST SNAPSHOT - OI CHANGE NOT AVAILABLE YET"
      );
    }

    // ==================================================
    // 12. SAVE SNAPSHOT
    // ==================================================

    if (takeSnapshot) {
      console.log("SAVING OI SNAPSHOT");

      await saveSnapshot(optionData.chain);

      addSnapshot(optionData.chain);

      if (historySize() >= 2) {
        oiTrend = analyzeOITrend();
      } else {
        oiTrend = [];
      }

      console.log("HISTORY SIZE:", historySize());
      console.log("OI TREND ROWS:", oiTrend.length);
    } else {
      console.log("WAITING FOR NEXT OI SNAPSHOT");

      console.log(
        "LAST SNAPSHOT:",
        getLastSnapshotTime()?.toLocaleTimeString()
      );
    }

    // ==================================================
    // 13. OI LEADERS
    // ==================================================

    const oiLeaders = analyzeOILeaders(
      optionData.chain
    );

    console.log("OI LEADERS:", oiLeaders);
  } catch (error) {
    console.error("OPTION DATA ERROR:", error);
  }

  // ====================================================
  // 14. BASE MARKET MODEL
  // ====================================================

  const data = structuredClone(marketModel);

  data.vwap = niftyFutureVWAP ?? null;

  data.macd15m = niftyTechnical?.macd15m ?? null;

  // ====================================================
  // 15. OI LEADERS
  // ====================================================

  const oiLeaders = analyzeOILeaders(
    optionData?.chain ?? []
  );

  data.oiLeaders = {
    callWriting: oiLeaders.callWriting,
    putWriting: oiLeaders.putWriting,
    callUnwinding: oiLeaders.callUnwinding,
    putUnwinding: oiLeaders.putUnwinding,
  };

  // ====================================================
  // 16. LIVE INDEX VALUES
  // ====================================================

  data.nifty = live.nifty;
  data.bankNifty = live.bankNifty;
  data.vix = live.vix;
  data.close = live.close;

  // ====================================================
  // 17. PCR AND OPTION CHAIN DETAILS
  // ====================================================

  if (optionAnalysis) {
    data.pcr = optionAnalysis.pcr;

    data.pcrDetails = {
      value: optionAnalysis.pcr ?? 0,

      ceOI:
        optionAnalysis.totalCallOI ??
        optionAnalysis.totalCEOI ??
        optionAnalysis.ceOI ??
        0,

      peOI:
        optionAnalysis.totalPutOI ??
        optionAnalysis.totalPEOI ??
        optionAnalysis.peOI ??
        0,

      expiry: optionData?.expiry ?? "",
    };

    data.optionChain.atm = optionData?.atm ?? null;

    data.optionChain.maxPain = optionAnalysis.maxPain;

    data.optionChain.highestCallOI =
      optionAnalysis.resistance;

    data.optionChain.highestPutOI =
      optionAnalysis.support;
  } else {
    data.pcr = 0;

    data.pcrDetails = {
      value: 0,
      ceOI: 0,
      peOI: 0,
      expiry: "",
    };
  }

  // ====================================================
  // 18. MARKET STRENGTH
  // ====================================================

  data.strength = 88;

  data.momentum.buying = 82;
  data.momentum.selling = 18;
  data.momentum.trend = "Strong Bullish";
  data.momentum.status = "Increasing";

  // ====================================================
  // 19. YAHOO LEGACY DASHBOARD INDICATORS
  // ====================================================

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

  // ====================================================
  // 20. OI CLASSIFICATION COUNTS
  // ====================================================

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
    data.oi.longBuildUp = Math.round(
      (longBuildUp / totalSignals) * 100
    );

    data.oi.shortBuildUp = Math.round(
      (shortBuildUp / totalSignals) * 100
    );

    data.oi.shortCovering = Math.round(
      (shortCovering / totalSignals) * 100
    );

    data.oi.longUnwinding = Math.round(
      (longUnwinding / totalSignals) * 100
    );
  } else {
    data.oi.longBuildUp = 0;
    data.oi.shortBuildUp = 0;
    data.oi.shortCovering = 0;
    data.oi.longUnwinding = 0;
  }

  console.log("OI CLASSIFICATION COUNTS:", {
    longBuildUp,
    shortBuildUp,
    shortCovering,
    longUnwinding,
  });

  // ====================================================
  // 21. MARKET BIAS
  // ====================================================

  marketBias = analyzeMarketBias({
    marketStructure,
    oi: data.oi,
    pcr: data.pcr,
    emaTrend: data.ema.trend,
    rsi: data.rsi,
    macdTrend: data.macd.trend,
    adx: data.adx.adx,
  });

  // ====================================================
  // 22. FINAL NIFTY INTELLIGENCE
  // ====================================================

  const finalNiftyIntelligence =
    calculateNiftyIntelligence({
      currentPrice: live.nifty,
      technical: niftyTechnical,
      levels: niftyLevels,
      marketBias,
      pcr: data.pcr,
    });

  data.niftyIntelligence = finalNiftyIntelligence;

  // ====================================================
  // 23. MARKET STRUCTURE
  // ====================================================

  if (marketStructure) {
    data.marketStructure.trend = marketStructure.trend;
    data.marketStructure.support = marketStructure.support;
    data.marketStructure.resistance = marketStructure.resistance;
  }

  // ====================================================
  // 24. MARKET BIAS OUTPUT
  // ====================================================

  if (marketBias) {
    data.marketBias.signal = marketBias.bias;
    data.marketBias.confidence = marketBias.confidence;
    data.marketBias.score = marketBias.score;
    data.marketBias.reasons = marketBias.reasons;
  }

  console.log("MARKET BIAS:", marketBias);

  // ====================================================
  // 25. BHAVISH SCORE - REAL DATA INPUTS
  // ====================================================

  // EMA from Zerodha NIFTY Spot 5M
  const scoreEMA = niftyTechnical?.ema ?? null;

  // MACD from Zerodha NIFTY Spot 5M
  const scoreMACD = niftyTechnical?.macd ?? null;

  // ADX from Zerodha NIFTY Spot 5M
  const scoreADX = niftyTechnical?.adx ?? null;

  // RSI engine returns an object: { value, trend }
  const scoreRSI = safeNumber(
    niftyTechnical?.rsi?.value
  );

  // CE and PE OI totals from live option chain
  const scoreCEOI = safeNumber(
    optionAnalysis?.totalCallOI ??
    optionAnalysis?.totalCEOI ??
    optionAnalysis?.ceOI
  );

  const scorePEOI = safeNumber(
    optionAnalysis?.totalPutOI ??
    optionAnalysis?.totalPEOI ??
    optionAnalysis?.peOI
  );

  // PCR from live option chain
  const scorePCR = safeNumber(
    optionAnalysis?.pcr
  );

  // OI changes from previous 10-minute snapshot
  const scoreCEOIChange = ceOIChange;
  const scorePEOIChange = peOIChange;

  // Volume from NIFTY Futures 5M candles
  const scoreVolumeRatio = safeNumber(
    futuresVolume?.volumeRatio
  );

  const scoreCandleDirection =
    futuresVolume?.candleDirection ?? "neutral";

  console.log("==================================");
  console.log("BHAVISH SCORE INPUT DEBUG");
  console.log("==================================");

  console.log({
    EMA: scoreEMA,
    MACD_5M: scoreMACD,
    ADX_5M: scoreADX,
    RSI_5M: scoreRSI,
    TOTAL_CE_OI: scoreCEOI,
    TOTAL_PE_OI: scorePEOI,
    CE_OI_CHANGE_10M: scoreCEOIChange,
    PE_OI_CHANGE_10M: scorePEOIChange,
    PCR: scorePCR,
    FUTURES_VOLUME_RATIO: scoreVolumeRatio,
    FUTURES_CANDLE_DIRECTION: scoreCandleDirection,
  });

  // ====================================================
  // 26. CALCULATE BHAVISH SCORE
  // ====================================================

  const bhavishScore = calculateBhavishScore({
    price: live.nifty,

    ema: scoreEMA,

    macd5m: scoreMACD,

    adx: scoreADX,

    rsi: scoreRSI,

    oi: {
      totalCEOI: scoreCEOI,
      totalPEOI: scorePEOI,
      ceOIChange: scoreCEOIChange,
      peOIChange: scorePEOIChange,
    },

    pcr: scorePCR,

    volume: {
      ratio: scoreVolumeRatio,
      candleDirection: scoreCandleDirection,
    },
  });

  console.log("==================================");
  console.log("BHAVISH AI SCORE");
  console.log("==================================");

  console.log("Score:", bhavishScore.score);
  console.log("State:", bhavishScore.state);
  console.log("Action:", bhavishScore.action);
  console.log("Factors:", bhavishScore.factors);

  // ====================================================
  // 27. AI SIGNAL ENGINE
  // ====================================================

  const ai = generateAISignal({
    // PRICE
    price: data.nifty,

    // EMA
    ema9: data.ema.ema9,
    ema20: data.ema.ema20,
    ema50: data.ema.ema50,

    // RSI
    rsi: data.rsi,

    // 5M MACD
    macd5m: niftyTechnical?.macd ?? null,

    // 15M MACD
    macd15m: niftyTechnical?.macd15m ?? null,

    // VWAP
    vwap: niftyTechnical?.vwap ?? null,

    // ADX + DI
    adx: data.adx?.adx ?? null,
    plusDI: data.adx?.plusDI ?? null,
    minusDI: data.adx?.minusDI ?? null,

    // ATR
    atr: data.atr?.atr ?? null,

    // VOLUME
    volumeRatio: scoreVolumeRatio,
    candleDirection: scoreCandleDirection,

    // MARKET LEVELS
    support: niftyLevels.support,
    resistance: niftyLevels.resistance,

    // DERIVATIVES
    pcr: data.pcr ?? null,
    oi: data.oi ?? null,

    // MARKET CONTEXT
    marketBias: marketBias ?? null,

    // BHAVISH SCORE
    bhavishScore: bhavishScore ?? null,
  });

  data.ai.signal = ai.signal;
  data.ai.confidence = ai.confidence;
  data.ai.risk = ai.risk;
  data.ai.score = ai.score;
  data.ai.reasons = ai.reasons;

  data.ai.entry = ai.entry;
  data.ai.stopLoss = ai.stopLoss;
  data.ai.target1 = ai.target1;
  data.ai.target2 = ai.target2;

  // ====================================================
  // 28. LIVE OPTION CHAIN
  // ====================================================

  data.optionChain.chain = optionData?.chain ?? [];
  data.optionChain.atm = optionData?.atm ?? null;
  data.optionChain.expiry = optionData?.expiry ?? "";

  // ====================================================
  // 29. OI TREND SUMMARY
  // ====================================================

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
    data.oiTrend.bullish = Math.round(
      (bullish / total) * 100
    );

    data.oiTrend.bearish = Math.round(
      (bearish / total) * 100
    );

    data.oiTrend.neutral = Math.round(
      (neutral / total) * 100
    );
  }

  data.oiSummary = oiSummary;

  // ====================================================
  // 30. FINAL BHAVISH SCORE OUTPUT
  // ====================================================

  data.bhavishScore = bhavishScore;

  // Additional diagnostic data
  data.bhavishScoreInputs = {
    ema: scoreEMA,
    macd5m: scoreMACD,
    adx: scoreADX,
    rsi: scoreRSI,

    oi: {
      totalCEOI: scoreCEOI,
      totalPEOI: scorePEOI,
      ceOIChange: scoreCEOIChange,
      peOIChange: scorePEOIChange,
    },

    pcr: scorePCR,

    volume: {
      ratio: scoreVolumeRatio,
      candleDirection: scoreCandleDirection,
    },
  };

  console.log("==================================");
  console.log("BHAVISH MARKET DATA COMPLETED");
  console.log("==================================");

  return data;
}
