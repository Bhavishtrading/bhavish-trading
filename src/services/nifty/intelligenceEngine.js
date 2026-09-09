// =====================================================
// NIFTY INTELLIGENCE ENGINE
// Technical + Support/Resistance + Breakout
// =====================================================

export function calculateNiftyIntelligence({
  currentPrice = 0,
  technical = {},
  levels = {},
  marketBias = {},
  pcr = null,
} = {}) {
  try {
    let score = 50;
    const reasons = [];

    const ema = technical.ema || {};
    const vwap = technical.vwap || {};
    const rsi = technical.rsi || {};
    const macd = technical.macd || {};
    const atr = technical.atr || {};
    const adx = technical.adx || {};

    // =================================================
    // EMA ALIGNMENT
    // =================================================

    if (
      ema.ema9 !== null &&
      ema.ema20 !== null &&
      ema.ema50 !== null
    ) {
      if (
        ema.ema9 > ema.ema20 &&
        ema.ema20 > ema.ema50
      ) {
        score += 18;
        reasons.push("EMA Strong Bullish Alignment");
      } else if (
        ema.ema9 < ema.ema20 &&
        ema.ema20 < ema.ema50
      ) {
        score -= 18;
        reasons.push("EMA Strong Bearish Alignment");
      } else if (ema.ema9 > ema.ema20) {
        score += 5;
        reasons.push("EMA Short-Term Bullish");
      } else if (ema.ema9 < ema.ema20) {
        score -= 5;
        reasons.push("EMA Short-Term Bearish");
      }
    }

    // =================================================
    // PRICE vs EMA9
    // =================================================

    if (ema.ema9 !== null) {
      if (currentPrice > ema.ema9) {
        score += 3;
        reasons.push("Price Above EMA9");
      } else if (currentPrice < ema.ema9) {
        score -= 3;
        reasons.push("Price Below EMA9");
      }
    }

    // =================================================
    // VWAP
    // =================================================

    if (vwap.value !== null) {
      if (currentPrice > vwap.value) {
        score += 8;
        reasons.push("Price Above VWAP");
      } else if (currentPrice < vwap.value) {
        score -= 8;
        reasons.push("Price Below VWAP");
      }
    }

    // =================================================
    // RSI
    // =================================================

    if (rsi.value !== null) {
      if (rsi.value >= 55 && rsi.value < 70) {
        score += 7;
        reasons.push("RSI Bullish");
      } else if (rsi.value <= 45 && rsi.value > 30) {
        score -= 7;
        reasons.push("RSI Bearish");
      } else if (rsi.value >= 70) {
        score -= 4;
        reasons.push("RSI Overbought");
      } else if (rsi.value <= 30) {
        score += 4;
        reasons.push("RSI Oversold");
      }
    }

    // =================================================
    // MACD
    // =================================================

    if (
      macd.macd !== null &&
      macd.signal !== null &&
      macd.histogram !== null
    ) {
      const histogram = macd.histogram;

      if (histogram > 0) {
        score += 8;
        reasons.push("MACD Bullish");
      } else if (histogram < 0) {
        score -= 8;
        reasons.push("MACD Bearish");
      }

      // Weak histogram = reduce confidence in signal
      if (Math.abs(histogram) < 0.5) {
        score =
          histogram > 0
            ? score - 3
            : score + 3;

        reasons.push("Weak MACD Momentum");
      }
    }

    // =================================================
    // ADX / TREND STRENGTH
    // =================================================

    let trendStrength = "WEAK";

    if (adx.adx !== null) {
      if (adx.adx >= 25) {
        trendStrength = "STRONG";

        if (adx.plusDI > adx.minusDI) {
          score += 5;
          reasons.push("Strong Bullish Trend");
        } else if (
          adx.minusDI > adx.plusDI
        ) {
          score -= 5;
          reasons.push("Strong Bearish Trend");
        }
      } else if (adx.adx >= 20) {
        trendStrength = "MODERATE";

        if (adx.plusDI > adx.minusDI) {
          score += 3;
          reasons.push("Moderate Bullish Trend");
        } else if (
          adx.minusDI > adx.plusDI
        ) {
          score -= 3;
          reasons.push("Moderate Bearish Trend");
        }
      } else {
        trendStrength = "WEAK";
        score -= 2;
        reasons.push("Weak Trend");
      }
    }

    // =================================================
    // SUPPORT
    // =================================================

    if (
      levels.support !== null &&
      levels.supportStrength >= 70
    ) {
      const supportDistance =
        currentPrice - levels.support;

      if (
        supportDistance >= 0 &&
        supportDistance <=
          Math.max(currentPrice * 0.003, 50)
      ) {
        score += 4;
        reasons.push("Strong Support Nearby");
      }
    }

    // =================================================
    // RESISTANCE
    // =================================================

    if (
      levels.resistance !== null &&
      levels.resistanceStrength >= 70
    ) {
      const resistanceDistance =
        levels.resistance - currentPrice;

      if (
        resistanceDistance >= 0 &&
        resistanceDistance <=
          Math.max(currentPrice * 0.003, 50)
      ) {
        score -= 8;
        reasons.push("Strong Resistance Nearby");
      }
    }

    // =================================================
    // BREAKOUT
    // =================================================

    if (levels.breakout) {
      score += 18;
      reasons.push(
        "Confirmed Breakout with Volume"
      );
    } else if (levels.breakoutWatch) {
      reasons.push(
        "Breakout Watch - Confirmation Pending"
      );
    }

    // =================================================
    // BREAKDOWN
    // =================================================

    if (levels.breakdown) {
      score -= 18;
      reasons.push(
        "Confirmed Breakdown with Volume"
      );
    } else if (levels.breakdownWatch) {
      reasons.push(
        "Breakdown Watch - Confirmation Pending"
      );
    }

    // =================================================
    // PCR
    // =================================================

    if (Number.isFinite(Number(pcr))) {
      const pcrValue = Number(pcr);

      if (pcrValue >= 1.1) {
        score += 5;
        reasons.push("PCR Bullish");
      } else if (pcrValue <= 0.7) {
        score -= 5;
        reasons.push("PCR Bearish");
      }
    }

    // =================================================
    // MARKET BIAS
    // Existing AI / Structure Bias
    // =================================================

    if (
      Number.isFinite(
        Number(marketBias.confidence)
      )
    ) {
      const biasConfidence =
        Number(marketBias.confidence);

      const biasReasons =
        Array.isArray(marketBias.reasons)
          ? marketBias.reasons
          : [];

      const hasBullishBias =
        biasReasons.some((reason) =>
          String(reason)
            .toLowerCase()
            .includes("bullish")
        );

      const hasBearishBias =
        biasReasons.some((reason) =>
          String(reason)
            .toLowerCase()
            .includes("bearish")
        );

      if (
        biasConfidence >= 60 &&
        hasBullishBias &&
        !hasBearishBias
      ) {
        score += 5;
        reasons.push("Existing Market Bias Bullish");
      } else if (
        biasConfidence >= 60 &&
        hasBearishBias &&
        !hasBullishBias
      ) {
        score -= 5;
        reasons.push("Existing Market Bias Bearish");
      }
    }

    // =================================================
    // VOLUME
    // =================================================

    if (levels.volumeConfirmed) {
      reasons.push(
        `Volume Confirmed (${Number(
          levels.volumeRatio
        ).toFixed(2)}x)`
      );
    } else {
      reasons.push("Volume Confirmation Weak");
    }

    // =================================================
    // SCORE CLAMP
    // =================================================

    score = Math.max(
      0,
      Math.min(100, Math.round(score))
    );

    // =================================================
    // MARKET BIAS
    // =================================================

    let bias = "NEUTRAL";

    if (score >= 65) {
      bias = "BULLISH";
    } else if (score <= 35) {
      bias = "BEARISH";
    }

    // =================================================
    // CONFIDENCE
    // =================================================

    let confidence =
      Math.abs(score - 50) * 2;

    // Weak trend reduces confidence
    if (
      adx.adx !== null &&
      adx.adx < 20
    ) {
      confidence -= 10;
    }

    // Weak MACD reduces confidence
    if (
      macd.histogram !== null &&
      Math.abs(macd.histogram) < 0.5
    ) {
      confidence -= 5;
    }

    // Breakout / breakdown confirmation
    if (
      levels.breakout ||
      levels.breakdown
    ) {
      confidence += 10;
    }

    confidence = Math.max(
      0,
      Math.min(
        100,
        Math.round(confidence)
      )
    );

    // =================================================
    // ACTION
    // =================================================

    // =================================================
// ACTION
// =================================================

let action = "WAIT";

// Check important level proximity
const supportNearby =
  levels.support !== null &&
  levels.supportStrength >= 70 &&
  currentPrice >= levels.support &&
  currentPrice <=
    levels.support + Math.max(currentPrice * 0.003, 50);

const resistanceNearby =
  levels.resistance !== null &&
  levels.resistanceStrength >= 70 &&
  currentPrice <= levels.resistance &&
  currentPrice >=
    levels.resistance - Math.max(currentPrice * 0.003, 50);

// -------------------------------------------------
// CONFIRMED BREAKOUT / BREAKDOWN
// -------------------------------------------------

if (
  levels.breakout &&
  trendStrength !== "WEAK"
) {
  action = "BUY CE";
} else if (
  levels.breakdown &&
  trendStrength !== "WEAK"
) {
  action = "BUY PE";

// -------------------------------------------------
// BULLISH + RESISTANCE NEARBY
// -------------------------------------------------

} else if (
  bias === "BULLISH" &&
  resistanceNearby
) {
  action = "WAIT FOR RESISTANCE BREAK";

// -------------------------------------------------
// BEARISH + SUPPORT NEARBY
// -------------------------------------------------

} else if (
  bias === "BEARISH" &&
  supportNearby
) {
  action = "WAIT FOR SUPPORT BREAK";

// -------------------------------------------------
// NORMAL TREND ACTION
// -------------------------------------------------

} else if (
  bias === "BULLISH" &&
  trendStrength === "STRONG"
) {
  action = "BUY CE / HOLD";
} else if (
  bias === "BEARISH" &&
  trendStrength === "STRONG"
) {
  action = "BUY PE / HOLD";
} else if (
  bias === "BULLISH" &&
  trendStrength === "MODERATE"
) {
  action = "BUY CE ON DIP";
} else if (
  bias === "BEARISH" &&
  trendStrength === "MODERATE"
) {
  action = "BUY PE ON RISE";

// -------------------------------------------------
// WATCH CONDITIONS
// -------------------------------------------------

} else if (
  levels.breakoutWatch
) {
  action = "WAIT FOR BREAKOUT";
} else if (
  levels.breakdownWatch
) {
  action = "WAIT FOR BREAKDOWN";
} else {
  action = "WAIT FOR CONFIRMATION";
}

    // =================================================
    // RISK
    // =================================================

    let risk = "MEDIUM";

    if (
      trendStrength === "STRONG" &&
      confidence >= 75
    ) {
      risk = "LOW";
    } else if (
      trendStrength === "WEAK" ||
      confidence < 50
    ) {
      risk = "HIGH";
    }

    // =================================================
    // FINAL RESULT
    // =================================================

    return {
      score,
      bias,
      confidence,
      trendStrength,
      action,
      risk,
      reasons,

      support: levels.support ?? null,
      resistance: levels.resistance ?? null,

      supportStrength:
        levels.supportStrength ?? 0,

      resistanceStrength:
        levels.resistanceStrength ?? 0,

      breakout:
        Boolean(levels.breakout),

      breakdown:
        Boolean(levels.breakdown),

      breakoutWatch:
        Boolean(levels.breakoutWatch),

      breakdownWatch:
        Boolean(levels.breakdownWatch),

      breakoutReference:
        levels.breakoutReference ?? null,

      breakdownReference:
        levels.breakdownReference ?? null,

      volumeRatio:
        levels.volumeRatio ?? 0,

      volumeConfirmed:
        Boolean(levels.volumeConfirmed),

      previousHigh:
        levels.previousHigh ?? null,

      previousLow:
        levels.previousLow ?? null,

      rangePosition:
        levels.rangePosition ?? 50,

      levelBias:
        levels.levelBias ?? "NEUTRAL",
    };
  } catch (error) {
    console.error(
      "NIFTY INTELLIGENCE ENGINE ERROR ================="
    );
    console.error(error);

    return {
      score: 50,
      bias: "NEUTRAL",
      confidence: 0,
      trendStrength: "WEAK",
      action: "WAIT",
      risk: "HIGH",
      reasons: [
        "Intelligence Engine Error",
      ],

      support: null,
      resistance: null,

      supportStrength: 0,
      resistanceStrength: 0,

      breakout: false,
      breakdown: false,

      breakoutWatch: false,
      breakdownWatch: false,

      breakoutReference: null,
      breakdownReference: null,

      volumeRatio: 0,
      volumeConfirmed: false,

      previousHigh: null,
      previousLow: null,

      rangePosition: 50,
      levelBias: "NEUTRAL",
    };
  }
}