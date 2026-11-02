
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const HISTORY_KEY = "bhavish:oi-bot:nifty-options:history";

export async function GET() {
  try {
    const rawSnapshots = await redis.lrange(HISTORY_KEY, 0, -1);

    const snapshots = rawSnapshots.map((item) =>
      typeof item === "string" ? JSON.parse(item) : item
    );

    return NextResponse.json({
      success: true,
      totalSnapshots: snapshots.length,
      snapshots,
    });
  } catch (error) {
    console.error("OI BOT OPTIONS HISTORY ERROR:", error.message);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to fetch options history",
      },
      { status: 500 }
    );
  }
}
