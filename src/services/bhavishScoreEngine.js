// ======================================================
// BHAVISH AI SCORE ENGINE
// ======================================================
// Signed Score: -100 to +100
//
// +80 to +100  = STRONG BULLISH → CE SIDE
// -79 to +79   = NEUTRAL / UNCLEAR → NO TRADE
// -80 to -100  = STRONG BEARISH → PE SIDE
//
// Factors:
//
// 1. EMA9 + EMA20 + EMA50 Structure = ±30
// 2. MACD 5M                         = ±20
// 3. ADX 5M                         = ±10
// 4. RSI 5M                         = ±10
// 5. OI 10M                         = ±10
// 6. PCR                             = ±10
// 7. Volume 5M                      = ±10
//
// TOTAL = ±100
// ======================================================

export function calculateBhavishScore({
  price,
  ema,
  macd5m,
  adx,
  rsi,
  oi,
  pcr,
  volume,
}) {
  let score = 0;

  const factors = {
    emaStructure: 0,
    macd: 0,
    adx: 0,
    rsi: 0,
    oi: 0,
    pcr: 0,
    volume: 0,
  };

  const reasons = [];

    // ======================================================
  // 1. EMA STRUCTURE = ±30
  // ======================================================
  //
  // FULL BULLISH:
  // PRICE > EMA9 > EMA20 > EMA50
  // = +30
  //
  // BULLISH WEAKENING:
  // EMA9 > EMA20 > EMA50
  // BUT PRICE <= EMA9
  // = +20
  //
  // FURTHER BULLISH WEAKENING:
  // EMA9 > EMA20
  // AND EMA20 <= EMA50
  // = +10
  //
  // FULL BEARISH:
  // PRICE < EMA9 < EMA20 < EMA50
  // = -30
  //
  // BEARISH WEAKENING:
  // EMA9 < EMA20 < EMA50
  // BUT PRICE >= EMA9
  // = -20
  //
  // FURTHER BEARISH WEAKENING:
  // EMA9 < EMA20
  // AND EMA20 >= EMA50
  // = -10
  //
  // MIXED:
  // = 0
  // ======================================================

  if (
    price != null &&
    ema?.ema9 != null &&
    ema?.ema20 != null &&
    ema?.ema50 != null
  ) {
    const currentPrice = Number(price);
    const ema9 = Number(ema.ema9);
    const ema20 = Number(ema.ema20);
    const ema50 = Number(ema.ema50);

    if (
      Number.isFinite(currentPrice) &&
      Number.isFinite(ema9) &&
      Number.isFinite(ema20) &&
      Number.isFinite(ema50)
    ) {

      // -----------------------------------------------
      // FULL BULLISH
      // PRICE > EMA9 > EMA20 > EMA50
      // -----------------------------------------------

      if (
        currentPrice > ema9 &&
        ema9 > ema20 &&
        ema20 > ema50
      ) {
        factors.emaStructure = 30;

        reasons.push(
          "Full bullish EMA structure: Price > EMA9 > EMA20 > EMA50"
        );
      }

      // -----------------------------------------------
      // BULLISH STRUCTURE WEAKENING
      //
      // EMA9 > EMA20 > EMA50
      // BUT PRICE <= EMA9
      // -----------------------------------------------

      else if (
        currentPrice <= ema9 &&
        ema9 > ema20 &&
        ema20 > ema50
      ) {
        factors.emaStructure = 20;

        reasons.push(
          "Bullish EMA structure weakened: Price is at/below EMA9"
        );
      }

      // -----------------------------------------------
      // FURTHER BULLISH WEAKENING
      //
      // EMA9 > EMA20
      // EMA20 <= EMA50
      // -----------------------------------------------

      else if (
        ema9 > ema20 &&
        ema20 <= ema50
      ) {
        factors.emaStructure = 10;

        reasons.push(
          "Bullish EMA structure weakened: EMA20 is at/below EMA50"
        );
      }

      // -----------------------------------------------
      // FULL BEARISH
      // PRICE < EMA9 < EMA20 < EMA50
      // -----------------------------------------------

      else if (
        currentPrice < ema9 &&
        ema9 < ema20 &&
        ema20 < ema50
      ) {
        factors.emaStructure = -30;

        reasons.push(
          "Full bearish EMA structure: Price < EMA9 < EMA20 < EMA50"
        );
      }

      // -----------------------------------------------
      // BEARISH STRUCTURE WEAKENING
      //
      // EMA9 < EMA20 < EMA50
      // BUT PRICE >= EMA9
      // -----------------------------------------------

      else if (
        currentPrice >= ema9 &&
        ema9 < ema20 &&
        ema20 < ema50
      ) {
        factors.emaStructure = -20;

        reasons.push(
          "Bearish EMA structure weakened: Price is at/above EMA9"
        );
      }

      // -----------------------------------------------
      // FURTHER BEARISH WEAKENING
      //
      // EMA9 < EMA20
      // EMA20 >= EMA50
      // -----------------------------------------------

      else if (
        ema9 < ema20 &&
        ema20 >= ema50
      ) {
        factors.emaStructure = -10;

        reasons.push(
          "Bearish EMA structure weakened: EMA20 is at/above EMA50"
        );
      }

      // -----------------------------------------------
      // MIXED / UNCONFIRMED
      // -----------------------------------------------

      else {
        factors.emaStructure = 0;

        reasons.push(
          "EMA structure mixed / unconfirmed"
        );
      }

    } else {
      reasons.push(
        "EMA or Price data contains invalid values"
      );
    }

  } else {
    reasons.push(
      "EMA or Price data unavailable"
    );
  }

  score += factors.emaStructure;


// ======================================================
// 2. MACD 5M = ±20
// ======================================================
//
// Fresh Bullish Crossover       = +20
// Bullish Continuation          = +10
//
// Fresh Bearish Crossover       = -20
// Bearish Continuation          = -10
//
// Neutral / unclear             = 0
// ======================================================

if (macd5m) {
  const macdValue = Number(macd5m.macd);
  const signalValue = Number(macd5m.signal);
  const histogram = Number(macd5m.histogram);

  let bullishCrossover = false;
  let bearishCrossover = false;

  // --------------------------------------------------
  // Format 1
  // --------------------------------------------------

  if (macd5m.bullishCrossover === true) {
    bullishCrossover = true;
  }

  if (macd5m.bearishCrossover === true) {
    bearishCrossover = true;
  }

  // --------------------------------------------------
  // Format 2
  // crossoverDetected + crossoverDirection
  // --------------------------------------------------

  if (
    macd5m.crossoverDetected === true &&
    (
      macd5m.crossoverDirection === "bullish" ||
      macd5m.crossoverDirection === "Bullish"
    )
  ) {
    bullishCrossover = true;
  }

  if (
    macd5m.crossoverDetected === true &&
    (
      macd5m.crossoverDirection === "bearish" ||
      macd5m.crossoverDirection === "Bearish"
    )
  ) {
    bearishCrossover = true;
  }

  // --------------------------------------------------
  // FRESH BULLISH CROSSOVER
  // --------------------------------------------------

  if (bullishCrossover) {
    factors.macd = 20;

    reasons.push(
      "Fresh bullish MACD 5M crossover"
    );
  }

  // --------------------------------------------------
  // FRESH BEARISH CROSSOVER
  // --------------------------------------------------

  else if (bearishCrossover) {
    factors.macd = -20;

    reasons.push(
      "Fresh bearish MACD 5M crossover"
    );
  }

  // --------------------------------------------------
  // BULLISH CONTINUATION
  // MACD > Signal
  // Histogram > 0
  // --------------------------------------------------

  else if (
    Number.isFinite(macdValue) &&
    Number.isFinite(signalValue) &&
    Number.isFinite(histogram) &&
    macdValue > signalValue &&
    histogram > 0
  ) {
    factors.macd = 10;

    reasons.push(
      "MACD 5M bullish continuation: MACD above Signal with positive histogram"
    );
  }

  // --------------------------------------------------
  // BEARISH CONTINUATION
  // MACD < Signal
  // Histogram < 0
  // --------------------------------------------------

  else if (
    Number.isFinite(macdValue) &&
    Number.isFinite(signalValue) &&
    Number.isFinite(histogram) &&
    macdValue < signalValue &&
    histogram < 0
  ) {
    factors.macd = -10;

    reasons.push(
      "MACD 5M bearish continuation: MACD below Signal with negative histogram"
    );
  }

  // --------------------------------------------------
  // MACD / SIGNAL EQUAL OR UNCLEAR
  // --------------------------------------------------

  else {
    factors.macd = 0;

    if (
      Number.isFinite(macdValue) &&
      Number.isFinite(signalValue)
    ) {
      reasons.push(
        "MACD 5M neutral / transition"
      );
    } else {
      reasons.push(
        "MACD 5M data unavailable"
      );
    }
  }
}

else {
  reasons.push(
    "MACD 5M data unavailable"
  );
}

score += factors.macd;


  // ======================================================
  // 3. ADX 5M = ±10
  // ======================================================

  if (adx?.adx != null) {
    const adxValue = Number(adx.adx);

    const diPlus = Number(
      adx.diPlus ??
      adx.plusDI ??
      0
    );

    const diMinus = Number(
      adx.diMinus ??
      adx.minusDI ??
      0
    );

    let adxPoints = 0;

    if (adxValue >= 25) {
      adxPoints = 10;
    }

    else if (adxValue >= 20) {
      adxPoints = 7.5;
    }

    else {
      adxPoints = 0;
    }

    if (adxPoints > 0) {
      if (diPlus > diMinus) {
        factors.adx = adxPoints;

        reasons.push(
          `ADX 5M supports bullish trend strength (${adxValue.toFixed(2)})`
        );
      }

      else if (diMinus > diPlus) {
        factors.adx = -adxPoints;

        reasons.push(
          `ADX 5M supports bearish trend strength (${adxValue.toFixed(2)})`
        );
      }

      else {
        factors.adx = 0;

        reasons.push(
          "ADX 5M strong but DI direction is unclear"
        );
      }
    }

    else {
      factors.adx = 0;

      reasons.push(
        `ADX 5M below 20: weak trend strength (${adxValue.toFixed(2)})`
      );
    }
  }

  else {
    reasons.push(
      "ADX 5M data unavailable"
    );
  }

  score += factors.adx;


  // ======================================================
  // 4. RSI 5M = ±10
  // ======================================================

  if (rsi != null) {
    const rsiValue = Number(
      typeof rsi === "object"
        ? rsi.value ?? rsi.rsi
        : rsi
    );

    if (rsiValue > 65) {
      factors.rsi = 10;

      reasons.push(
        "RSI 5M > 65: bullish momentum"
      );
    }

    else if (rsiValue >= 60) {
      factors.rsi = 8.5;

      reasons.push(
        "RSI 5M 60–65: bullish momentum"
      );
    }

    else if (rsiValue >= 55) {
      factors.rsi = 7.5;

      reasons.push(
        "RSI 5M 55–60: moderate bullish momentum"
      );
    }

    else if (rsiValue >= 50) {
      factors.rsi = 5;

      reasons.push(
        "RSI 5M 50–55: mild bullish momentum"
      );
    }

    else if (rsiValue < 35) {
      factors.rsi = -10;

      reasons.push(
        "RSI 5M < 35: bearish momentum"
      );
    }

    else if (rsiValue <= 40) {
      factors.rsi = -8.5;

      reasons.push(
        "RSI 5M 35–40: bearish momentum"
      );
    }

    else if (rsiValue <= 45) {
      factors.rsi = -7.5;

      reasons.push(
        "RSI 5M 40–45: moderate bearish momentum"
      );
    }

    else {
      factors.rsi = -5;

      reasons.push(
        "RSI 5M 45–50: mild bearish momentum"
      );
    }
  }

  else {
    reasons.push(
      "RSI 5M data unavailable"
    );
  }

  score += factors.rsi;


  // ======================================================
  // 5. OI 10M = ±10
  // ======================================================

  if (oi) {
    const ceOI = Number(
      oi.totalCEOI ??
      oi.ceOI ??
      0
    );

    const peOI = Number(
      oi.totalPEOI ??
      oi.peOI ??
      0
    );

    const ceChange = Number(
      oi.ceOIChange ??
      oi.ceChange ??
      0
    );

    const peChange = Number(
      oi.peOIChange ??
      oi.peChange ??
      0
    );

    let oiScore = 0;

    // PE OI > CE OI = bullish
    if (ceOI < peOI) {
      oiScore += 7.5;
    }

    else if (ceOI > peOI) {
      oiScore -= 7.5;
    }

    // PE OI increase > CE OI increase = bullish
    if (ceChange < peChange) {
      oiScore += 2.5;
    }

    else if (ceChange > peChange) {
      oiScore -= 2.5;
    }

    factors.oi = oiScore;

    if (oiScore > 0) {
      reasons.push(
        "OI 10M structure supports bullish side"
      );
    }

    else if (oiScore < 0) {
      reasons.push(
        "OI 10M structure supports bearish side"
      );
    }

    else {
      reasons.push(
        "OI 10M is neutral / balanced"
      );
    }
  }

  else {
    reasons.push(
      "OI 10M data unavailable"
    );
  }

  score += factors.oi;


  // ======================================================
  // 6. PCR = ±10
  // ======================================================

  if (pcr != null) {
    const pcrValue = Number(
      typeof pcr === "object"
        ? pcr.value ?? pcr.pcr
        : pcr
    );

    if (pcrValue > 1) {
      factors.pcr = 10;

      reasons.push(
        "PCR > 1: bullish OI sentiment"
      );
    }

    else if (pcrValue >= 0.8) {
      factors.pcr = 5;

      reasons.push(
        "PCR 0.8–1: mildly bullish OI sentiment"
      );
    }

    else if (pcrValue >= 0.7) {
      factors.pcr = -5;

      reasons.push(
        "PCR 0.7–0.8: mildly bearish OI sentiment"
      );
    }

    else {
      factors.pcr = -10;

      reasons.push(
        "PCR < 0.7: bearish OI sentiment"
      );
    }
  }

  else {
    reasons.push(
      "PCR data unavailable"
    );
  }

  score += factors.pcr;


  // ======================================================
  // 7. VOLUME 5M = ±10
  // ======================================================

  if (volume) {
    const ratio = Number(
      volume.ratio ??
      volume.volumeRatio ??
      0
    );

    const candleDirection =
      volume.candleDirection ??
      volume.direction ??
      "neutral";

    let volumePoints = 0;

    if (ratio >= 1.5) {
      volumePoints = 10;
    }

    else if (ratio >= 1.2) {
      volumePoints = 7.5;
    }

    else if (ratio >= 1.0) {
      volumePoints = 5;
    }

    else {
      volumePoints = 0;
    }

    if (volumePoints > 0) {
      if (
        candleDirection === "bullish" ||
        candleDirection === "Bullish"
      ) {
        factors.volume = volumePoints;

        reasons.push(
          `5M volume ${ratio.toFixed(2)}x average with bullish candle`
        );
      }

      else if (
        candleDirection === "bearish" ||
        candleDirection === "Bearish"
      ) {
        factors.volume = -volumePoints;

        reasons.push(
          `5M volume ${ratio.toFixed(2)}x average with bearish candle`
        );
      }

      else {
        factors.volume = 0;

        reasons.push(
          `5M volume ${ratio.toFixed(2)}x average but candle direction is neutral`
        );
      }
    }

    else {
      factors.volume = 0;

      reasons.push(
        `5M volume below confirmation threshold (${ratio.toFixed(2)}x)`
      );
    }
  }

  else {
    reasons.push(
      "5M volume data unavailable"
    );
  }

  score += factors.volume;


  // ======================================================
  // FINAL SCORE
  // ======================================================

  score = Math.max(
    -100,
    Math.min(100, score)
  );

  let state = "NEUTRAL";
  let action = "NO TRADE";

  if (score >= 80) {
    state = "STRONG BULLISH";
    action = "CE SIDE";
  }

  else if (score <= -80) {
    state = "STRONG BEARISH";
    action = "PE SIDE";
  }


  // ======================================================
  // RETURN
  // ======================================================

  return {
    score,

    state,

    action,

    timeframe: {
      structure: "Live / closed candle",
      macd: "5M",
      adx: "5M",
      rsi: "5M",
      oi: "10M",
      pcr: "Current",
      volume: "5M",
    },

    factors,

    maxScore: 100,
    minScore: -100,

    tradeFilter: {
      bullishFrom: 80,
      bearishFrom: -80,
      noTradeFrom: -79,
      noTradeTo: 79,
    },

    reasons,
  };
}