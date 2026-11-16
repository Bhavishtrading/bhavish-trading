
import { NextResponse } from "next/server";
import { getNiftyFutureVolume } from "@/services/zerodha/niftyFutureVolume";
import { analyzeNiftyFutureFlow } from "@/services/zerodha/niftyFutureFlow";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getNiftyFutureVolume();

    const analysis = analyzeNiftyFutureFlow(data.candles);

    return NextResponse.json({
      success: true,
      instrument: data.instrument,
      expiry: data.expiry,
      interval: data.interval,
      validation: data.validation,
      analysis,
    });
  } catch (error) {
    console.error("NIFTY FUTURE FLOW ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message || "Unable to analyze NIFTY Futures flow",
      },
      { status: 500 }
    );
  }
}
