import { NextResponse } from "next/server";
import { getNiftyFutureVWAP } from "@/services/zerodha/niftyFutureVWAP";

export async function GET() {
  try {
    const vwap = await getNiftyFutureVWAP();

    return NextResponse.json({
      success: true,
      vwap,
    });
  } catch (error) {
    console.error("NIFTY FUTURE VWAP API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}