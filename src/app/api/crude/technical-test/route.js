import { NextResponse } from "next/server";
import { getCrudeHistoricalData } from "@/services/zerodha/market";
import {
  calculateCrudeTechnicalIndicators,
  calculateRSI,
  calculateMACD,
  calculateADX,
  calculateATR,
} from "@/services/crude/technicalEngine";

export async function GET() {
  try {
    const result = await getCrudeHistoricalData("5minute", 5);

    const candles = result.candles;

    const base = calculateCrudeTechnicalIndicators(candles);

    const closes = candles.map((candle) =>
      Number(candle.close)
    );

    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes, 12, 26, 9);
    const adx = calculateADX(candles, 14);
    const atr = calculateATR(candles, 14);

    const lastIndex = candles.length - 1;

    return NextResponse.json({
      success: true,

      data: {
        tradingsymbol: result.tradingsymbol,
        candleCount: candles.length,

        latestCandle: candles[lastIndex],

        indicators: {
          ema9: base.ema9,
          ema20: base.ema20,
          ema50: base.ema50,
          ema200: base.ema200,
          vwap: base.vwap,

          rsi14: rsi[lastIndex],

          macd: {
            macd: macd.macdLine[lastIndex],
            signal: macd.signalLine[lastIndex],
            histogram: macd.histogram[lastIndex],
          },

          adx14: adx[lastIndex],

          atr14: atr[lastIndex],
        },
      },
    });
  } catch (error) {
    console.error(
      "CRUDE TECHNICAL TEST ERROR:",
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