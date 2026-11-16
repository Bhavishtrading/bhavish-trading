
import { NextResponse } from "next/server";
import { getNiftyFutureVolume } from "@/services/zerodha/niftyFutureVolume";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getNiftyFutureVolume();

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error("NIFTY FUTURES VOLUME API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Unable to fetch NIFTY Futures Volume",
      },
      { status: 500 }
    );
  }
}
