
import { NextResponse } from "next/server";
import { getNiftyHistoricalData } from "@/services/zerodha/market";
import { analyzeMarketStructure } from "@/services/zerodha/marketStructureEngine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const spotData = await getNiftyHistoricalData("5minute", 10);

    const analysis = analyzeMarketStructure({
      candles: spotData.candles,
      leftBars: 2,
      rightBars: 2,
    });

    return NextResponse.json({
      success: analysis.success,
      instrument: spotData.tradingsymbol,
      timeframe: "5minute",
      analysis,
    });
  } catch (error) {
    console.error("MARKET STRUCTURE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Unable to analyze market structure",
      },
      { status: 500 }
    );
  }
}
