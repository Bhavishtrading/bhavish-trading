
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getNiftyFutureOI } from "@/services/zerodha/niftyFutureOI";

import {
  saveNiftyFutureOISnapshot,
  getNiftyFutureOIHistoryStatus,
} from "@/services/zerodha/niftyFutureOIHistory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ============================================
// POST: CAPTURE AND SAVE FUTURES OI SNAPSHOT
// ============================================

export async function POST() {
  try {
    // 1. CHECK ZERODHA SESSION COOKIE
    const cookieStore = await cookies();

    const accessToken = cookieStore.get(
      "zerodha_access_token"
    )?.value;

    console.log(
      "=================================="
    );
    console.log(
      "NIFTY FUTURES SNAPSHOT REQUEST"
    );
    console.log(
      "Zerodha Cookie Available:",
      Boolean(accessToken)
    );
    console.log(
      "=================================="
    );

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          stage: "AUTHENTICATION",
          error: "Zerodha access token not found in request cookie",
        },
        { status: 401 }
      );
    }

    // 2. FETCH LIVE FUTURES DATA
    console.log("Fetching NIFTY Futures OI...");

    const liveData = await getNiftyFutureOI();

    if (!liveData?.success) {
      throw new Error(
        "Unable to fetch valid NIFTY Futures data"
      );
    }

    console.log("Futures Data Received:", {
      symbol: liveData.symbol,
      ltp: liveData.ltp,
      oi: liveData.oi,
    });

    // 3. SAVE SNAPSHOT TO REDIS
    console.log("Saving Futures OI Snapshot...");

    const saved = await saveNiftyFutureOISnapshot(
      liveData
    );

    if (!saved.success) {
      throw new Error(
        saved.error || "Redis snapshot save failed"
      );
    }

    // 4. GET UPDATED HISTORY STATUS
    const history =
      await getNiftyFutureOIHistoryStatus();

    console.log("Snapshot Saved Successfully");
    console.log(
      "Total Snapshots:",
      history.totalSnapshots
    );

    // 5. SUCCESS RESPONSE
    return NextResponse.json({
      success: true,
      message: "NIFTY Futures OI snapshot saved successfully",
      snapshot: saved.snapshot,
      history,
    });

  } catch (error) {
    console.error(
      "NIFTY FUTURES SNAPSHOT API ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        stage: "SNAPSHOT_CAPTURE",
        error:
          error?.message ||
          "NIFTY Futures snapshot capture failed",
      },
      { status: 500 }
    );
  }
}

// ============================================
// GET: CHECK SNAPSHOT HISTORY
// ============================================

export async function GET() {
  try {
    const history =
      await getNiftyFutureOIHistoryStatus();

    return NextResponse.json(history);

  } catch (error) {
    console.error(
      "NIFTY FUTURES HISTORY ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to fetch snapshot history",
      },
      { status: 500 }
    );
  }
}
