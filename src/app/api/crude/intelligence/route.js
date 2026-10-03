import { NextResponse } from "next/server";

import {
  getCrudeHistoricalData,
  getLiveCrudeQuote,
} from "@/services/zerodha/market";

import { calculateCrudeTechnicalIndicators } from "@/services/crude/technicalEngine";
import { calculateCrudeLevels } from "@/services/crude/levelEngine";
import { calculateCrudeIntelligence } from "@/services/crude/intelligenceEngine";
import { calculateCrudeBhavishScore } from "@/services/crude/bhavishScoreEngine";
import { getCrudePCR } from "@/services/crude/options";

// ============================================================
// ADX + DI CALCULATION
// ============================================================

function calculateCrudeADXDI(candles, period = 14) {
  const length = candles?.length || 0;

  const adx = new Array(length).fill(null);
  const plusDI = new Array(length).fill(null);
  const minusDI = new Array(length).fill(null);
  const dx = new Array(length).fill(null);

  if (length <= period * 2) {
    return {
      adx,
      plusDI,
      minusDI,
    };
  }

  const tr = new Array(length).fill(0);
  const plusDM = new Array(length).fill(0);
  const minusDM = new Array(length).fill(0);

  // ----------------------------------------------------------
  // TRUE RANGE + DIRECTIONAL MOVEMENT
  // ----------------------------------------------------------

  for (let i = 1; i < length; i++) {
    const high = Number(candles[i].high);
    const low = Number(candles[i].low);

    const previousHigh =
      Number(candles[i - 1].high);

    const previousLow =
      Number(candles[i - 1].low);

    const previousClose =
      Number(candles[i - 1].close);

    tr[i] = Math.max(
      high - low,
      Math.abs(high - previousClose),
      Math.abs(low - previousClose)
    );

    const upMove =
      high - previousHigh;

    const downMove =
      previousLow - low;

    plusDM[i] =
      upMove > downMove && upMove > 0
        ? upMove
        : 0;

    minusDM[i] =
      downMove > upMove && downMove > 0
        ? downMove
        : 0;
  }

  // ----------------------------------------------------------
  // INITIAL SMOOTHING
  // ----------------------------------------------------------

  let trSum = 0;
  let plusDMSum = 0;
  let minusDMSum = 0;

  for (let i = 1; i <= period; i++) {
    trSum += tr[i];
    plusDMSum += plusDM[i];
    minusDMSum += minusDM[i];
  }

  let smoothedTR = trSum;
  let smoothedPlusDM = plusDMSum;
  let smoothedMinusDM = minusDMSum;

  // ----------------------------------------------------------
  // +DI / -DI / DX
  // ----------------------------------------------------------

  for (let i = period; i < length; i++) {
    if (i > period) {
      smoothedTR =
        smoothedTR -
        smoothedTR / period +
        tr[i];

      smoothedPlusDM =
        smoothedPlusDM -
        smoothedPlusDM / period +
        plusDM[i];

      smoothedMinusDM =
        smoothedMinusDM -
        smoothedMinusDM / period +
        minusDM[i];
    }

    if (smoothedTR !== 0) {
      plusDI[i] =
        (smoothedPlusDM / smoothedTR) *
        100;

      minusDI[i] =
        (smoothedMinusDM / smoothedTR) *
        100;
    }

    if (
      plusDI[i] !== null &&
      minusDI[i] !== null &&
      plusDI[i] + minusDI[i] !== 0
    ) {
      dx[i] =
        (Math.abs(
          plusDI[i] - minusDI[i]
        ) /
          (plusDI[i] + minusDI[i])) *
        100;
    }
  }

  // ----------------------------------------------------------
  // FIRST ADX
  // ----------------------------------------------------------

  const firstDXIndex = period;

  let dxSum = 0;
  let dxCount = 0;

  for (
    let i = firstDXIndex;
    i < length && dxCount < period;
    i++
  ) {
    if (dx[i] !== null) {
      dxSum += dx[i];
      dxCount++;
    }
  }

  if (dxCount < period) {
    return {
      adx,
      plusDI,
      minusDI,
    };
  }

  const firstADXIndex =
    firstDXIndex + period - 1;

  let currentADX =
    dxSum / period;

  adx[firstADXIndex] =
    currentADX;

  // ----------------------------------------------------------
  // CONTINUE ADX
  // ----------------------------------------------------------

  for (
    let i = firstADXIndex + 1;
    i < length;
    i++
  ) {
    if (dx[i] !== null) {
      currentADX =
        (
          currentADX * (period - 1) +
          dx[i]
        ) / period;

      adx[i] =
        currentADX;
    }
  }

  return {
    adx,
    plusDI,
    minusDI,
  };
}

