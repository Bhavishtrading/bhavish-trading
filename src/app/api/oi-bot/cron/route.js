
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
    console.log("CRON STEP 1: Starting Futures snapshot");

const futuresResult = await captureOIBotSnapshot();

console.log("CRON STEP 2: Futures completed", {
  success: futuresResult.success,
  error: futuresResult.error || null,
});

console.log("CRON STEP 3: Starting Options snapshot");

const optionsResult = await captureOptionsChainSnapshot();

console.log("CRON STEP 4: Options completed", {
  success: optionsResult.success,
  error: optionsResult.error || null,
});

    const success =
      futuresResult.success && optionsResult.success;

 console.log("OI BOT CRON COLLECTION STATUS", {
  futures: futuresResult,
  options: optionsResult,
});
console.log("FUTURES ERROR:", futuresResult.error);
console.log("OPTIONS ERROR:", optionsResult.error);

   return NextResponse.json(
  {
    success,
    futures: futuresResult,
    options: optionsResult,
    debug: {
      futuresError: futuresResult.error || null,
      optionsError: optionsResult.error || null,
    },
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
