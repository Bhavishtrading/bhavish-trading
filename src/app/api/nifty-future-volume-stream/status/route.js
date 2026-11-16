
import { NextResponse } from "next/server";

import {
  getNiftyFutureVolumeStreamStatus,
} from "@/services/zerodha/niftyFutureVolumeStream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = getNiftyFutureVolumeStreamStatus();

    return NextResponse.json(status);
  } catch (error) {
    console.error("NIFTY FUTURES STREAM STATUS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Unable to get stream status",
      },
      { status: 500 }
    );
  }
}
