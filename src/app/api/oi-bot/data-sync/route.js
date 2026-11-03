import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { validateOIBotDataSync } from "@/services/oi-bot/dataSyncEngine";
import { getOIBotMarketConfirmation } from "@/services/oi-bot/marketConfirmationEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const FUTURES_HISTORY_KEY =
  "bhavish:oi-bot:nifty-futures:history";

const OPTIONS_HISTORY_KEY =
  "bhavish:oi-bot:nifty-options:history";

export async function GET() {
  try {
    const [futuresRaw, optionsRaw, market] = await Promise.all([
      redis.lrange(FUTURES_HISTORY_KEY, -2, -1),
      redis.lrange(OPTIONS_HISTORY_KEY, -2, -1),
      getOIBotMarketConfirmation(),
    ]);

    const parseSnapshot = (value) => {
      if (!value) return null;

      try {
        return typeof value === "string"
          ? JSON.parse(value)
          : value;
      } catch {
        return null;
      }
    };

    const futuresSnapshots = futuresRaw
      .map(parseSnapshot)
      .filter(Boolean);

    const optionsSnapshots = optionsRaw
      .map(parseSnapshot)
      .filter(Boolean);

    const futuresSnapshot =
      futuresSnapshots[futuresSnapshots.length - 1] || null;

    const optionsSnapshot =
      optionsSnapshots[optionsSnapshots.length - 1] || null;

    const sync = validateOIBotDataSync({
      futuresSnapshot,
      optionsSnapshot,
      marketConfirmation: market?.success ? market : null,
    });

    return NextResponse.json({
      success: true,
      status: sync.valid ? "READY" : "WAIT",
      sync,
      marketConfirmation: market,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("OI BOT DATA SYNC ERROR:", error.message);

    return NextResponse.json(
      {
        success: false,
        status: "ERROR",
        error: error.message,
      },
      { status: 500 }
    );
  }
}