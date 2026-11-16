
// =====================================================
// NIFTY FUTURES VOLUME ENGINE
// Timeframe: 5 Minutes
//
// Volume Ratio =
// Current Completed Candle Volume
// / Previous 20 Completed Candles Average Volume
// =====================================================

export function calculateFuturesVolume(candles = []) {
  const emptyResult = {
    volumeRatio: null,
    candleDirection: "neutral",
    currentVolume: null,
    averageVolume: null,
    status: "Insufficient data",
    candleTime: null,
  };

  try {
    if (!Array.isArray(candles) || candles.length < 22) {
      return emptyResult;
    }

    const now = Date.now();
    const candleDuration = 5 * 60 * 1000;

    // Normalize and validate candles
    const validCandles = candles
      .map((candle) => {
        const timestamp = new Date(candle.date).getTime();

        return {
          timestamp,
          open: Number(candle.open),
          high: Number(candle.high),
          low: Number(candle.low),
          close: Number(candle.close),
          volume: Number(candle.volume),
        };
      })
      .filter((candle) => {
        return (
          Number.isFinite(candle.timestamp) &&
          Number.isFinite(candle.open) &&
          Number.isFinite(candle.high) &&
          Number.isFinite(candle.low) &&
          Number.isFinite(candle.close) &&
          Number.isFinite(candle.volume) &&
          candle.volume > 0 &&
          candle.timestamp + candleDuration <= now
        );
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    if (validCandles.length < 21) {
      return {
        ...emptyResult,
        status: "Not enough completed volume candles",
      };
    }

    // Latest completed candle
    const currentCandle =
      validCandles[validCandles.length - 1];

    // Previous 20 completed candles
    const previousCandles =
      validCandles.slice(-21, -1);

    const totalPreviousVolume =
      previousCandles.reduce(
        (sum, candle) => sum + candle.volume,
        0
      );

    const averageVolume =
      totalPreviousVolume / previousCandles.length;

    const currentVolume = currentCandle.volume;

    if (
      !Number.isFinite(averageVolume) ||
      averageVolume <= 0
    ) {
      return {
        ...emptyResult,
        status: "Invalid average volume",
      };
    }

    const volumeRatio = Number(
      (currentVolume / averageVolume).toFixed(2)
    );

    let candleDirection = "neutral";

    if (currentCandle.close > currentCandle.open) {
      candleDirection = "bullish";
    } else if (currentCandle.close < currentCandle.open) {
      candleDirection = "bearish";
    }

    const result = {
      volumeRatio,
      candleDirection,
      currentVolume,
      averageVolume: Math.round(averageVolume),
      status: "OK",
      candleTime: new Date(
        currentCandle.timestamp
      ).toISOString(),
    };

    console.log("==================================");
    console.log("NIFTY FUTURES VOLUME ANALYSIS");
    console.log("Current Volume:", currentVolume);
    console.log("Average Volume:", result.averageVolume);
    console.log("Volume Ratio:", volumeRatio);
    console.log("Candle Direction:", candleDirection);
    console.log("Candle Time:", result.candleTime);
    console.log("==================================");

    return result;
  } catch (error) {
    console.error("FUTURES VOLUME ENGINE ERROR:", error);

    return {
      ...emptyResult,
      status: error.message || "Volume calculation failed",
    };
  }
}
