
import { NextResponse } from "next/server";
import { getAccessToken } from "@/services/zerodha/session";
import { getVixStreamStatus } from "@/services/zerodha/vixStream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Zerodha login required" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      ...getVixStreamStatus(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
