import { getKiteClient } from "./client";
import { getAccessToken } from "./session";
import { getCurrentNiftyFuture } from "./instruments";

export async function getNiftyFutureVWAP() {
  try {
    // =====================================================
    // 1. AUTH
    // =====================================================

    const accessToken = await getAccessToken();

    if (!accessToken) {
      throw new Error("Zerodha access token not found");
    }

    const future = await getCurrentNiftyFuture();

    const kite = getKiteClient();

    kite.setAccessToken(accessToken);

    // =====================================================
    // 2. DATE RANGE
    // =====================================================

    const now = new Date();

    const to = now.toISOString().slice(0, 10);

    const fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - 7);

    const from = fromDate.toISOString().slice(0, 10);

    // =====================================================
    // 3. GET 5 MINUTE FUTURES DATA
    // =====================================================

    const candles = await kite.getHistoricalData(
      future.instrument_token,
      "5minute",
      from,
      to,
      false,
      false
    );

    if (!candles || candles.length === 0) {
      throw new Error("No NIFTY Futures historical candles found");
    }

    console.log("======================================");
    console.log("NIFTY FUTURE VWAP DEBUG");
    console.log("======================================");

    console.log("Contract:", future.tradingsymbol);
    console.log("Total Candles:", candles.length);

    // =====================================================
    // 4. FIND LATEST TRADING SESSION
    // =====================================================

    const latestCandleDate = new Date(
      candles[candles.length - 1].date
    );

    const sessionYear = latestCandleDate.getFullYear();
    const sessionMonth = latestCandleDate.getMonth();
    const sessionDay = latestCandleDate.getDate();

    const sessionCandles = candles.filter((candle) => {
      const date = new Date(candle.date);

      return (
        date.getFullYear() === sessionYear &&
        date.getMonth() === sessionMonth &&
        date.getDate() === sessionDay
      );
    });

    if (!sessionCandles.length) {
      throw new Error("No session candles found");
    }

    // =====================================================
    // 5. VWAP CALCULATOR
    // =====================================================

    function calculateVWAP(candleList) {
      let cumulativePV = 0;
      let cumulativeVolume = 0;

      for (const candle of candleList) {
        const high = Number(candle.high);
        const low = Number(candle.low);
        const close = Number(candle.close);
        const volume = Number(candle.volume) || 0;

        if (
          !Number.isFinite(high) ||
          !Number.isFinite(low) ||
          !Number.isFinite(close)
        ) {
          continue;
        }

        const typicalPrice =
          (high + low + close) / 3;

        cumulativePV += typicalPrice * volume;
        cumulativeVolume += volume;
      }

      if (cumulativeVolume <= 0) {
        return null;
      }

      return {
        value: cumulativePV / cumulativeVolume,
        volume: cumulativeVolume,
      };
    }

    // =====================================================
    // 6. FINAL CANDLE
    // =====================================================

    const finalCandle =
      sessionCandles[sessionCandles.length - 1];

    const previousCandles =
      sessionCandles.slice(0, -1);

    // =====================================================
    // 7. VWAP BEFORE FINAL CANDLE
    // =====================================================

    const previousVWAP =
      calculateVWAP(previousCandles);

    // =====================================================
    // 8. VWAP INCLUDING FINAL CANDLE
    // =====================================================

    const finalVWAP =
      calculateVWAP(sessionCandles);

    // =====================================================
    // 9. FINAL CANDLE DATA
    // =====================================================

    const finalHigh = Number(finalCandle.high);
    const finalLow = Number(finalCandle.low);
    const finalClose = Number(finalCandle.close);
    const finalVolume = Number(finalCandle.volume) || 0;

    const finalTypicalPrice =
      (finalHigh + finalLow + finalClose) / 3;

    // =====================================================
    // 10. DEBUG OUTPUT
    // =====================================================

    console.log("");
    console.log("---------- SESSION ----------");

    console.log(
      "Session:",
      latestCandleDate.toISOString().slice(0, 10)
    );

    console.log(
      "Session Candles:",
      sessionCandles.length
    );

    console.log("");
    console.log("---------- FINAL CANDLE ----------");

    console.log(
      "Date:",
      finalCandle.date
    );

    console.log(
      "Open:",
      finalCandle.open
    );

    console.log(
      "High:",
      finalCandle.high
    );

    console.log(
      "Low:",
      finalCandle.low
    );

    console.log(
      "Close:",
      finalCandle.close
    );

    console.log(
      "Volume:",
      finalVolume
    );

    console.log(
      "Typical Price:",
      finalTypicalPrice
    );

    console.log("");
    console.log("---------- VWAP ----------");

    console.log(
      "VWAP BEFORE FINAL CANDLE:",
      previousVWAP
        ? previousVWAP.value.toFixed(2)
        : "N/A"
    );

    console.log(
      "VWAP INCLUDING FINAL CANDLE:",
      finalVWAP
        ? finalVWAP.value.toFixed(2)
        : "N/A"
    );

    console.log(
      "FINAL CLOSE:",
      finalClose.toFixed(2)
    );

    console.log(
      "FINAL CANDLE VOLUME:",
      finalVolume
    );

    if (previousVWAP) {
      console.log(
        "VWAP CHANGE:",
        (
          finalVWAP.value -
          previousVWAP.value
        ).toFixed(2)
      );
    }

    console.log("======================================");

    // =====================================================
    // 11. TREND
    // =====================================================

    let trend = "Neutral";

    if (finalClose > finalVWAP.value) {
      trend = "Above VWAP";
    } else if (finalClose < finalVWAP.value) {
      trend = "Below VWAP";
    }

    // =====================================================
    // 12. RETURN
    // =====================================================

    return {
      value: Number(finalVWAP.value.toFixed(2)),

      price: Number(finalClose.toFixed(2)),

      trend,

      contract: future.tradingsymbol,

      instrumentToken: future.instrument_token,

      expiry: future.expiry,

      timeframe: "5minute",

      session:
        latestCandleDate
          .toISOString()
          .slice(0, 10),

      candles: sessionCandles.length,

      volume: finalVWAP.volume,

      // DEBUG DATA
      debug: {
        previousVWAP: previousVWAP
          ? Number(previousVWAP.value.toFixed(2))
          : null,

        finalVWAP: Number(
          finalVWAP.value.toFixed(2)
        ),

        finalCandleClose: Number(
          finalClose.toFixed(2)
        ),

        finalCandleVolume: finalVolume,

        finalCandleTypicalPrice: Number(
          finalTypicalPrice.toFixed(2)
        ),

        vwapChange: previousVWAP
          ? Number(
              (
                finalVWAP.value -
                previousVWAP.value
              ).toFixed(2)
            )
          : null,
      },
    };

  } catch (error) {
    console.error(
      "NIFTY FUTURE VWAP ERROR:"
    );

    console.error(error);

    throw error;
  }
}