import { NextResponse } from "next/server";

import {
  getCrudeHistoricalData,
  getLiveCrudeQuote,
} from "@/services/zerodha/market";

import { calculateCrudeLevels } from "@/services/crude/levelEngine";

export async function GET() {
  try {
    const [historical, live] = await Promise.all([
      getCrudeHistoricalData("5minute", 5),
      getLiveCrudeQuote(),
    ]);

    const levels = calculateCrudeLevels(
      historical.candles,
      live.ltp
    );

    return NextResponse.json({
      success: true,
      data: {
        tradingsymbol: live.tradingsymbol,
        ltp: live.ltp,
        levels,
      },
    });
  } catch (error) {
    console.error("CRUDE LEVELS API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}