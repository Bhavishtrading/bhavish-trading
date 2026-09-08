import { NextResponse } from "next/server";
import { getCrudeHistoricalData } from "@/services/zerodha/market";

export async function GET() {
  try {
    const result = await getCrudeHistoricalData("5minute", 5);

    return NextResponse.json({
      success: true,
      data: {
        tradingsymbol: result.tradingsymbol,
        instrumentToken: result.instrumentToken,
        expiry: result.expiry,
        interval: result.interval,
        candleCount: result.candles.length,
        candles: result.candles,
      },
    });
  } catch (error) {
    console.error("CRUDE HISTORY TEST ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}