// ============================================================
// GET CURRENT ADX DIRECTION
// ============================================================

function getADXDirection(
  plusDI,
  minusDI
) {
  if (
    !Number.isFinite(Number(plusDI)) ||
    !Number.isFinite(Number(minusDI))
  ) {
    return "Neutral";
  }

  if (
    Number(plusDI) >
    Number(minusDI)
  ) {
    return "Bullish";
  }

  if (
    Number(minusDI) >
    Number(plusDI)
  ) {
    return "Bearish";
  }

  return "Neutral";
}

// ============================================================
// GET ADX TREND
// ============================================================

function getADXTrend(adxValue) {
  const value = Number(adxValue);

  if (!Number.isFinite(value)) {
    return "Unknown";
  }

  if (value >= 25) {
    return "Trending";
  }

  return "Weak Trend";
}

// ============================================================
// MAIN API
// ============================================================

export async function GET() {
  try {
    // ================================================
    // GET HISTORICAL + LIVE DATA
    // ================================================

    const [historical, live] =
      await Promise.all([
        getCrudeHistoricalData(
          "5minute",
          5
        ),

        getLiveCrudeQuote(),
      ]);

    // ================================================
    // CRUDE PCR
    // ================================================

    const pcrData =
      await getCrudePCR();

    // ================================================
    // TECHNICAL INDICATORS
    // ================================================

    const indicators =
      calculateCrudeTechnicalIndicators(
        historical.candles
      );

    // ================================================
    // ADX + DI
    // ================================================

    const adxData =
      calculateCrudeADXDI(
        historical.candles,
        14
      );

    const lastIndex =
      historical.candles.length - 1;

    // ================================================
    // EXISTING ADX VALUE
    //
    // IMPORTANT:
    // Preserve existing Crude ADX value first.
    // ================================================

    const existingADX =
      indicators?.adx14 ??
      indicators?.adx?.value ??
      adxData.adx[lastIndex];

    // ================================================
    // +DI
    // ================================================

    const existingPlusDI =
      indicators?.adxPlusDI ??
      indicators?.adx?.plusDI ??
      indicators?.plusDI14 ??
      indicators?.series?.plusDI14?.[
        lastIndex
      ] ??
      adxData.plusDI[lastIndex];

    // ================================================
    // -DI
    // ================================================

    const existingMinusDI =
      indicators?.adxMinusDI ??
      indicators?.adx?.minusDI ??
      indicators?.minusDI14 ??
      indicators?.series?.minusDI14?.[
        lastIndex
      ] ??
      adxData.minusDI[lastIndex];

    // ================================================
    // ADX DIRECTION
    // ================================================

    const adxDirection =
      indicators?.adxDirection ??
      indicators?.adx?.direction ??
      getADXDirection(
        existingPlusDI,
        existingMinusDI
      );

    // ================================================
    // ADX TREND
    // ================================================

    const adxTrend =
      indicators?.adxTrend ??
      indicators?.adx?.trend ??
      getADXTrend(existingADX);

    // ================================================
    // SUPPORT / RESISTANCE
    // ================================================

    const levels =
      calculateCrudeLevels(
        historical.candles,
        live.ltp
      );

    // ================================================
    // EXISTING CRUDE INTELLIGENCE
    // ================================================

    const intelligence =
      calculateCrudeIntelligence(
        indicators,
        live,
        levels
      );

    // ================================================
    // CRUDE BHAVISH SCORE
    // ================================================

    const bhavishScore =
      calculateCrudeBhavishScore(
        indicators,
        pcrData,
        {
          ratio:
            levels.volumeRatio,
        }
      );

    // ================================================
    // RESPONSE
    // ================================================

    return NextResponse.json({
      success: true,

      data: {
        // ============================================
        // TRADING SYMBOL
        // ============================================

        tradingsymbol:
          live.tradingsymbol,

        // ============================================
        // PRICE
        // ============================================

        price: {
          ltp:
            live.ltp,

          open:
            live.open,

          high:
            live.high,

          low:
            live.low,

          close:
            live.close,

          volume:
            live.volume,

          oi:
            live.oi,
        },

        // ============================================
        // PCR
        // ============================================

        pcr: {
          value:
            pcrData.pcr,

          ceOI:
            pcrData.ceOI,

          peOI:
            pcrData.peOI,

          expiry:
            pcrData.expiry,

          ceCount:
            pcrData.ceCount,

          peCount:
            pcrData.peCount,
        },

        // ============================================
        // TECHNICAL INDICATORS
        // ============================================

        technical: {
          ema9:
            indicators.ema9,

          ema20:
            indicators.ema20,

          ema50:
            indicators.ema50,

          ema200:
            indicators.ema200,

          vwap:
            indicators.vwap,

          rsi14:
            indicators.rsi14,

          // ------------------------------------------
          // MACD
          // ------------------------------------------

          macd: {
            macd:
              indicators.macd.macd,

            signal:
              indicators.macd.signal,

            histogram:
              indicators.macd.histogram,
          },

          // ------------------------------------------
          // ADX
          // ------------------------------------------

          // Keep the original flat field.
          // This prevents the existing ADX card
          // from becoming "--".

          adx14:
            existingADX,

          // +DI

          adxPlusDI:
            existingPlusDI,

          // -DI

          adxMinusDI:
            existingMinusDI,

          // Direction

          adxDirection:
            adxDirection,

          // Trend

          adxTrend:
            adxTrend,

          // ------------------------------------------
          // ATR
          // ------------------------------------------

          atr14:
            indicators.atr14,
        },

        // ============================================
        // SUPPORT / RESISTANCE DATA
        // ============================================

        levels: {
          support:
            levels.support,

          resistance:
            levels.resistance,

          breakoutReference:
            levels.breakoutReference,

          breakdownReference:
            levels.breakdownReference,

          windowHigh:
            levels.windowHigh,

          windowLow:
            levels.windowLow,

          previousHigh:
            levels.previousHigh,

          previousLow:
            levels.previousLow,

          supportDistance:
            levels.supportDistance,

          resistanceDistance:
            levels.resistanceDistance,

          supportDistancePercent:
            levels.supportDistancePercent,

          resistanceDistancePercent:
            levels.resistanceDistancePercent,

          nearSupport:
            levels.nearSupport,

          nearResistance:
            levels.nearResistance,

          supportTouches:
            levels.supportTouches,

          resistanceTouches:
            levels.resistanceTouches,

          supportRejections:
            levels.supportRejections,

          resistanceRejections:
            levels.resistanceRejections,

          supportStrength:
            levels.supportStrength,

          resistanceStrength:
            levels.resistanceStrength,

          volumeRatio:
            levels.volumeRatio,

          volumeConfirmed:
            levels.volumeConfirmed,

          latestClose:
            levels.latestClose,

          latestHigh:
            levels.latestHigh,

          latestLow:
            levels.latestLow,

          nextCandleHold:
            levels.nextCandleHold,

          nextCandleBreakdownHold:
            levels.nextCandleBreakdownHold,

          breakout:
            levels.breakout,

          breakdown:
            levels.breakdown,

          breakoutWatch:
            levels.breakoutWatch,

          breakdownWatch:
            levels.breakdownWatch,

          rangePosition:
            levels.rangePosition,

          levelBias:
            levels.levelBias,

          swingHighCount:
            levels.swingHighCount,

          swingLowCount:
            levels.swingLowCount,
        },

        // ============================================
        // EXISTING CRUDE INTELLIGENCE
        // ============================================

        intelligence: {
          score:
            intelligence.score,

          bias:
            intelligence.bias,

          trendStrength:
            intelligence.trendStrength,

          confidence:
            intelligence.confidence,

          action:
            intelligence.action,

          reasons:
            intelligence.reasons,

          volatility:
            intelligence.volatility,
        },

        // ============================================
        // CRUDE BHAVISH SCORE
        // ============================================

        bhavishScore: {
          score:
            bhavishScore.score,

          state:
            bhavishScore.state,

          confidence:
            bhavishScore.confidence,

          action:
            bhavishScore.action,

          factors:
            bhavishScore.factors,

          reasons:
            bhavishScore.reasons,
        },
      },
    });

  } catch (error) {
    console.error(
      "CRUDE INTELLIGENCE API ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}