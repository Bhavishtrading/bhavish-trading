
import { NextResponse } from "next/server";

import {
  getOIBotSignalHistory,
} from "@/services/oi-bot/signalHistoryEngine";

import {
  getOIBotAccessToken,
} from "@/services/oi-bot/tokenStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  try {
    // 1. Verify OI BOT access token

    const accessToken = await getOIBotAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          reason: "OI BOT Zerodha token unavailable",
        },
        { status: 401 }
      );
    }

    // 2. Read requested history limit

    const { searchParams } = new URL(request.url);

    const requestedLimit = Number(
      searchParams.get("limit") || 50
    );

    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(requestedLimit, 100))
      : 50;

    // 3. Fetch Redis history

    const result = await getOIBotSignalHistory(limit);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          reason: result.reason || "Unable to read signal history",
        },
        { status: 500 }
      );
    }

    // 4. Return history

    return NextResponse.json({
      success: true,
      count: result.count,
      history: result.history,
      checkedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error(
      "OI BOT SIGNAL HISTORY API ERROR:",
      error.message
    );

    return NextResponse.json(
      {
        success: false,
        reason: error.message,
      },
      { status: 500 }
    );
  }
}
