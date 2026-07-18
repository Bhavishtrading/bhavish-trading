import YahooFinance from "yahoo-finance2";
import { NextResponse } from "next/server";

const yahooFinance = new YahooFinance();

export async function GET() {
  try {
    const result = await yahooFinance.chart("^NSEI", {
      period1: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      interval: "5m",
    });

    return NextResponse.json({
      success: true,
      totalCandles: result.quotes?.length || 0,
      lastCandle: result.quotes?.at(-1) || null,
      quotes: result.quotes || [],
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({
      success: false,
      message: error.message,
    });
  }
}