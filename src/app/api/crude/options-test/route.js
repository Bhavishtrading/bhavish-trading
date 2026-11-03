import { NextResponse } from "next/server";

import { getCrudeOilOptions } from "@/services/zerodha/instruments";

export async function GET() {
  try {
    console.log("======================================");
    console.log("CRUDE OPTIONS TEST API");
    console.log("======================================");

    const options = await getCrudeOilOptions();

    console.log("TOTAL CRUDE OPTIONS:", options.length);

    const sample = options.slice(0, 20).map((item) => ({
      tradingsymbol: item.tradingsymbol,
      instrumentToken: item.instrument_token,
      expiry: item.expiry,
      strike: item.strike,
      instrumentType: item.instrument_type,
      exchange: item.exchange,
      segment: item.segment,
      lotSize: item.lot_size,
    }));

    console.log("CRUDE OPTIONS SAMPLE:", sample);

    return NextResponse.json({
      success: true,
      count: options.length,
      sample,
    });

  } catch (error) {
    console.error(
      "CRUDE OPTIONS TEST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}