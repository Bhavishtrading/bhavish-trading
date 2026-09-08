import { NextResponse } from "next/server";

import { getCrudeHistoricalData } from "@/services/zerodha/market";
import { getLiveCrudeQuote } from "@/services/zerodha/market";

import { calculateCrudeTechnicalIndicators } from "@/services/crude/technicalEngine";
import { calculateCrudeIntelligence } from "@/services/crude/intelligenceEngine";

export async function GET() {
  try {
    const [historical, live] = await Promise.all([
      getCrudeHistoricalData("5minute", 5),
      getLiveCrudeQuote(),
    ]);

    const indicators =
      calculateCrudeTechnicalIndicators(historical.candles);

    const intelligence =
      calculateCrudeIntelligence(indicators, live);

    return NextResponse.json({
      success: true,

      data: {
        tradingsymbol: live.tradingsymbol,
        ltp: live.ltp,

        indicators: {
          ema9: indicators.ema9,
          ema20: indicators.ema20,
          ema50: indicators.ema50,
          ema200: indicators.ema200,

          vwap: indicators.vwap,

          rsi14: indicators.rsi14,

          macd: indicators.macd,

          adx14: indicators.adx14,

          atr14: indicators.atr14,
        },

        intelligence,
      },
    });
  } catch (error) {
    console.error(
      "CRUDE INTELLIGENCE TEST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}