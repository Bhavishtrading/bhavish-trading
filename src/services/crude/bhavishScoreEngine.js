// =====================================================
// CRUDE OIL BHAVISH SCORE ENGINE
// Same scoring model used for NIFTY / Silver
//
// EMA Structure  : ±30
// MACD           : ±20
// RSI            : ±15
// ADX            : ±15
// PCR            : ±10
// Volume         : ±10
//
// TOTAL           : -100 to +100
//
// ATR is NOT part of the score.
// ATR is only used separately as volatility information.
// =====================================================

export function calculateCrudeBhavishScore(
  indicators,
  pcr,
  volume
) {
  let score = 0;

  const factors = {
    emaStructure: 0,
    macd: 0,
    rsi: 0,
    adx: 0,
    pcr: 0,
    volume: 0,
  };

  const reasons = [];

  // =====================================================
  // 1. EMA STRUCTURE — ±30
  // =====================================================

  const emaBullish =
    Number(indicators?.ema9) >
      Number(indicators?.ema20) &&
    Number(indicators?.ema20) >
      Number(indicators?.ema50) &&
    Number(indicators?.ema50) >
      Number(indicators?.ema200);

  const emaBearish =
    Number(indicators?.ema9) <
      Number(indicators?.ema20) &&
    Number(indicators?.ema20) <
      Number(indicators?.ema50) &&
    Number(indicators?.ema50) <
      Number(indicators?.ema200);

  if (emaBullish) {
    factors.emaStructure = 30;
    score += 30;

    reasons.push(
      "EMA structure strongly bullish"
    );
  } else if (emaBearish) {
    factors.emaStructure = -30;
    score -= 30;

    reasons.push(
      "EMA structure strongly bearish"
    );
  } else {
    // Partial EMA alignment

    const ema9 = Number(indicators?.ema9);
    const ema20 = Number(indicators?.ema20);
    const ema50 = Number(indicators?.ema50);
    const ema200 = Number(indicators?.ema200);

    if (
      Number.isFinite(ema9) &&
      Number.isFinite(ema20) &&
      Number.isFinite(ema50) &&
      Number.isFinite(ema200)
    ) {
      let emaScore = 0;

      if (ema9 > ema20) {
        emaScore += 10;
      } else if (ema9 < ema20) {
        emaScore -= 10;
      }

      if (ema20 > ema50) {
        emaScore += 10;
      } else if (ema20 < ema50) {
        emaScore -= 10;
      }

      if (ema50 > ema200) {
        emaScore += 10;
      } else if (ema50 < ema200) {
        emaScore -= 10;
      }

      factors.emaStructure = emaScore;
      score += emaScore;

      if (emaScore > 0) {
        reasons.push(
          "EMA structure moderately bullish"
        );
      } else if (emaScore < 0) {
        reasons.push(
          "EMA structure moderately bearish"
        );
      } else {
        reasons.push(
          "EMA structure neutral"
        );
      }
    }
  }

  // =====================================================
  // 2. MACD — ±20
  // =====================================================

  const macd = Number(
    indicators?.macd?.macd
  );

  const signal = Number(
    indicators?.macd?.signal
  );

  const histogram = Number(
    indicators?.macd?.histogram
  );

  if (
    Number.isFinite(macd) &&
    Number.isFinite(signal)
  ) {
    if (macd > signal) {
      factors.macd = 20;
      score += 20;

      reasons.push(
        "MACD bullish"
      );
    } else if (macd < signal) {
      factors.macd = -20;
      score -= 20;

      reasons.push(
        "MACD bearish"
      );
    }
  }

  // =====================================================
  // 3. RSI — ±15
  // =====================================================

  const rsi = Number(
    indicators?.rsi14
  );

  if (Number.isFinite(rsi)) {
    if (rsi >= 55 && rsi < 70) {
      factors.rsi = 15;
      score += 15;

      reasons.push(
        "RSI bullish zone"
      );
    } else if (rsi <= 45 && rsi > 30) {
      factors.rsi = -15;
      score -= 15;

      reasons.push(
        "RSI bearish zone"
      );
    } else if (rsi >= 70) {
      // Overbought — reduced bullish score

      factors.rsi = 5;
      score += 5;

      reasons.push(
        "RSI overbought"
      );
    } else if (rsi <= 30) {
      // Oversold — reduced bearish pressure

      factors.rsi = 5;
      score += 5;

      reasons.push(
        "RSI oversold"
      );
    } else {
      factors.rsi = 0;

      reasons.push(
        "RSI neutral"
      );
    }
  }

  // =====================================================
  // 4. ADX — ±15
  // =====================================================

  const adx = Number(
    indicators?.adx14
  );

  if (Number.isFinite(adx)) {
    if (adx >= 25) {
      // ADX confirms strong trend.
      // Direction is determined from EMA structure.

      if (factors.emaStructure > 0) {
        factors.adx = 15;
        score += 15;

        reasons.push(
          "ADX confirms bullish trend strength"
        );
      } else if (
        factors.emaStructure < 0
      ) {
        factors.adx = -15;
        score -= 15;

        reasons.push(
          "ADX confirms bearish trend strength"
        );
      } else {
        factors.adx = 0;

        reasons.push(
          "ADX strong but direction neutral"
        );
      }
    } else if (adx >= 20) {
      // Moderate trend

      if (factors.emaStructure > 0) {
        factors.adx = 8;
        score += 8;

        reasons.push(
          "ADX moderately confirms bullish trend"
        );
      } else if (
        factors.emaStructure < 0
      ) {
        factors.adx = -8;
        score -= 8;

        reasons.push(
          "ADX moderately confirms bearish trend"
        );
      } else {
        factors.adx = 0;

        reasons.push(
          "ADX moderate but direction neutral"
        );
      }
    } else {
      factors.adx = 0;

      reasons.push(
        "ADX weak - trend confirmation missing"
      );
    }
  }

  // =====================================================
  // 5. PCR — ±10
  // =====================================================

  const pcrValue = Number(
    pcr?.value ?? pcr?.pcr
  );

  if (Number.isFinite(pcrValue)) {
    if (pcrValue > 1.0) {
      factors.pcr = 10;
      score += 10;

      reasons.push(
        "PCR bullish"
      );
    } else if (pcrValue < 0.7) {
      factors.pcr = -10;
      score -= 10;

      reasons.push(
        "PCR bearish"
      );
    } else {
      factors.pcr = 0;

      reasons.push(
        "PCR balanced"
      );
    }
  }

  // =====================================================
  // 6. VOLUME — ±10
  // =====================================================

  const volumeRatio = Number(
    volume?.ratio
  );

  if (Number.isFinite(volumeRatio)) {
    if (volumeRatio >= 1.5) {
      // Strong volume confirms the existing direction

      if (factors.emaStructure > 0) {
        factors.volume = 10;
        score += 10;

        reasons.push(
          "High volume confirms bullish structure"
        );
      } else if (
        factors.emaStructure < 0
      ) {
        factors.volume = -10;
        score -= 10;

        reasons.push(
          "High volume confirms bearish structure"
        );
      }
    } else if (volumeRatio >= 1.0) {
      // Moderate volume

      if (factors.emaStructure > 0) {
        factors.volume = 5;
        score += 5;

        reasons.push(
          "Volume moderately supports bullish structure"
        );
      } else if (
        factors.emaStructure < 0
      ) {
        factors.volume = -5;
        score -= 5;

        reasons.push(
          "Volume moderately supports bearish structure"
        );
      }
    } else {
      factors.volume = 0;

      reasons.push(
        "Volume confirmation weak"
      );
    }
  }

  // =====================================================
  // SCORE CLAMP
  // =====================================================

  score = Math.max(
    -100,
    Math.min(100, Math.round(score))
  );

  // =====================================================
  // STATE
  // =====================================================

  let state = "NEUTRAL";

  if (score >= 60) {
    state = "STRONG BULLISH";
  } else if (score >= 25) {
    state = "BULLISH";
  } else if (score <= -60) {
    state = "STRONG BEARISH";
  } else if (score <= -25) {
    state = "BEARISH";
  }

  // =====================================================
  // ACTION
  // =====================================================

  let action = "NO TRADE";

  if (score >= 60) {
    action = "BUY / HOLD";
  } else if (score >= 25) {
    action = "BUY ON CONFIRMATION";
  } else if (score <= -60) {
    action = "SELL / HOLD";
  } else if (score <= -25) {
    action = "SELL ON CONFIRMATION";
  }

  // =====================================================
  // CONFIDENCE
  // =====================================================

  const confidence = Math.min(
    100,
    Math.round(
      Math.abs(score)
    )
  );

  // =====================================================
  // RETURN
  // =====================================================

  return {
    score,
    state,
    confidence,
    action,

    factors,

    reasons,

    // ATR intentionally excluded
    // from Bhavish Score.
  };
}