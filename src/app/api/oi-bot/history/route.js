
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const HISTORY_KEY = "bhavish:oi-bot:nifty-futures:history";

export async function GET() {
  try {
    const history = await redis.lrange(HISTORY_KEY, 0, -1);

    const snapshots = history.map((item) =>
      typeof item === "string" ? JSON.parse(item) : item
    );

    return NextResponse.json({
      success: true,
      totalSnapshots: snapshots.length,
      snapshots,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
