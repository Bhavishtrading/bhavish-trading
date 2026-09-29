import { NextResponse } from "next/server";
import { testNiftyFuture } from "@/services/zerodha/testNiftyFuture";

export async function GET() {
  try {
    const future = await testNiftyFuture();

    return NextResponse.json({
      success: true,
      future: {
        tradingsymbol: future.tradingsymbol,
        instrument_token: future.instrument_token,
        expiry: future.expiry,
        lot_size: future.lot_size,
        segment: future.segment,
        instrument_type: future.instrument_type,
      },
    });
  } catch (error) {
    console.error("NIFTY FUTURE API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}