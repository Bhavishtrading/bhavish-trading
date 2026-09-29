// =====================================================
// SILVER MINI BHAVISH SCORE ENGINE
// =====================================================
// SILVERM
// 5 MINUTE LIVE TECHNICAL DATA
//
// SCORE:
// EMA Structure  ±30
// MACD            ±20
// RSI             ±15
// ADX             ±15
// PCR             ±10
// Volume          ±10
//
// TOTAL: -100 to +100
// =====================================================

export function calculateSilverBhavishScore(
  technical,
  pcr = null
) {
  if (!technical) {
    throw new Error(
      "Silver technical data unavailable"
    );
  }

  // =====================================================
  // 1. EMA STRUCTURE
  // =====================================================

  const emaStructure =
    Number(
      technical.ema?.structureScore ?? 0
    );

  // =====================================================
  // 2. MACD
  // =====================================================

  const macdValue =
    Number(
      technical.macd?.macd ?? 0
    );

  const macdSignal =
    Number(
      technical.macd?.signal ?? 0
    );

  const macdHistogram =
    Number(
      technical.macd?.histogram ?? 0
    );

  let macdScore = 0;

  if (
    macdValue > macdSignal &&
    macdHistogram > 0
  ) {
    macdScore = 20;
  }

  else if (
    macdValue < macdSignal &&
    macdHistogram < 0
  ) {
    macdScore = -20;
  }

  // =====================================================
  // 3. RSI
  // =====================================================

  const rsi =
    Number(
      technical.rsi?.value ?? 50
    );

  let rsiScore = 0;

  if (rsi >= 60) {
    rsiScore = 15;
  }

  else if (rsi >= 55) {
    rsiScore = 10;
  }

  else if (rsi >= 50) {
    rsiScore = 5;
  }

  else if (rsi <= 40) {
    rsiScore = -15;
  }

  else if (rsi <= 45) {
    rsiScore = -10;
  }

  else if (rsi < 50) {
    rsiScore = -5;
  }

  // =====================================================
  // 4. ADX
  // =====================================================
  //
  // ADX = TREND STRENGTH
  //
  // +DI > -DI = BULLISH
  // -DI > +DI = BEARISH
  //
  // ADX >= 25 = strong enough to score
  //
  // IMPORTANT:
  // ADX direction must NOT depend on MACD.
  // =====================================================

  const adx =
    Number(
      technical.adx?.value ?? 0
    );

  const plusDI =
    Number(
      technical.adx?.plusDI ??
      technical.adx?.diPlus ??
      0
    );

  const minusDI =
    Number(
      technical.adx?.minusDI ??
      technical.adx?.diMinus ??
      0
    );

  let adxScore = 0;

  if (adx >= 25) {

    // -----------------------------------------------
    // BULLISH ADX
    // -----------------------------------------------

    if (plusDI > minusDI) {
      adxScore = 15;
    }

    // -----------------------------------------------
    // BEARISH ADX
    // -----------------------------------------------

    else if (minusDI > plusDI) {
      adxScore = -15;
    }

    // -----------------------------------------------
    // DI EQUAL / UNCLEAR
    // -----------------------------------------------

    else {
      adxScore = 0;
    }
  }

  // =====================================================
  // 5. PCR
  // =====================================================

  let pcrScore = 0;

  const pcrValue =
    Number(pcr);

  if (
    Number.isFinite(pcrValue)
  ) {

    if (pcrValue >= 1.20) {
      pcrScore = 10;
    }

    else if (pcrValue >= 1.05) {
      pcrScore = 5;
    }

    else if (pcrValue <= 0.80) {
      pcrScore = -10;
    }

    else if (pcrValue <= 0.95) {
      pcrScore = -5;
    }
  }

  // =====================================================
  // 6. VOLUME
  // =====================================================

  const volumeRatio =
    Number(
      technical.volume?.ratio ?? 0
    );

  let volumeScore = 0;

  if (
    volumeRatio >= 1.50
  ) {

    if (
      technical.macd?.trend ===
      "Bullish"
    ) {
      volumeScore = 10;
    }

    else if (
      technical.macd?.trend ===
      "Bearish"
    ) {
      volumeScore = -10;
    }
  }

  else if (
    volumeRatio >= 1.00
  ) {

    if (
      technical.macd?.trend ===
      "Bullish"
    ) {
      volumeScore = 5;
    }

    else if (
      technical.macd?.trend ===
      "Bearish"
    ) {
      volumeScore = -5;
    }
  }

  // =====================================================
  // FINAL SCORE
  // =====================================================

  const rawScore =
    emaStructure +
    macdScore +
    rsiScore +
    adxScore +
    pcrScore +
    volumeScore;

  const score =
    Math.max(
      -100,
      Math.min(
        100,
        rawScore
      )
    );

  // =====================================================
  // STATE
  // =====================================================

  let state =
    "NEUTRAL";

  if (score >= 80) {
    state =
      "STRONG BULLISH";
  }

  else if (score <= -80) {
    state =
      "STRONG BEARISH";
  }

  // =====================================================
  // ACTION
  // =====================================================

  let action =
    "NO TRADE";

  if (score >= 80) {
    action =
      "BUY CE";
  }

  else if (score <= -80) {
    action =
      "BUY PE";
  }

  // =====================================================
  // RETURN
  // =====================================================

  return {
    score,

    state,

    action,

    range:
      "-100 to +100",

    factors: {
      emaStructure,
      macd: macdScore,
      rsi: rsiScore,
      adx: adxScore,
      pcr: pcrScore,
      volume: volumeScore,
    },

    raw: {
      emaStructure,

      macdValue,

      macdSignal,

      macdHistogram,

      rsi,

      adx,

      plusDI,

      minusDI,

      pcr:
        Number.isFinite(
          pcrValue
        )
          ? pcrValue
          : null,

      volumeRatio,
    },

    timeframe:
      "5M",

    live:
      true,

    contract:
      "SILVERM",
  };
}