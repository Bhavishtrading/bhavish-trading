import { NextResponse } from "next/server";

import {
  getNiftyFutureTechnicalIndicators,
} from "@/services/nifty/niftyFutureTechnicalEngine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data =
      await getNiftyFutureTechnicalIndicators("5minute", 5);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "NIFTY FUTURES TECHNICAL API ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}