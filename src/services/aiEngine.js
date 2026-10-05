// =====================================================
// BHAVISH TRADING
// AI TRADE ENGINE
//
// PURPOSE:
// Final decision engine for:
// BUY CE / BUY PE / WAIT
//
// IMPORTANT:
// AI SCORE = SETUP STRENGTH
// It is NOT directional score.
//
// Direction:
// 15M MACD
// 5M MACD
// Spot VWAP
// ADX +DI / -DI
// EMA
// PCR / OI
//
// Setup strength:
// Bhavish Score
// Trend strength
// Confirmation quality
// Volume
// =====================================================

export function generateAISignal(marketData = {}) {

  // =====================================================
  // 1. INPUTS
  // =====================================================

  const price = Number(marketData.price) || 0;

  const ema9 = Number(marketData.ema9) || 0;
  const ema20 = Number(marketData.ema20) || 0;
  const ema50 = Number(marketData.ema50) || 0;

  const rsi = Number.isFinite(Number(marketData.rsi))
    ? Number(marketData.rsi)
    : 50;

  // -----------------------------------------------------
  // 5M MACD
  // -----------------------------------------------------

  const macd5m = Number(
    marketData.macd5m?.macd ??
    marketData.macd
  );

  const macdSignal5m = Number(
    marketData.macd5m?.signal ??
    marketData.macdSignal
  );

  const macdHistogram5m = Number(
    marketData.macd5m?.histogram
  );

  // -----------------------------------------------------
  // 15M MACD
  // -----------------------------------------------------

  const macd15m = Number(
    marketData.macd15m?.macd
  );

  const macdSignal15m = Number(
    marketData.macd15m?.signal
  );

  const macdHistogram15m = Number(
    marketData.macd15m?.histogram
  );

  const macd15mTrend =
    marketData.macd15m?.trend ||
    marketData.macd15m?.direction ||
    "Neutral";

  // -----------------------------------------------------
  // VWAP
  //
  // IMPORTANT:
  // This must be NIFTY SPOT VWAP.
  // Do NOT use futures VWAP here.
  // -----------------------------------------------------

  const vwap = Number(
  marketData.vwap?.value ??
  marketData.vwap?.vwap ??
  marketData.vwap
);

  // -----------------------------------------------------
  // ADX / DI
  // -----------------------------------------------------

  const adx = Number(marketData.adx) || 0;

  const plusDI = Number(
    marketData.plusDI
  ) || 0;

  const minusDI = Number(
    marketData.minusDI
  ) || 0;

  // Optional ADX slope supplied by technical engine
  const adxSlope =
    marketData.adxSlope ||
    marketData.adx?.slope ||
    "unknown";

  // -----------------------------------------------------
  // ATR
  // -----------------------------------------------------

  const atr = Number(marketData.atr) || 0;

  // -----------------------------------------------------
  // VOLUME
  // -----------------------------------------------------

  const volumeRatio = Number(
    marketData.volumeRatio
  ) || 0;

  const candleDirection =
    marketData.candleDirection ||
    "neutral";

  // -----------------------------------------------------
  // SUPPORT / RESISTANCE
  // -----------------------------------------------------

  const support = Number(
    marketData.support
  );

  const resistance = Number(
    marketData.resistance
  );

  // -----------------------------------------------------
  // PCR
  // -----------------------------------------------------

  const pcr = Number(
    marketData.pcr
  );

  // -----------------------------------------------------
  // MARKET BIAS
  // -----------------------------------------------------

  const marketBiasScore =
    Number(
      marketData.marketBias?.score
    ) || 0;

  const marketBias =
    marketData.marketBias?.bias ||
    "Neutral";

  // -----------------------------------------------------
  // BHAVISH SCORE
  // -----------------------------------------------------

  const bhavishScore =
    Number(
      marketData.bhavishScore?.score ??
      marketData.bhavishScore
    ) || 0;

  // -----------------------------------------------------
  // OI
  // -----------------------------------------------------

  const oi = marketData.oi || {};

  const longBuildUp =
    Number(oi.longBuildUp) || 0;

  const shortBuildUp =
    Number(oi.shortBuildUp) || 0;

  const shortCovering =
    Number(oi.shortCovering) || 0;

  const longUnwinding =
    Number(oi.longUnwinding) || 0;

  // =====================================================
  // REASONS
  // =====================================================

  const reasons = [];

  // =====================================================
  // DIRECTION POINTS
  //
  // These determine CE / PE direction.
  //
  // They are separate from AI SCORE.
  // =====================================================

  let bullish = 0;
  let bearish = 0;

  // =====================================================
  // 2. 15M MACD
  //
  // HIGHEST IMPORTANCE FOR DIRECTION
  // =====================================================

  let bullish15M = false;
  let bearish15M = false;

  if (
    Number.isFinite(macd15m) &&
    Number.isFinite(macdSignal15m)
  ) {

    bullish15M =
      macd15m > macdSignal15m;

    bearish15M =
      macd15m < macdSignal15m;

    if (bullish15M) {

      bullish += 25;

      reasons.push(
        "15M MACD Bullish"
      );

    } else if (bearish15M) {

      bearish += 25;

      reasons.push(
        "15M MACD Bearish"
      );

    } else {

      reasons.push(
        "15M MACD Neutral"
      );
    }

  } else {

    // Use textual trend if numeric values
    // are unavailable.

    if (
      String(macd15mTrend)
        .toLowerCase()
        .includes("bull")
    ) {

      bullish15M = true;
      bullish += 20;

      reasons.push(
        "15M MACD Bullish"
      );

    } else if (
      String(macd15mTrend)
        .toLowerCase()
        .includes("bear")
    ) {

      bearish15M = true;
      bearish += 20;

      reasons.push(
        "15M MACD Bearish"
      );

    } else {

      reasons.push(
        "15M MACD Data Unavailable"
      );
    }
  }

  // =====================================================
  // 3. 5M MACD
  //
  // ENTRY TIMING
  // =====================================================

  let bullish5M = false;
  let bearish5M = false;

  if (
    Number.isFinite(macd5m) &&
    Number.isFinite(macdSignal5m)
  ) {

    bullish5M =
      macd5m > macdSignal5m;

    bearish5M =
      macd5m < macdSignal5m;

    if (bullish5M) {

      bullish += 15;

      reasons.push(
        "5M MACD Bullish"
      );

    } else if (bearish5M) {

      bearish += 15;

      reasons.push(
        "5M MACD Bearish"
      );

    } else {

      reasons.push(
        "5M MACD Neutral"
      );
    }
  }

  // =====================================================
  // 4. SPOT VWAP
  //
  // IMPORTANT:
  // NIFTY SPOT VWAP ONLY
  // =====================================================

  let bullishVWAP = false;
  let bearishVWAP = false;

  if (
    price > 0 &&
    Number.isFinite(vwap) &&
    vwap > 0
  ) {

    if (price > vwap) {

      bullishVWAP = true;

      bullish += 15;

      reasons.push(
        "NIFTY Spot Price Above VWAP"
      );

    } else if (price < vwap) {

      bearishVWAP = true;

      bearish += 15;

      reasons.push(
        "NIFTY Spot Price Below VWAP"
      );

    } else {

      reasons.push(
        "Price At VWAP"
      );
    }

  } else {

    reasons.push(
      "Spot VWAP Unavailable"
    );
  }

  // =====================================================
  // 5. ADX + DI
  //
  // ADX = STRENGTH
  // DI = DIRECTION
  //
  // ADX IS NOT A HARD GATE
  // =====================================================

  let bullishDI = false;
  let bearishDI = false;

  if (
    plusDI > 0 &&
    minusDI > 0
  ) {

    bullishDI =
      plusDI > minusDI;

    bearishDI =
      minusDI > plusDI;

    if (bullishDI) {

      bullish += 10;

      reasons.push(
        `+DI > -DI (${plusDI.toFixed(1)} > ${minusDI.toFixed(1)})`
      );

    } else if (bearishDI) {

      bearish += 10;

      reasons.push(
        `-DI > +DI (${minusDI.toFixed(1)} > ${plusDI.toFixed(1)})`
      );

    }
  }

  // -----------------------------------------------------
  // ADX STATE
  // -----------------------------------------------------

  if (adx >= 30) {

    reasons.push(
      "ADX Very Strong"
    );

  } else if (adx >= 25) {

    reasons.push(
      "ADX Strong"
    );

  } else if (adx >= 20) {

    reasons.push(
      "ADX Developing"
    );

  } else {

    reasons.push(
      "ADX Weak — Trend Strength Limited"
    );
  }

  // -----------------------------------------------------
  // ADX SLOPE
  // -----------------------------------------------------

  const adxSlopeText =
    String(adxSlope).toLowerCase();

  if (
    adxSlopeText.includes("rising") ||
    adxSlopeText.includes("increasing")
  ) {

    reasons.push(
      "ADX Strengthening"
    );

  } else if (
    adxSlopeText.includes("falling") ||
    adxSlopeText.includes("decreasing")
  ) {

    reasons.push(
      "ADX Weakening"
    );
  }

  // =====================================================
  // 6. EMA STRUCTURE
  // =====================================================

  const bullishEMA =
    price > ema9 &&
    ema9 > ema20 &&
    ema20 > ema50;

  const bearishEMA =
    price < ema9 &&
    ema9 < ema20 &&
    ema20 < ema50;

  if (bullishEMA) {

    bullish += 10;

    reasons.push(
      "EMA Structure Bullish"
    );

  } else if (bearishEMA) {

    bearish += 10;

    reasons.push(
      "EMA Structure Bearish"
    );

  } else {

    // Partial EMA structure

    if (
      price > ema9 &&
      ema9 > ema20
    ) {

      bullish += 5;

      reasons.push(
        "Short-Term EMA Structure Bullish"
      );

    } else if (
      price < ema9 &&
      ema9 < ema20
    ) {

      bearish += 5;

      reasons.push(
        "Short-Term EMA Structure Bearish"
      );

    } else {

      reasons.push(
        "EMA Structure Mixed"
      );
    }
  }

  // =====================================================
  // 7. RSI
  //
  // RSI IS CONFIRMATION
  // NOT PRIMARY DIRECTION
  // =====================================================

  if (
    rsi >= 55 &&
    rsi < 70
  ) {

    bullish += 5;

    reasons.push(
      "RSI Supports Bullish Momentum"
    );

  } else if (
    rsi <= 45 &&
    rsi > 30
  ) {

    bearish += 5;

    reasons.push(
      "RSI Supports Bearish Momentum"
    );

  } else if (rsi >= 70) {

    reasons.push(
      "RSI Overbought — Avoid Chasing"
    );

  } else if (rsi <= 30) {

    reasons.push(
      "RSI Oversold — Avoid Chasing"
    );

  } else {

    reasons.push(
      "RSI Neutral"
    );
  }

  // =====================================================
  // 8. PCR
  //
  // PCR = CONFIRMATION
  // Not standalone direction.
  // =====================================================

  if (Number.isFinite(pcr)) {

    if (pcr > 1.05) {

      bullish += 5;

      reasons.push(
        `PCR Bullish (${pcr.toFixed(2)})`
      );

    } else if (pcr < 0.80) {

      bearish += 5;

      reasons.push(
        `PCR Bearish (${pcr.toFixed(2)})`
      );

    } else {

      reasons.push(
        `PCR Neutral (${pcr.toFixed(2)})`
      );
    }

  } else {

    reasons.push(
      "PCR Unavailable"
    );
  }

  // =====================================================
  // 9. OI CONTEXT
  //
  // Missing OI = NO PENALTY
  // =====================================================

  const bullishOI =
    longBuildUp +
    shortCovering;

  const bearishOI =
    shortBuildUp +
    longUnwinding;

  if (
    bullishOI > 0 ||
    bearishOI > 0
  ) {

    if (bullishOI > bearishOI) {

      bullish += 5;

      reasons.push(
        "OI Structure Supports Bullish Side"
      );

    } else if (
      bearishOI > bullishOI
    ) {

      bearish += 5;

      reasons.push(
        "OI Structure Supports Bearish Side"
      );

    } else {

      reasons.push(
        "OI Structure Mixed"
      );
    }

  } else {

    reasons.push(
      "OI Direction Unavailable"
    );
  }

  // =====================================================
  // 10. VOLUME
  //
  // Confirmation only.
  // =====================================================

  if (volumeRatio >= 1.5) {

    reasons.push(
      "Strong Volume Confirmation"
    );

  } else if (volumeRatio >= 1.0) {

    reasons.push(
      "Moderate Volume Confirmation"
    );

  } else if (
    volumeRatio > 0 &&
    volumeRatio < 1
  ) {

    reasons.push(
      "Volume Confirmation Weak"
    );
  }

  // =====================================================
  // 11. CANDLE DIRECTION
  // =====================================================

  if (
    String(candleDirection)
      .toLowerCase()
      .includes("bull")
  ) {

    bullish += 2;

  } else if (
    String(candleDirection)
      .toLowerCase()
      .includes("bear")
  ) {

    bearish += 2;
  }

  // =====================================================
  // 12. MARKET BIAS
  //
  // SECONDARY CONTEXT
  // Avoid heavy double counting.
  // =====================================================

  if (marketBiasScore >= 30) {

    bullish += 3;

    reasons.push(
      "Market Bias Bullish"
    );

  } else if (marketBiasScore <= -30) {

    bearish += 3;

    reasons.push(
      "Market Bias Bearish"
    );

  } else {

    reasons.push(
      "Market Bias Neutral"
    );
  }

  // =====================================================
  // 13. SUPPORT / RESISTANCE
  //
  // CONTEXT ONLY
  // =====================================================

  let nearSupport = false;
  let nearResistance = false;

  if (
    Number.isFinite(support) &&
    support > 0
  ) {

    nearSupport =
      price <= support * 1.002;

    if (nearSupport) {

      reasons.push(
        "Price Near Support"
      );
    }
  }

  if (
    Number.isFinite(resistance) &&
    resistance > 0
  ) {

    nearResistance =
      price >= resistance * 0.998;

    if (nearResistance) {

      reasons.push(
        "Price Near Resistance"
      );
    }
  }

  // =====================================================
  // 14. DIRECTION
  // =====================================================

  const directionDifference =
    Math.abs(
      bullish - bearish
    );

  let direction = "NEUTRAL";

  if (
    bullish > bearish &&
    directionDifference >= 10
  ) {

    direction = "BULLISH";

  } else if (
    bearish > bullish &&
    directionDifference >= 10
  ) {

    direction = "BEARISH";
  }

  // =====================================================
  // 15. MAJOR CONFLICT DETECTION
  // =====================================================

  const bullishCore =
    bullish15M &&
    bullishVWAP &&
    bullishDI;

  const bearishCore =
    bearish15M &&
    bearishVWAP &&
    bearishDI;

  const bullishMajorConflict =
    bearish15M &&
    bullishVWAP &&
    bullishDI;

  const bearishMajorConflict =
    bullish15M &&
    bearishVWAP &&
    bearishDI;

  let conflict = false;

  if (
    bullishMajorConflict ||
    bearishMajorConflict
  ) {

    conflict = true;

    reasons.push(
      "Major Signal Conflict — Waiting for Confirmation"
    );
  }

  // =====================================================
  // 16. AI SCORE
  //
  // SETUP STRENGTH ONLY
  //
  // Score considers:
  // - HTF alignment
  // - LTF alignment
  // - VWAP
  // - DI
  // - Bhavish Score
  // - ADX
  // - Volume
  //
  // It does NOT decide direction by itself.
  // =====================================================

  let setupPoints = 0;

  // -----------------------------------------------------
  // 15M direction
  // -----------------------------------------------------

  if (
    bullish15M ||
    bearish15M
  ) {

    setupPoints += 20;
  }

  // -----------------------------------------------------
  // 5M direction
  // -----------------------------------------------------

  if (
    bullish5M ||
    bearish5M
  ) {

    setupPoints += 15;
  }

  // -----------------------------------------------------
  // VWAP
  // -----------------------------------------------------

  if (
    bullishVWAP ||
    bearishVWAP
  ) {

    setupPoints += 15;
  }

  // -----------------------------------------------------
  // DI
  // -----------------------------------------------------

  if (
    bullishDI ||
    bearishDI
  ) {

    setupPoints += 10;
  }

  // -----------------------------------------------------
  // Bhavish Score
  //
  // Use absolute value because it represents
  // setup strength/context.
  // -----------------------------------------------------

  const bhavishStrength =
    Math.min(
      20,
      Math.abs(bhavishScore) * 0.20
    );

  setupPoints +=
    bhavishStrength;

  // -----------------------------------------------------
  // ADX strength
  // -----------------------------------------------------

  if (adx >= 30) {

    setupPoints += 10;

  } else if (adx >= 25) {

    setupPoints += 8;

  } else if (adx >= 20) {

    setupPoints += 5;
  }

  // -----------------------------------------------------
  // Volume
  // -----------------------------------------------------

  if (volumeRatio >= 1.5) {

    setupPoints += 5;

  } else if (volumeRatio >= 1.0) {

    setupPoints += 3;
  }

  // -----------------------------------------------------
  // EMA structure
  // -----------------------------------------------------

  if (
    bullishEMA ||
    bearishEMA
  ) {

    setupPoints += 5;
  }

  // -----------------------------------------------------
  // Penalties
  // -----------------------------------------------------

  if (adx < 20) {

    setupPoints -= 10;
  }

  if (
    conflict
  ) {

    setupPoints -= 15;
  }

  if (
    !bullishCore &&
    !bearishCore
  ) {

    setupPoints -= 5;
  }

  // Clamp
  let score = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        setupPoints
      )
    )
  );

  // =====================================================
  // 17. CONFIDENCE
  //
  // DIFFERENT FROM SCORE
  //
  // Confidence asks:
  // "How confident are we in the selected direction?"
  // =====================================================

  let confidence = 40;

  // HTF confirmation
  if (
    bullish15M ||
    bearish15M
  ) {

    confidence += 15;
  }

  // 5M confirmation
  if (
    bullish5M ||
    bearish5M
  ) {

    confidence += 10;
  }

  // VWAP
  if (
    bullishVWAP ||
    bearishVWAP
  ) {

    confidence += 10;
  }

  // DI
  if (
    bullishDI ||
    bearishDI
  ) {

    confidence += 10;
  }

  // Directional agreement
  if (
    directionDifference >= 20
  ) {

    confidence += 10;

  } else if (
    directionDifference < 10
  ) {

    confidence -= 10;
  }

  // ADX
  if (adx >= 30) {

    confidence += 5;

  } else if (adx < 20) {

    confidence -= 10;
  }

  // Major conflict
  if (conflict) {

    confidence -= 20;
  }

  confidence = Math.round(
    Math.max(
      20,
      Math.min(
        95,
        confidence
      )
    )
  );

  // =====================================================
  // 18. FINAL SIGNAL
  // =====================================================

  let signal = "WAIT";

  // -----------------------------------------------------
  // BUY CE
  // -----------------------------------------------------

  if (
    direction === "BULLISH" &&
    !conflict &&
    bullish15M &&
    bullishVWAP &&
    bullishDI &&
    score >= 55 &&
    confidence >= 55
  ) {

    signal = "BUY CE";
  }

  // -----------------------------------------------------
  // BUY PE
  // -----------------------------------------------------

  else if (
    direction === "BEARISH" &&
    !conflict &&
    bearish15M &&
    bearishVWAP &&
    bearishDI &&
    score >= 55 &&
    confidence >= 55
  ) {

    signal = "BUY PE";
  }

  // -----------------------------------------------------
  // WAIT
  // -----------------------------------------------------

  else {

    signal = "WAIT";

    if (conflict) {

      reasons.push(
        "WAIT — Signal Conflict"
      );

    } else if (
      direction === "BULLISH"
    ) {

      reasons.push(
        "WAIT — Bullish Bias Developing; Wait for CE Confirmation"
      );

    } else if (
      direction === "BEARISH"
    ) {

      reasons.push(
        "WAIT — Bearish Bias Developing; Wait for PE Confirmation"
      );

    } else {

      reasons.push(
        "WAIT — Market Direction Not Confirmed"
      );
    }
  }

  // =====================================================
  // 19. RISK
  // =====================================================

  let risk = "NO TRADE";

  if (
    signal === "BUY CE" ||
    signal === "BUY PE"
  ) {

    if (
      score >= 80 &&
      confidence >= 75 &&
      adx >= 25
    ) {

      risk = "LOW";

    } else if (
      score >= 65 &&
      confidence >= 60
    ) {

      risk = "MEDIUM";

    } else {

      risk = "HIGH";
    }
  }

  // =====================================================
  // 20. ENTRY / SL / TARGETS
  //
  // IMPORTANT:
  // These are UNDERLYING NIFTY levels.
  //
  // Option premium levels will be handled later
  // by a separate option selector engine.
  // =====================================================

  let entry = null;
  let stopLoss = null;
  let target1 = null;
  let target2 = null;

  if (
    signal === "BUY CE" &&
    price > 0 &&
    atr > 0
  ) {

    entry =
      +price.toFixed(2);

    stopLoss =
      +(price - atr).toFixed(2);

    target1 =
      +(price + atr).toFixed(2);

    target2 =
      +(price + atr * 2).toFixed(2);
  }

  if (
    signal === "BUY PE" &&
    price > 0 &&
    atr > 0
  ) {

    entry =
      +price.toFixed(2);

    stopLoss =
      +(price + atr).toFixed(2);

    target1 =
      +(price - atr).toFixed(2);

    target2 =
      +(price - atr * 2).toFixed(2);
  }

  // =====================================================
  // 21. ATR INFORMATION
  // =====================================================

  if (atr > 0) {

    reasons.push(
      `ATR ${atr.toFixed(2)} available for risk management`
    );
  }

  // =====================================================
  // 22. FINAL RESULT
  // =====================================================

  return {

    signal,

    confidence,

    risk,

    score,

    entry,

    stopLoss,

    target1,

    target2,

    reasons,

    // ---------------------------------------------------
    // Extra internal information
    // ---------------------------------------------------

    direction,

    bullishPoints: bullish,

    bearishPoints: bearish,

    conflict,

    trendStrength:
      adx >= 30
        ? "VERY STRONG"
        : adx >= 25
        ? "STRONG"
        : adx >= 20
        ? "DEVELOPING"
        : "WEAK",

    vwapPosition:
      bullishVWAP
        ? "ABOVE"
        : bearishVWAP
        ? "BELOW"
        : "AT",

    diDirection:
      bullishDI
        ? "BULLISH"
        : bearishDI
        ? "BEARISH"
        : "NEUTRAL",

    marketBias,

    bhavishScore,

    // Context flags
    nearSupport,
    nearResistance,

    // Used later by option selector
    underlyingPrice:
      price > 0
        ? +price.toFixed(2)
        : null,
  };
}