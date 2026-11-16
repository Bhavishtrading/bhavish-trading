
import { NextResponse } from "next/server";

import { getNiftyHistoricalData } from "@/services/zerodha/market";
import { getNiftyFutureVolume } from "@/services/zerodha/niftyFutureVolume";
import { analyzeNiftyFutureFlow } from "@/services/zerodha/niftyFutureFlow";
import { getNiftyFutureVWAP } from "@/services/zerodha/niftyFutureVWAP";

import {
  getNiftyFutureTechnicalIndicators,
} from "@/services/nifty/niftyFutureTechnicalEngine";

import {
  analyzeMarketConfirmation,
} from "@/services/zerodha/marketConfirmationEngine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      spotData,
      futuresData,
      vwapData,
      futuresTechnical,
    ] = await Promise.all([
      getNiftyHistoricalData("5minute", 10),
      getNiftyFutureVolume(),
      getNiftyFutureVWAP(),
      getNiftyFutureTechnicalIndicators("5minute", 5),
    ]);

    const futuresFlow = {
      ...analyzeNiftyFutureFlow(futuresData.candles),
      instrument: futuresData.instrument,
    };

    const analysis = analyzeMarketConfirmation({
      spotCandles: spotData.candles,
      futuresFlow,
      futuresVWAP: vwapData,
      futuresTechnical,
    });

    return NextResponse.json({
      success: analysis.success,

      instrument: {
        spot: spotData.tradingsymbol,
        futures: futuresData.instrument,
        expiry: futuresData.expiry,
      },

      timeframe: "5minute",

      validation: {
        spotCandles: spotData.candles.length,
        futuresCandles: futuresData.validation.validCandles,
        futuresRemovedCandles: futuresData.validation.removedCandles,
        vwapCandles: vwapData.candles,
        futuresTechnicalCandles:
          futuresTechnical.candleCount,
        futuresTechnicalSessionCandles:
          futuresTechnical.sessionCandleCount,
      },

      futuresTechnical,

      analysis,
    });

  } catch (error) {
    console.error("TREND INTELLIGENCE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message || "Unable to analyze NIFTY Trend",
      },
      { status: 500 }
    );
  }
}
