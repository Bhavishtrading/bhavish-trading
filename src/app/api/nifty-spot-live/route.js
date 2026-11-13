
import { NextResponse } from "next/server";

import {
  startNiftySpotLiveStream,
  getNiftySpotLiveStreamStatus,
  stopNiftySpotLiveStream,
} from "@/services/zerodha/niftySpotLiveStream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================
// GET - STREAM STATUS
// ============================================

export async function GET() {
  try {
    const status = getNiftySpotLiveStreamStatus();

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// ============================================
// POST - START STREAM
// ============================================

export async function POST() {
  try {
    const result = await startNiftySpotLiveStream();

    return NextResponse.json({
      ...result,
      success: true,
    });
  } catch (error) {
    console.error("NIFTY SPOT LIVE API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Unable to start NIFTY Spot stream",
      },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - STOP STREAM
// ============================================

export async function DELETE() {
  try {
    const result = stopNiftySpotLiveStream();

    return NextResponse.json({
      ...result,
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Unable to stop NIFTY Spot stream",
      },
      { status: 500 }
    );
  }
}
