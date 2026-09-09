// =====================================================
// BHAVISH TRADING
// FAIR AI TRADE ENGINE
// AI SCORE = SETUP STRENGTH (0 - 100)
// =====================================================

export function generateAISignal(marketData) {

  // =====================================================
  // INPUTS
  // =====================================================

  const price = Number(marketData.price) || 0;

  const ema9 = Number(marketData.ema9) || 0;
  const ema20 = Number(marketData.ema20) || 0;
  const ema50 = Number(marketData.ema50) || 0;

  const rsi = Number.isFinite(Number(marketData.rsi))
    ? Number(marketData.rsi)
    : 50;

  const macd = Number(marketData.macd) || 0;
  const macdSignal = Number(marketData.macdSignal) || 0;

  const adx = Number(marketData.adx) || 0;
  const atr = Number(marketData.atr) || 0;

  const support = Number(marketData.support);
  const resistance = Number(marketData.resistance);

  const marketBiasScore =
    Number(marketData.marketBias?.score) || 0;

  const reasons = [];

  // =====================================================
  // BULLISH / BEARISH POINTS
  // =====================================================

  let bullish = 0;
  let bearish = 0;

  // =====================================================
  // 1. MARKET BIAS
  // 15 POINTS
  // =====================================================

  if (marketBiasScore >= 10) {

    bullish += 15;

    reasons.push(
      "Market Bias Bullish"
    );

  } else if (marketBiasScore <= -10) {

    bearish += 15;

    reasons.push(
      "Market Bias Bearish"
    );

  } else {

    reasons.push(
      "Market Bias Neutral"
    );
  }

  // =====================================================
  // 2. EMA ALIGNMENT
  // 20 POINTS
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

    bullish += 20;

    reasons.push(
      "Strong Bullish EMA Alignment"
    );

  } else if (bearishEMA) {

    bearish += 20;

    reasons.push(
      "Strong Bearish EMA Alignment"
    );

  } else {

    reasons.push(
      "EMA Trend Mixed"
    );
  }

  // =====================================================
  // 3. RSI
  // 15 POINTS
  // =====================================================

  if (rsi >= 55 && rsi < 70) {

    bullish += 15;

    reasons.push(
      "RSI Bullish"
    );

  } else if (rsi <= 45 && rsi > 30) {

    bearish += 15;

    reasons.push(
      "RSI Bearish"
    );

  } else if (rsi >= 70) {

    bearish += 5;

    reasons.push(
      "RSI Overbought"
    );

  } else if (rsi <= 30) {

    bullish += 5;

    reasons.push(
      "RSI Oversold"
    );

  } else {

    reasons.push(
      "RSI Neutral"
    );
  }

  // =====================================================
  // 4. MACD
  // 15 POINTS
  // =====================================================

  if (macd > macdSignal) {

    bullish += 15;

    reasons.push(
      "MACD Bullish"
    );

  } else if (macd < macdSignal) {

    bearish += 15;

    reasons.push(
      "MACD Bearish"
    );

  } else {

    reasons.push(
      "MACD Neutral"
    );
  }

  // =====================================================
  // 5. PRICE vs EMA9
  // 5 POINTS
  // =====================================================

  if (price > ema9) {

    bullish += 5;

    reasons.push(
      "Price Above EMA9"
    );

  } else if (price < ema9) {

    bearish += 5;

    reasons.push(
      "Price Below EMA9"
    );

  } else {

    reasons.push(
      "Price Near EMA9"
    );
  }

  // =====================================================
  // 6. ADX / TREND STRENGTH
  // 10 POINTS
  // =====================================================

  if (adx >= 25) {

    if (bullishEMA) {

      bullish += 10;

      reasons.push(
        "Strong Bullish Trend Strength"
      );

    } else if (bearishEMA) {

      bearish += 10;

      reasons.push(
        "Strong Bearish Trend Strength"
      );

    } else {

      reasons.push(
        "Strong ADX but Direction Mixed"
      );
    }

  } else if (adx >= 20) {

    if (bullishEMA) {

      bullish += 5;

    } else if (bearishEMA) {

      bearish += 5;
    }

    reasons.push(
      "Moderate Trend Strength"
    );

  } else {

    reasons.push(
      "Weak Trend — Confidence Reduced"
    );
  }

  // =====================================================
  // 7. SUPPORT / RESISTANCE
  // CONTEXT ONLY
  // =====================================================

  if (
    Number.isFinite(support) &&
    support > 0 &&
    price <= support * 1.002
  ) {

    reasons.push(
      "Price Near Strong Support"
    );
  }

  if (
    Number.isFinite(resistance) &&
    resistance > 0 &&
    price >= resistance * 0.998
  ) {

    reasons.push(
      "Price Near Strong Resistance"
    );
  }

  // =====================================================
  // AI SCORE
  //
  // IMPORTANT:
  // This is SETUP STRENGTH, not direction.
  //
  // Strong Bullish = high score
  // Strong Bearish = high score
  // Mixed = low/medium score
  // =====================================================

  // =====================================================
