
import { NextResponse } from "next/server";

import { getNiftyHistoricalData } from "@/services/zerodha/market";
import { analyzeMarketStructure } from "@/services/zerodha/marketStructureEngine";
import { analyzeBreakoutRetest } from "@/services/zerodha/breakoutRetestEngine";
import { calculateATR } from "@/services/indicators/atr";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const spotData = await getNiftyHistoricalData("5minute", 10);

    const structure = analyzeMarketStructure({
      candles: spotData.candles,
      leftBars: 2,
      rightBars: 2,
    });

    const completedCandles = spotData.candles.filter((candle) => {
      const timestamp = new Date(candle.date).getTime();

      return (
        Number.isFinite(timestamp) &&
        timestamp + 5 * 60 * 1000 <= Date.now()
      );
    });

    const atr = calculateATR(completedCandles, 14);

    const breakout = analyzeBreakoutRetest({
      candles: spotData.candles,
      structure,
      atr,
    });

    return NextResponse.json({
      success: breakout.success,
      instrument: spotData.tradingsymbol,
      timeframe: "5minute",
      structure,
      breakout,
    });
  } catch (error) {
    console.error("BREAKOUT RETEST TEST ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Unable to analyze breakout and retest",
      },
      { status: 500 }
    );
  }
}
