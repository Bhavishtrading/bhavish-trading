// =====================================================
// SILVER LIVE MARKET DATA
// Zerodha MCX
// 5 MINUTE CANDLES
// LIVE PRICE FROM ZERODHA QUOTE
// =====================================================

import { getKiteClient } from "@/services/zerodha/client";
import { getAccessToken } from "@/services/zerodha/session";
import { getCurrentSilverFuture } from "@/services/zerodha/instruments";

export async function getSilver5MCandles() {
  try {
    // =====================================================
    // GET ZERODHA ACCESS TOKEN
    // =====================================================

    const accessToken =
      await getAccessToken();

    if (!accessToken) {
      throw new Error(
        "Zerodha access token not found"
      );
    }

    // =====================================================
    // GET CURRENT SILVER FUTURE
    // =====================================================

    const future =
      await getCurrentSilverFuture();

    // =====================================================
    // KITE CLIENT
    // =====================================================

    const kite =
      getKiteClient();

    kite.setAccessToken(
      accessToken
    );

    // =====================================================
    // DATE RANGE
    // =====================================================

    const now =
      new Date();

    const to =
      now
        .toISOString()
        .slice(0, 10);

    const fromDate =
      new Date(now);

    fromDate.setDate(
      fromDate.getDate() - 7
    );

    const from =
      fromDate
        .toISOString()
        .slice(0, 10);

    // =====================================================
    // GET 5 MINUTE HISTORICAL DATA
    // =====================================================

    const candles =
      await kite.getHistoricalData(
        future.instrument_token,
        "5minute",
        from,
        to,
        false,
        false
      );

    if (
      !Array.isArray(candles) ||
      candles.length === 0
    ) {
      throw new Error(
        "No SILVER 5M candles found"
      );
    }

    // =====================================================
    // FIND LATEST TRADING SESSION
    // =====================================================

    const latestCandle =
      candles[
        candles.length - 1
      ];

    const latestDate =
      new Date(
        latestCandle.date
      );

    const sessionYear =
      latestDate.getFullYear();

    const sessionMonth =
      latestDate.getMonth();

    const sessionDay =
      latestDate.getDate();

    // =====================================================
    // FILTER CURRENT SESSION CANDLES
    // =====================================================

    const sessionCandles =
      candles.filter(
        (candle) => {
          const date =
            new Date(
              candle.date
            );

          return (
            date.getFullYear() ===
              sessionYear &&
            date.getMonth() ===
              sessionMonth &&
            date.getDate() ===
              sessionDay
          );
        }
      );

    if (
      sessionCandles.length === 0
    ) {
      throw new Error(
        "No current SILVER trading session candles found"
      );
    }

    // =====================================================
    // LATEST 5M CANDLE
    // =====================================================

    const currentCandle =
      sessionCandles[
        sessionCandles.length - 1
      ];

    const candlePrice =
      Number(
        currentCandle.close
      );

    // =====================================================
    // GET LIVE SILVER PRICE
    // =====================================================

    const quoteSymbol =
      `MCX:${future.tradingsymbol}`;

    console.log(
      "======================================"
    );

    console.log(
      "SILVER LIVE QUOTE"
    );

    console.log(
      "SYMBOL:",
      quoteSymbol
    );

    console.log(
      "======================================"
    );

    const quoteData =
      await kite.getQuote([
        quoteSymbol
      ]);

    console.log(
      "QUOTE DATA:",
      quoteData
    );

    const liveQuote =
      quoteData[
        quoteSymbol
      ];

    console.log(
      "LIVE QUOTE:",
      liveQuote
    );

    const livePrice =
      Number(
        liveQuote?.last_price
      );

    console.log(
      "LIVE SILVER PRICE:",
      livePrice
    );

    // =====================================================
    // VALIDATE LIVE PRICE
    // =====================================================

    if (
      !Number.isFinite(
        livePrice
      )
    ) {
      throw new Error(
        "Live SILVER price unavailable from Zerodha"
      );
    }

    // =====================================================
    // FINAL PRICE
    // =====================================================

    const price =
      livePrice;

    // =====================================================
    // DEBUG
    // =====================================================

    console.log(
      "======================================"
    );

    console.log(
      "SILVER 5M LIVE DATA"
    );

    console.log(
      "======================================"
    );

    console.log({
      contract:
        future.tradingsymbol,

      instrumentToken:
        future.instrument_token,

      expiry:
        future.expiry,

      candles:
        sessionCandles.length,

      livePrice:
        price,

      candlePrice:
        candlePrice,

      difference:
        Number(
          (
            price -
            candlePrice
          ).toFixed(2)
        ),

      latestCandle:
        currentCandle.date,
    });

    console.log(
      "======================================"
    );

    // =====================================================
    // RETURN DATA
    // =====================================================

    return {
      success: true,

      contract:
        future.tradingsymbol,

      instrumentToken:
        future.instrument_token,

      expiry:
        future.expiry,

      timeframe:
        "5M",

      live: true,

      // CURRENT LIVE ZERODHA PRICE
      price:

        price,

      // LAST 5M CANDLE CLOSE
      candlePrice:
        candlePrice,

      // LIVE - CANDLE DIFFERENCE
      priceDifference:
        Number(
          (
            price -
            candlePrice
          ).toFixed(2)
        ),

      candles:
        sessionCandles,
    };

  } catch (error) {

    console.error(
      "❌ SILVER LIVE MARKET ERROR"
    );

    console.error(
      error
    );

    throw error;
  }
}