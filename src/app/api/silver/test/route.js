import { NextResponse } from "next/server";
import { getSilver5MCandles } from "@/services/silver/liveMarket";

export async function GET() {
  try {
    const data = await getSilver5MCandles();

    return NextResponse.json(data);
  } catch (error) {
    console.error("SILVER TEST API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}