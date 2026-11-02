
import { NextResponse } from "next/server";
import { getOIBotAccessToken } from "@/services/oi-bot/tokenStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const token = await getOIBotAccessToken();

    return NextResponse.json({
      success: true,
      tokenAvailable: Boolean(token),
      message: token
        ? "OI BOT Zerodha token is available"
        : "OI BOT Zerodha token not found or expired",
    });
  } catch (error) {
    console.error("OI BOT TOKEN STATUS ERROR:", error.message);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to verify OI BOT token storage",
      },
      { status: 500 }
    );
  }
}
