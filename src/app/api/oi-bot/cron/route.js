
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

import { captureOIBotSnapshot } from "@/services/oi-bot/snapshotEngine";
import { captureOptionsChainSnapshot } from "@/services/oi-bot/optionsChainEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) return false;

  const authorization = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;

  const actualBuffer = Buffer.from(authorization);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function GET(request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Capture Futures and Options snapshots independently
    const [futuresResult, optionsResult] = await Promise.all([
      captureOIBotSnapshot(),
      captureOptionsChainSnapshot(),
    ]);

    const success =
      futuresResult.success && optionsResult.success;

    console.log("OI BOT CRON COLLECTION STATUS", {
      futures: futuresResult.success,
      options: optionsResult.success,
    });

    return NextResponse.json(
      {
        success,
        futures: futuresResult,
        options: optionsResult,
      },
      { status: success ? 200 : 500 }
    );
  } catch (error) {
    console.error("OI BOT CRON ERROR:", error.message);

    return NextResponse.json(
      { success: false, error: "Snapshot capture failed" },
      { status: 500 }
    );
  }
}
