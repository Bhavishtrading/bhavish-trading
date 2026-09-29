// =====================================================
// SILVER MARKET ENGINE
// 5 MINUTE LIVE TECHNICAL DATA
// =====================================================

import { getSilver5MCandles } from "./liveMarket";
import {
  calculateSilverTechnicalIndicators,
} from "./technicalEngine";


// =====================================================
// GET SILVER MARKET DATA
// =====================================================
export async function getSilverMarketData() {
  try {
    // -------------------------------------------------
    // GET LIVE 5M CANDLES
    // -------------------------------------------------
    const marketData =
      await getSilver5MCandles();

    if (
      !marketData ||
      !Array.isArray(marketData.candles) ||
      marketData.candles.length === 0
    ) {
      throw new Error(
        "Silver 5M candles unavailable"
      );
    }

    // -------------------------------------------------
    // CALCULATE TECHNICAL INDICATORS
    // -------------------------------------------------
    const technical =
      calculateSilverTechnicalIndicators(
        marketData.candles
      );

    // -------------------------------------------------
    // FINAL RESULT
    // -------------------------------------------------
    return {
      success: true,

      contract:
        marketData.contract,

      instrumentToken:
        marketData.instrumentToken,

      expiry:
        marketData.expiry,

      timeframe: "5M",

      live: true,

      price:
        marketData.price,

      technical,

      candles:
        marketData.candles,
    };

  } catch (error) {

    console.error(
      "❌ SILVER MARKET ENGINE ERROR"
    );

    console.error(error);

    throw error;
  }
}