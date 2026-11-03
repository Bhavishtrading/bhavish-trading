
import { NextResponse } from "next/server";
import { getNiftyFutureOI } from "@/services/zerodha/niftyFutureOI";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getNiftyFutureOI();

    return NextResponse.json(data);

  } catch (error) {
    console.error("NIFTY FUTURES OI API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unable to fetch NIFTY Futures OI",
      },
      { status: 500 }
    );
  }
}
