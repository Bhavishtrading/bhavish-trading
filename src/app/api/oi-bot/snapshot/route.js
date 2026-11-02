
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { captureOIBotSnapshot } from "@/services/oi-bot/snapshotEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    // Allow manual capture only from an authenticated browser session
    const cookieStore = await cookies();
    const browserToken = cookieStore.get("zerodha_access_token")?.value;

    if (!browserToken) {
      return NextResponse.json(
        { success: false, error: "Please login to Zerodha first" },
        { status: 401 }
      );
    }

    const result = await captureOIBotSnapshot();

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error("OI BOT SNAPSHOT ROUTE ERROR:", error.message);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

