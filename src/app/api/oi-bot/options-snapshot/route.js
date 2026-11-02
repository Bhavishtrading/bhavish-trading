
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { captureOptionsChainSnapshot } from "@/services/oi-bot/optionsChainEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const browserToken = cookieStore.get("zerodha_access_token")?.value;

    if (!browserToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Please login to Zerodha first",
        },
        { status: 401 }
      );
    }

    const result = await captureOptionsChainSnapshot();

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error("OI BOT OPTIONS API ERROR:", error.message);

    return NextResponse.json(
      {
        success: false,
        error: "Options snapshot capture failed",
      },
      { status: 500 }
    );
  }
}
