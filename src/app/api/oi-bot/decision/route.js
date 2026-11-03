
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

import { analyzeOIBot } from "@/services/oi-bot/analysisEngine";
import { generateOIBotDecision } from "@/services/oi-bot/decisionEngine";
import { generateEarlySignal } from "@/services/oi-bot/earlySignalEngine";
import { recordOIBotSignal } from "@/services/oi-bot/signalHistoryEngine";
import { validateOIBotDataSync } from "@/services/oi-bot/dataSyncEngine";
import { getOIBotMarketConfirmation } from "@/services/oi-bot/marketConfirmationEngine";
import { getOIBotAccessToken } from "@/services/oi-bot/tokenStore";

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

function parseHistoryItem(item) {
  if (!item) return null;

  try {
    return typeof item === "string"
      ? JSON.parse(item)
      : item;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    // 1. Verify OI BOT token

    const accessToken = await getOIBotAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          signal: "NO_TRADE",
          reason: "OI BOT Zerodha token unavailable. Login again.",
        },
        { status: 401 }
      );
    }

    // 2. Read Futures and Options history

    const [futuresRaw, optionsRaw] = await Promise.all([
      redis.lrange(FUTURES_HISTORY_KEY, -360, -1),
      redis.lrange(OPTIONS_HISTORY_KEY, -360, -1),
    ]);

    const futuresHistory = futuresRaw
      .map(parseHistoryItem)
      .filter(Boolean);

    const optionsHistory = optionsRaw
      .map(parseHistoryItem)
      .filter(Boolean);

    // 3. Run OI analysis

    const analysis = analyzeOIBot({
      futuresHistory,
      optionsHistory,
    });

    // 4. Get market confirmation

    const marketConfirmation =
      await getOIBotMarketConfirmation();

    // 5. Validate data synchronization

    const sync = validateOIBotDataSync({
      futuresSnapshot: futuresHistory.at(-1),
      optionsSnapshot: optionsHistory.at(-1),
      marketConfirmation: marketConfirmation?.success
        ? marketConfirmation
        : null,
    });

    // 6. Generate existing decision

    const decision = generateOIBotDecision({
      analysis,
      marketConfirmation,
      dataSync: sync,
    });

    // 7. Generate Early Signal

    const earlySignal = generateEarlySignal({
      analysis,
      marketConfirmation,
      dataSync: sync,
      decision,
    });

    // 8. Record signal in Redis

    const signalHistory = await recordOIBotSignal({
      earlySignal,
      decision,
      marketConfirmation,
    });

    // 9. Return API response

    return NextResponse.json({
      success: true,

      decision,

      earlySignal,

      signalHistory,

      analysis,

      dataSync: sync,

      marketConfirmation,

      history: {
        futuresSnapshots: futuresHistory.length,
        optionsSnapshots: optionsHistory.length,
      },

      checkedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error(
      "OI BOT DECISION API ERROR:",
      error.message
    );

    return NextResponse.json(
      {
        success: false,
        signal: "NO_TRADE",
        reason: error.message,
      },
      { status: 500 }
    );
  }
}
