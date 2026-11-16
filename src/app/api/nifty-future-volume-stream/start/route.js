
import { NextResponse } from "next/server";

import {
  startNiftyFutureVolumeStream,
} from "@/services/zerodha/niftyFutureVolumeStream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const status = await startNiftyFutureVolumeStream();

    return NextResponse.json(status);
  } catch (error) {
    console.error("NIFTY FUTURES STREAM START ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Unable to start NIFTY Futures stream",
      },
      { status: 500 }
    );
  }
}
