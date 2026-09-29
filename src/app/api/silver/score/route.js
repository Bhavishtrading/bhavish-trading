import { NextResponse } from "next/server";

import { getSilverMarketData } from "@/services/silver/marketEngine";

import { calculateSilverBhavishScore } from "@/services/silver/bhavishScoreEngine";

import { getSilverMiniPCR } from "@/services/silver/pcr";

export async function GET() {
  try {
    // ==========================================
    // GET SILVERM MARKET + TECHNICAL DATA
    // ==========================================

    const marketData =
      await getSilverMarketData();

    // ==========================================
    // GET LIVE SILVERM PCR
    // ==========================================

    const pcrData =
      await getSilverMiniPCR();

    const pcr =
      pcrData.pcr;

    // ==========================================
    // CALCULATE BHAVISH SCORE
    // ==========================================

    const bhavishScore =
      calculateSilverBhavishScore(
        marketData.technical,
        pcr
      );

    // ==========================================
    // RESPONSE
    // ==========================================

    return NextResponse.json({
      success: true,

      contract:
        marketData.contract,

      instrumentToken:
        marketData.instrumentToken,

      expiry:
        marketData.expiry,

      price:
        marketData.price,

      timeframe:
        "5M",

      live:
        true,

      // ========================================
      // PCR DATA
      // ========================================

      pcr: {
        expiry:
          pcrData.expiry,

        ceOI:
          pcrData.ceOI,

        peOI:
          pcrData.peOI,

        value:
          pcrData.pcr,
      },

      // ========================================
      // TECHNICAL DATA
      // ========================================

      technical:
        marketData.technical,

      // ========================================
      // BHAVISH SCORE
      // ========================================

      bhavishScore,
    });

  } catch (error) {

    console.error(
      "❌ SILVER BHAVISH SCORE API ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Failed to calculate Silver Bhavish Score",
      },
      {
        status: 500,
      }
    );
  }
}