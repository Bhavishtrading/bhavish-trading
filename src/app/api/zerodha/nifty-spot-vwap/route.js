import { NextResponse } from "next/server";
import { getKiteClient } from "@/services/zerodha/client";
import { getAccessToken } from "@/services/zerodha/session";

export async function GET() {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Zerodha access token not found",
        },
        { status: 401 }
      );
    }

    const kite = getKiteClient();
    kite.setAccessToken(accessToken);

    // NIFTY 50 Spot
    const instrumentToken = 256265;

    const now = new Date();

    const to = now.toISOString().slice(0, 10);

    const fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - 2);

    const from = fromDate.toISOString().slice(0, 10);

    const candles = await kite.getHistoricalData(
      instrumentToken,
      "5minute",
      from,
      to,
      false,
      false
    );

    if (!candles || candles.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No NIFTY Spot candles found",
      });
    }

    const latest = candles[candles.length - 1];

    const totalVolume = candles.reduce(
      (sum, candle) => sum + (Number(candle.volume) || 0),
      0
    );

    return NextResponse.json({
      success: true,

      instrument: "NIFTY 50",
      instrumentToken,

      candleCount: candles.length,

      latestCandle: latest,

      totalVolume,

      volumeCheck: totalVolume > 0
        ? "VOLUME AVAILABLE"
        : "VOLUME ZERO",

      firstFiveCandles: candles.slice(0, 5),

      lastFiveCandles: candles.slice(-5),
    });

  } catch (error) {
    console.error("NIFTY SPOT TEST ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}