// FAIR AI SCORE
// Maximum possible directional points = 80
// =====================================================

const dominantPoints =
  Math.max(bullish, bearish);

const MAX_SCORE_POINTS = 80;

let score =
  (dominantPoints / MAX_SCORE_POINTS) * 100;

// Weak trend penalty
if (adx < 20) {
  score -= 10;
} else if (adx < 25) {
  score -= 5;
}

// Clamp 0 - 100
score = Math.round(
  Math.max(
    0,
    Math.min(100, score)
  )
);
  // =====================================================
  // CONFIDENCE
  // =====================================================

  let confidence = score;

  // Weak ADX reduces confidence

  if (adx < 20) {

    confidence -= 15;

  } else if (adx < 25) {

    confidence -= 7;
  }

  // Mixed EMA reduces confidence

  if (
    !bullishEMA &&
    !bearishEMA
  ) {

    confidence -= 5;
  }

  confidence = Math.round(
    Math.max(
      20,
      Math.min(95, confidence)
    )
  );

  // =====================================================
  // FINAL SIGNAL
  // =====================================================

  let signal = "WAIT";

  // Bullish setup

 if (
  bullish > bearish &&
  score >= 65 &&
  confidence >= 60 &&
  marketBiasScore > -20
) {

  signal = "BUY CE";
}

else if (
  bearish > bullish &&
  score >= 65 &&
  confidence >= 60 &&
  marketBiasScore < 20
) {

  signal = "BUY PE";
}

  // Otherwise WAIT

  else {

    signal = "WAIT";
  }

  // =====================================================
  // RISK
  // =====================================================

  let risk = "HIGH";

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

  // =====================================================
  // ENTRY / STOP LOSS / TARGETS
  // =====================================================

  let entry = null;
  let stopLoss = null;
  let target1 = null;
  let target2 = null;

  // =====================================================
  // BUY CE
  // =====================================================

if (signal === "BUY CE") {

  // Entry
  entry =
    +price.toFixed(2);

  // Stop Loss = Entry - ATR
  stopLoss =
    +(price - atr).toFixed(2);

  // Target 1 = Entry + ATR
  target1 =
    +(price + atr).toFixed(2);

  // Target 2 = Entry + 2 ATR
  target2 =
    +(price + atr * 2).toFixed(2);
}
  // =====================================================
  // BUY PE
  // =====================================================

 if (signal === "BUY PE") {

  // Entry
  entry =
    +price.toFixed(2);

  // Stop Loss = Entry + ATR
  stopLoss =
    +(price + atr).toFixed(2);

  // Target 1 = Entry - ATR
  target1 =
    +(price - atr).toFixed(2);

  // Target 2 = Entry - 2 ATR
  target2 =
    +(price - atr * 2).toFixed(2);
}

  // =====================================================
  // ATR
  // =====================================================

  if (atr > 0) {

    reasons.push(
      "ATR Available for Risk Management"
    );
  }

  // =====================================================
  // FINAL RESULT
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
  };
}