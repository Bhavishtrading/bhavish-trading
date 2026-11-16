
import { analyzeMarketStructure } from "./marketStructureEngine";

const CANDLE_INTERVAL_MS = 5 * 60 * 1000;

const WEIGHTS = {
  ema: 25,
  vwap: 15,
  adx: 15,
  macd: 15,
  rsi: 10,
  structure: 10,
};

function getCandleTime(candle) {
  const value = new Date(candle?.date).getTime();
  return Number.isFinite(value) ? value : null;
}

function isCompletedCandle(candle, now) {
  const timestamp = getCandleTime(candle);

  return (
    timestamp !== null &&
    timestamp + CANDLE_INTERVAL_MS <= now
  );
}

function isValidCandle(candle) {
  const values = [
    Number(candle?.open),
    Number(candle?.high),
    Number(candle?.low),
    Number(candle?.close),
  ];

  return (
    values.every(Number.isFinite) &&
    values[1] >= values[2] &&
    values[1] >= values[0] &&
    values[1] >= values[3] &&
    values[2] <= values[0] &&
    values[2] <= values[3]
  );
}

function getStructureSignal(structure) {
  if (structure === "BULLISH_STRUCTURE") return "BULLISH";
  if (structure === "BEARISH_STRUCTURE") return "BEARISH";

  return null;
}

function getEMASignal(ema) {
  if (
    !ema ||
    !Number.isFinite(ema.ema9) ||
    !Number.isFinite(ema.ema20) ||
    !Number.isFinite(ema.ema50)
  ) {
    return null;
  }

  if (ema.ema9 > ema.ema20 && ema.ema20 > ema.ema50) {
    return "BULLISH";
  }

  if (ema.ema9 < ema.ema20 && ema.ema20 < ema.ema50) {
    return "BEARISH";
  }

  return "NEUTRAL";
}

function getVWAPSignal(priceValue, vwapValue) {
  const price = Number(priceValue);
  const vwap = Number(vwapValue);

  if (
    priceValue == null ||
    vwapValue == null ||
    !Number.isFinite(price) ||
    !Number.isFinite(vwap)
  ) {
    return null;
  }

  if (price > vwap) return "BULLISH";
  if (price < vwap) return "BEARISH";

  return "NEUTRAL";
}

function getADXSignal(adx) {
  if (
    !adx ||
    !Number.isFinite(adx.adx) ||
    !Number.isFinite(adx.plusDI) ||
    !Number.isFinite(adx.minusDI)
  ) {
    return null;
  }

  if (adx.adx < 20) return "NEUTRAL";

  if (adx.plusDI > adx.minusDI) return "BULLISH";
  if (adx.minusDI > adx.plusDI) return "BEARISH";

  return "NEUTRAL";
}

function getMACDSignal(macd) {
  if (!macd || !Number.isFinite(macd.histogram)) {
    return null;
  }

  if (macd.histogram > 0) return "BULLISH";
  if (macd.histogram < 0) return "BEARISH";

  return "NEUTRAL";
}

function getRSISignal(rsi) {
  if (!Number.isFinite(rsi)) return null;

  if (rsi >= 55) return "BULLISH";
  if (rsi <= 45) return "BEARISH";

  return "NEUTRAL";
}

function getParticipationSignal(latestFlow) {
  const position = latestFlow?.marketPosition;

  if (position === "LONG_BUILD_UP_CANDIDATE") {
    return "BULLISH";
  }

  if (position === "SHORT_BUILD_UP_CANDIDATE") {
    return "BEARISH";
  }

  return null;
}

function calculateDirectionalScore(signals) {
  let bullish = 0;
  let bearish = 0;
  let availableWeight = 0;

  for (const [name, weight] of Object.entries(WEIGHTS)) {
    const signal = signals[name];

    if (!signal || signal === "NEUTRAL") continue;

    availableWeight += weight;

    if (signal === "BULLISH") bullish += weight;
    if (signal === "BEARISH") bearish += weight;
  }

  const scoreDifference = bullish - bearish;

  const agreement =
    availableWeight > 0
      ? (Math.abs(scoreDifference) / availableWeight) * 100
      : 0;

  let direction = "SIDEWAYS";

  if (agreement >= 15 && scoreDifference > 0) {
    direction = "BULLISH";
  } else if (agreement >= 15 && scoreDifference < 0) {
    direction = "BEARISH";
  }

  return {
    bullish,
    bearish,
    scoreDifference,
    availableWeight,
    trendStrength: Number(agreement.toFixed(2)),
    direction,
  };
}

