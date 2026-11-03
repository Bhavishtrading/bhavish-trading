
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { analyzeOIBot } from "@/services/oi-bot/analysisEngine";
import { getOIBotAccessToken } from "@/services/oi-bot/tokenStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const FUTURES_HISTORY_KEY = "bhavish:oi-bot:nifty-futures:history";
const OPTIONS_HISTORY_KEY = "bhavish:oi-bot:nifty-options:history";

async function readHistory(key) {
  const raw = await redis.lrange(key, 0, -1);

  return raw.map((item) => {
    if (typeof item === "string") {
      return JSON.parse(item);
    }

    return item;
  });
}

export async function GET() {
  try {
    // Ensure OI BOT has a stored Zerodha session
    const token = await getOIBotAccessToken();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          signal: "NO_TRADE",
          reason: "Zerodha session unavailable. Login again.",
        },
        { status: 401 }
      );
    }

    const [futuresHistory, optionsHistory] = await Promise.all([
      readHistory(FUTURES_HISTORY_KEY),
      readHistory(OPTIONS_HISTORY_KEY),
    ]);

    const analysis = analyzeOIBot({
      futuresHistory,
      optionsHistory,
    });

    return NextResponse.json({
      ...analysis,
      history: {
        futuresSnapshots: futuresHistory.length,
        optionsSnapshots: optionsHistory.length,
      },
    });
  } catch (error) {
    console.error("OI BOT ANALYSIS API ERROR:", error.message);

    return NextResponse.json(
      {
        success: false,
        signal: "NO_TRADE",
        reason: "Analysis API failed",
      },
      { status: 500 }
    );
  }
}
