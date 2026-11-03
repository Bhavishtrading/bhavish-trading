
import { NextResponse } from "next/server";
import { getAccessToken } from "@/services/zerodha/session";
import { startVixStream } from "@/services/zerodha/vixStream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Zerodha login required" },
        { status: 401 }
      );
    }

    const stream = startVixStream(accessToken);

    return NextResponse.json({
      success: true,
      message: "VIX stream start requested",
      stream,
    });
  } catch (error) {
    console.error("VIX START ERROR:", error);

    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
