import { NextResponse } from "next/server";
import { getSilverMarketData } from "@/services/silver/marketEngine";

export async function GET() {
  try {
    const data = await getSilverMarketData();

    return NextResponse.json(data);
  } catch (error) {
    console.error(
      "SILVER TECHNICAL API ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}