function getSustainability({
  direction,
  adx,
  emaSignal,
  vwapSignal,
  macdSignal,
  structureSignal,
  participationSignal,
  oiAnomaly,
}) {
  if (direction === "SIDEWAYS") return "WEAK";

  if (oiAnomaly) return "UNDER_TEST";

  const oppositeSignals = [
    structureSignal,
    participationSignal,
  ].filter(
    (signal) => signal && signal !== direction
  );

  if (oppositeSignals.length > 0) {
    return "UNDER_TEST";
  }

  const coreAlignment =
    emaSignal === direction &&
    vwapSignal === direction &&
    macdSignal === direction;

  const adxDirection =
    Number(adx?.plusDI) > Number(adx?.minusDI)
      ? "BULLISH"
      : Number(adx?.minusDI) > Number(adx?.plusDI)
        ? "BEARISH"
        : "SIDEWAYS";

  if (
    coreAlignment &&
    Number(adx?.adx) >= 25 &&
    adxDirection === direction
  ) {
    return "STRONG";
  }

  if (
    emaSignal === direction &&
    Number(adx?.adx) >= 20
  ) {
    return "MODERATE";
  }

  return "WEAK";
}

export function analyzeMarketConfirmation({
  spotCandles = [],
  futuresFlow = null,
  futuresVWAP = null,
  futuresTechnical = null,
} = {}) {
  const now = Date.now();

  // --------------------------------------------------
  // 1. SPOT CANDLES - MARKET STRUCTURE ONLY
  // --------------------------------------------------

  const completedSpotCandles = (
    Array.isArray(spotCandles) ? spotCandles : []
  )
    .filter((candle) => isCompletedCandle(candle, now))
    .filter(isValidCandle)
    .sort((a, b) => getCandleTime(a) - getCandleTime(b));

  if (completedSpotCandles.length < 50) {
    return {
      success: false,
      message: "At least 50 completed NIFTY Spot candles are required",
      availableCandles: completedSpotCandles.length,
    };
  }

  // --------------------------------------------------
  // 2. FUTURES TECHNICAL DATA VALIDATION
  // --------------------------------------------------

  if (!futuresTechnical) {
    return {
      success: false,
      message: "NIFTY Futures technical data is unavailable",
    };
  }

  const ema = futuresTechnical.ema || null;
  const adx = futuresTechnical.adx || null;
  const atr = futuresTechnical.atr || null;
  const macd = futuresTechnical.macd || null;
  const rsi = futuresTechnical.rsi?.value ?? null;

  const futuresPrice = futuresTechnical.currentPrice;

  const futuresVwapValue =
    futuresTechnical.vwap?.value ?? null;

  if (
    !ema ||
    !adx ||
    !macd ||
    !Number.isFinite(Number(futuresPrice)) ||
    !Number.isFinite(Number(futuresVwapValue))
  ) {
    return {
      success: false,
      message: "NIFTY Futures technical indicators are incomplete",
      diagnostics: {
        hasEMA: Boolean(ema),
        hasADX: Boolean(adx),
        hasMACD: Boolean(macd),
        hasFuturesPrice: Number.isFinite(Number(futuresPrice)),
        hasFuturesVWAP: Number.isFinite(Number(futuresVwapValue)),
      },
    };
  }

  // --------------------------------------------------
  // 3. LATEST CANDLES
  // --------------------------------------------------

  const latestSpot = completedSpotCandles.at(-1);
  const latestFuture = futuresFlow?.latest || null;

  // --------------------------------------------------
  // 4. SPOT MARKET STRUCTURE
  // --------------------------------------------------

  const marketStructure = analyzeMarketStructure({
    candles: completedSpotCandles,
    leftBars: 2,
    rightBars: 2,
  });

  const structure = marketStructure.success
    ? marketStructure.structure
    : "UNKNOWN";

  // --------------------------------------------------
  // 5. FUTURES TECHNICAL SIGNALS
  // --------------------------------------------------

  const emaSignal = getEMASignal(ema);

  const vwapSignal = getVWAPSignal(
    futuresPrice,
    futuresVwapValue
  );

  const adxSignal = getADXSignal(adx);
  const macdSignal = getMACDSignal(macd);
  const rsiSignal = getRSISignal(rsi);

  // --------------------------------------------------
  // 6. SPOT STRUCTURE SIGNAL
  // --------------------------------------------------

  const structureSignal = getStructureSignal(structure);

  // --------------------------------------------------
  // 7. FUTURES FLOW / OI
  // --------------------------------------------------

  const participationSignal = getParticipationSignal(latestFuture);
  const oiAnomaly = Boolean(latestFuture?.oiAnomaly);

  const signals = {
    ema: emaSignal,
    vwap: vwapSignal,
    adx: adxSignal,
    macd: macdSignal,
    rsi: rsiSignal,
    structure: structureSignal,
  };

  // --------------------------------------------------
  // 8. DIRECTIONAL SCORING
  // --------------------------------------------------

  const score = calculateDirectionalScore(signals);

  const relativeVolume =
    latestFuture?.relativeVolume == null
      ? null
      : Number(latestFuture.relativeVolume);

  const hasElevatedVolume =
    Number.isFinite(relativeVolume) && relativeVolume >= 1.2;

  // --------------------------------------------------
  // 9. TREND SUSTAINABILITY
  // --------------------------------------------------

  const sustainability = getSustainability({
    direction: score.direction,
    adx,
    emaSignal,
    vwapSignal,
    macdSignal,
    structureSignal,
    participationSignal,
    oiAnomaly,
  });

  // --------------------------------------------------
  // 10. ENTRY STATUS
  // --------------------------------------------------

  // Breakout acceptance and retest confirmation
  // will be implemented separately.

  let entryStatus = "WAITING";

  if (
    score.direction === "SIDEWAYS" ||
    oiAnomaly ||
    !emaSignal ||
    !vwapSignal ||
    !adx ||
    !macd
  ) {
    entryStatus = "AVOID";
  }

  // --------------------------------------------------
  // 11. CANDLE TIMESTAMP ALIGNMENT
  // --------------------------------------------------

  const technicalTimestamp =
    futuresTechnical.lastCandle?.timestamp || null;

  const flowTimestamp =
    latestFuture?.date || null;

  const timestampsAligned =
    technicalTimestamp && flowTimestamp
      ? new Date(technicalTimestamp).getTime() ===
        new Date(flowTimestamp).getTime()
      : null;

  // --------------------------------------------------
  // 12. FINAL RESPONSE
  // --------------------------------------------------

  return {
    success: true,
    timeframe: "5minute",

    market: {
      direction: score.direction,
      trendStrength: score.trendStrength,
      sustainability,
      entryStatus,
    },

    scores: {
      bullish: score.bullish,
      bearish: score.bearish,
      scoreDifference: score.scoreDifference,
      availableWeight: score.availableWeight,
      method: "Directional agreement; OI and RVOL excluded from score",
    },

    indicators: {
      ema,
      adx,
      atr,
      macd,
      rsi: futuresTechnical.rsi || null,
      structure,
    },

    futures: {
      contract:
        futuresTechnical.contract ||
        futuresFlow?.instrument ||
        futuresFlow?.contract ||
        null,

      price: Number(futuresPrice),

      vwap: Number(futuresVwapValue),

      vwapBands: {
        upper1: futuresTechnical.vwap?.upper1 ?? null,
        lower1: futuresTechnical.vwap?.lower1 ?? null,
        upper2: futuresTechnical.vwap?.upper2 ?? null,
        lower2: futuresTechnical.vwap?.lower2 ?? null,
      },

      relativeVolume:
        Number.isFinite(relativeVolume)
          ? relativeVolume
          : null,

      oiChangePercent:
        latestFuture?.oiChangePercent == null
          ? null
          : Number(latestFuture.oiChangePercent),

      marketPosition:
        latestFuture?.marketPosition || "UNAVAILABLE",

      participationSignal,
      hasElevatedVolume,
      oiAnomaly,

      oiSignalQuality:
        latestFuture?.oiSignalQuality || "UNAVAILABLE",
    },

    diagnostics: {
      completedSpotCandles: completedSpotCandles.length,

      latestSpotCandle: latestSpot?.date || null,

      latestFutureCandle: flowTimestamp,

      latestFutureTechnicalCandle: technicalTimestamp,

      futuresTimestampsAligned: timestampsAligned,

      futuresTechnicalCandles:
        futuresTechnical.candleCount ?? null,

      futuresSessionCandles:
        futuresTechnical.sessionCandleCount ?? null,

      signals: {
        ...signals,
        participation: participationSignal,
      },

      marketStructure: {
        success: marketStructure.success,
        structure: marketStructure.structure,
        swingAnalysis: marketStructure.swingAnalysis || null,
        latestSwings: marketStructure.latestSwings || null,
        diagnostics: marketStructure.diagnostics || null,
      },

      conflictingSignals: {
        structureAgainstTrend:
          Boolean(structureSignal) &&
          score.direction !== "SIDEWAYS" &&
          structureSignal !== score.direction,

        participationAgainstTrend:
          Boolean(participationSignal) &&
          score.direction !== "SIDEWAYS" &&
          participationSignal !== score.direction,
      },

      weights: WEIGHTS,
    },
  };
}
