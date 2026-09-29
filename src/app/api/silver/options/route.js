import { NextResponse } from "next/server";

import {
  getCurrentSilverMiniOptions,
} from "@/services/silver/options";

export async function GET() {
  try {
    const data =
      await getCurrentSilverMiniOptions();

    console.log(
      "========== SILVER OPTIONS ROUTE =========="
    );

    console.log("DATA:", {
      expiry: data?.expiry,
      total: data?.total,
      ceCount: data?.ce?.length,
      peCount: data?.pe?.length,
    });

    console.log(
      "=========================================="
    );

    return NextResponse.json({
      success: true,

      expiry: data?.expiry ?? null,

      total: data?.total ?? 0,

      ceCount:
        Array.isArray(data?.ce)
          ? data.ce.length
          : 0,

      peCount:
        Array.isArray(data?.pe)
          ? data.pe.length
          : 0,
    });

  } catch (error) {

    console.error(
      "❌ SILVER OPTIONS API ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}