import { NextResponse } from "next/server";

import {
  getCrudeHistoricalData,
  getLiveCrudeQuote,
} from "@/services/zerodha/market";

import { calculateCrudeTechnicalIndicators } from "@/services/crude/technicalEngine";
import { calculateCrudeLevels } from "@/services/crude/levelEngine";
import { calculateCrudeIntelligence } from "@/services/crude/intelligenceEngine";

export async function GET() {
  try {
    // ================================================
    // GET HISTORICAL + LIVE DATA
    // ================================================

    const [historical, live] = await Promise.all([
      getCrudeHistoricalData("5minute", 5),
      getLiveCrudeQuote(),
    ]);

    // ================================================
    // TECHNICAL INDICATORS
    // ================================================

    const indicators =
      calculateCrudeTechnicalIndicators(
        historical.candles
      );

    // ================================================
    // SUPPORT / RESISTANCE
    // ================================================

    const levels =
      calculateCrudeLevels(
        historical.candles,
        live.ltp
      );

    // ================================================
    // INTELLIGENCE
    // ================================================

    const intelligence =
      calculateCrudeIntelligence(
        indicators,
        live,
        levels
      );

    // ================================================
    // RESPONSE
    // ================================================

    return NextResponse.json({
      success: true,

      data: {
        tradingsymbol: live.tradingsymbol,

        price: {
          ltp: live.ltp,
          open: live.open,
          high: live.high,
          low: live.low,
          close: live.close,
          volume: live.volume,
          oi: live.oi,
        },

        technical: {
          ema9: indicators.ema9,
          ema20: indicators.ema20,
          ema50: indicators.ema50,
          ema200: indicators.ema200,

          vwap: indicators.vwap,

          rsi14: indicators.rsi14,

          macd: {
            macd: indicators.macd.macd,
            signal: indicators.macd.signal,
            histogram: indicators.macd.histogram,
          },

          adx14: indicators.adx14,
          atr14: indicators.atr14,
        },

        // ============================================
        // SUPPORT / RESISTANCE DATA
        // ============================================

        levels: {
  support: levels.support,
  resistance: levels.resistance,
  breakoutReference: levels.breakoutReference,
  breakdownReference: levels.breakdownReference,

  windowHigh: levels.windowHigh,
  windowLow: levels.windowLow,

  previousHigh: levels.previousHigh,
  previousLow: levels.previousLow,

  supportDistance: levels.supportDistance,
  resistanceDistance: levels.resistanceDistance,

  supportDistancePercent:
    levels.supportDistancePercent,

  resistanceDistancePercent:
    levels.resistanceDistancePercent,

  nearSupport: levels.nearSupport,
  nearResistance: levels.nearResistance,

  supportTouches: levels.supportTouches,
  resistanceTouches: levels.resistanceTouches,

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
  nextCandleHold: levels.nextCandleHold,
nextCandleBreakdownHold: levels.nextCandleBreakdownHold,  

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
        // CRUDE INTELLIGENCE
        // ============================================

        intelligence: {
          score: intelligence.score,
          bias: intelligence.bias,

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
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}