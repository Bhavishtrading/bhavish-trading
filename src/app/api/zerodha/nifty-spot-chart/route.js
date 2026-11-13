
import { NextResponse } from "next/server";
import { getNiftyHistoricalData } from "@/services/zerodha/market";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_INTERVALS = [
  "minute",
  "3minute",
  "5minute",
  "15minute",
];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const interval = searchParams.get("interval") || "5minute";
    const days = Math.min(
      Math.max(Number(searchParams.get("days")) || 5, 1),
      30
    );

    if (!ALLOWED_INTERVALS.includes(interval)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid candle interval",
        },
        { status: 400 }
      );
    }

    const result = await getNiftyHistoricalData(interval, days);

    return NextResponse.json({
      success: true,
      instrument: result.tradingsymbol,
      instrumentToken: result.instrumentToken,
      interval: result.interval,
      candles: result.candles,
    });
  } catch (error) {
    console.error("NIFTY SPOT CHART API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Unable to fetch NIFTY candles",
      },
      { status: 500 }
    );
  }
}
