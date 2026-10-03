import { NextResponse } from "next/server";

import {
  getNifty50SectorData,
} from "@/services/zerodha/nifty50SectorEngine";

export async function GET() {
  try {
    const data = await getNifty50SectorData();

    return NextResponse.json(data);
  } catch (error) {
    console.error(
      "NIFTY 50 SECTOR API ERROR ================="
    );

    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: error.name || "Error",
        message:
          error.message ||
          "Unable to calculate NIFTY 50 sector data",
      },
      {
        status: 500,
      }
    );
  }
}