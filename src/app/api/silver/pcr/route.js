import { NextResponse } from "next/server";
import { getSilverMiniPCR } from "@/services/silver/pcr";

// =====================================================
// SILVERM PCR API
// =====================================================

export async function GET() {
  try {
    const data =
      await getSilverMiniPCR();

    return NextResponse.json(
      data
    );

  } catch (error) {

    console.error(
      "❌ SILVERM PCR API ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Failed to calculate SilverM PCR",
      },
      {
        status: 500,
      }
    );
  }
}