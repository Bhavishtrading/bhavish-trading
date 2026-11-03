
import { NextResponse } from "next/server";
import { getOIBotMarketConfirmation } from "@/services/oi-bot/marketConfirmationEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await getOIBotMarketConfirmation();

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error("OI BOT MARKET API ERROR:", error.message);

    return NextResponse.json(
      {
        success: false,
        bias: "NEUTRAL",
        error: "Market confirmation unavailable",
      },
      { status: 500 }
    );
  }
}
