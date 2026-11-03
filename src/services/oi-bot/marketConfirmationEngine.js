
import { getKiteClient } from "@/services/zerodha/client";
import { getOIBotAccessToken } from "./tokenStore";

const TIMEFRAME = "5minute";
const LOOKBACK_DAYS = 7;
const CANDLE_DURATION_MS = 5 * 60 * 1000;

// Swing pivot settings
const PIVOT_LEFT = 2;
const PIVOT_RIGHT = 2;

// Volume settings
const VOLUME_LOOKBACK = 5;
const VOLUME_CONFIRMATION_RATIO = 1.2;

// Breakout settings
const BREAKOUT_LOOKBACK = 20;
const WICK_BODY_TRAP_RATIO = 1;

// ======================================================
// IST DATE
// ======================================================

function getISTDate(value) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

// ======================================================
// EMA CALCULATION
// ======================================================

function calculateEMA(values, period) {
  if (values.length < period) return null;

  const multiplier = 2 / (period + 1);

  let ema =
    values.slice(0, period).reduce((sum, value) => sum + value, 0) /
    period;

  for (let i = period; i < values.length; i++) {
    ema = values[i] * multiplier + ema * (1 - multiplier);
  }

  return ema;
}

// ======================================================
// VWAP - CURRENT SESSION ONLY
// ======================================================

function calculateVWAP(candles) {
  let cumulativePV = 0;
  let cumulativeVolume = 0;

  for (const candle of candles) {
    const typicalPrice =
      (candle.high + candle.low + candle.close) / 3;

    if (candle.volume <= 0) continue;

    cumulativePV += typicalPrice * candle.volume;
    cumulativeVolume += candle.volume;
  }

  if (cumulativeVolume <= 0) return null;

  return cumulativePV / cumulativeVolume;
}

// ======================================================
// PIVOT HIGH / LOW DETECTION
// ======================================================

function getConfirmedPivots(candles) {
  const pivotHighs = [];
  const pivotLows = [];

  if (
    candles.length <
    PIVOT_LEFT + PIVOT_RIGHT + 1
  ) {
    return {
      pivotHighs,
      pivotLows,
    };
  }

  // A pivot is confirmed only after PIVOT_RIGHT candles.
  for (
    let i = PIVOT_LEFT;
    i < candles.length - PIVOT_RIGHT;
    i++
  ) {
    const current = candles[i];

    let isPivotHigh = true;
    let isPivotLow = true;

    for (let j = i - PIVOT_LEFT; j <= i + PIVOT_RIGHT; j++) {
      if (j === i) continue;

      if (candles[j].high >= current.high) {
        isPivotHigh = false;
      }

      if (candles[j].low <= current.low) {
        isPivotLow = false;
      }

      if (!isPivotHigh && !isPivotLow) break;
    }

    if (isPivotHigh) {
      pivotHighs.push({
        price: current.high,
        candleTime: current.date,
        index: i,
      });
    }

    if (isPivotLow) {
      pivotLows.push({
        price: current.low,
        candleTime: current.date,
        index: i,
      });
    }
  }

  return {
    pivotHighs,
    pivotLows,
  };
}

// ======================================================
// MARKET STRUCTURE - CONFIRMED HH / HL / LH / LL
// ======================================================

function getMarketStructure(candles) {
  const { pivotHighs, pivotLows } =
    getConfirmedPivots(candles);

  const previousHigh = pivotHighs.at(-2);
  const latestHigh = pivotHighs.at(-1);

  const previousLow = pivotLows.at(-2);
  const latestLow = pivotLows.at(-1);

  const enoughHighs = Boolean(previousHigh && latestHigh);
  const enoughLows = Boolean(previousLow && latestLow);

  if (!enoughHighs || !enoughLows) {
    return {
      structure: "INSUFFICIENT_DATA",
      higherHigh: false,
      higherLow: false,
      lowerHigh: false,
      lowerLow: false,
      pivotHighCount: pivotHighs.length,
      pivotLowCount: pivotLows.length,
      previousHigh: previousHigh?.price ?? null,
      latestHigh: latestHigh?.price ?? null,
      previousLow: previousLow?.price ?? null,
      latestLow: latestLow?.price ?? null,
    };
  }

  const higherHigh =
    latestHigh.price > previousHigh.price;

  const lowerHigh =
    latestHigh.price < previousHigh.price;

  const higherLow =
    latestLow.price > previousLow.price;

  const lowerLow =
    latestLow.price < previousLow.price;

  let structure = "SIDEWAYS";

  if (higherHigh && higherLow) {
    structure = "BULLISH_STRUCTURE";
  } else if (lowerHigh && lowerLow) {
    structure = "BEARISH_STRUCTURE";
  } else if (higherHigh && lowerLow) {
    structure = "EXPANDING_RANGE";
  } else if (lowerHigh && higherLow) {
    structure = "CONTRACTING_RANGE";
  }

  return {
    structure,

    higherHigh,
    higherLow,
    lowerHigh,
    lowerLow,

    previousHigh: previousHigh.price,
    latestHigh: latestHigh.price,

    previousLow: previousLow.price,
    latestLow: latestLow.price,

    previousHighTime: previousHigh.candleTime,
    latestHighTime: latestHigh.candleTime,

    previousLowTime: previousLow.candleTime,
    latestLowTime: latestLow.candleTime,

    pivotHighCount: pivotHighs.length,
    pivotLowCount: pivotLows.length,
  };
}

// ======================================================
// VOLUME ANALYSIS
// ======================================================

function getVolumeAnalysis(candles) {
  if (candles.length < VOLUME_LOOKBACK + 1) {
    return {
      valid: false,
      volumeRatio: null,
      confirmation: "INSUFFICIENT_DATA",
    };
  }

  const current = candles[candles.length - 1];

  const previousVolumes = candles
    .slice(-(VOLUME_LOOKBACK + 1), -1)
    .map((candle) => candle.volume)
    .filter((value) => Number.isFinite(value) && value > 0);

  if (previousVolumes.length < VOLUME_LOOKBACK) {
    return {
      valid: false,
      volumeRatio: null,
      confirmation: "INSUFFICIENT_DATA",
    };
  }

  const averageVolume =
    previousVolumes.reduce((sum, value) => sum + value, 0) /
    previousVolumes.length;

  if (averageVolume <= 0 || current.volume <= 0) {
    return {
      valid: false,
      currentVolume: current.volume,
      averageVolume: Number(averageVolume.toFixed(2)),
      volumeRatio: null,
      confirmation: "LOW_VOLUME",
    };
  }

  const volumeRatio = current.volume / averageVolume;

  return {
    valid: true,
    currentVolume: current.volume,
    averageVolume: Number(averageVolume.toFixed(2)),
    volumeRatio: Number(volumeRatio.toFixed(2)),
    confirmation:
      volumeRatio >= VOLUME_CONFIRMATION_RATIO
        ? "VOLUME_CONFIRMED"
        : "LOW_VOLUME",
  };
}

// ======================================================
// BREAKOUT AND TRAP ANALYSIS
// ======================================================

function getBreakoutAnalysis(candles, structure, volume) {
  const last = candles.at(-1);
  const previous = candles.at(-2);

  if (!last || !previous) {
    return {
      breakout: "NONE",
      trapWarning: false,
      reason: "Insufficient breakout data",
    };
  }

  // Use the latest confirmed swing levels.
  const swingHigh = structure.latestHigh;
  const swingLow = structure.latestLow;

  if (swingHigh == null || swingLow == null) {
    return {
      breakout: "NONE",
      trapWarning: false,
      reason: "Confirmed swing levels unavailable",
    };
  }

  const bullishBreakout =
    last.close > swingHigh &&
    previous.close <= swingHigh;

  const bearishBreakout =
    last.close < swingLow &&
    previous.close >= swingLow;

  const upperWick =
    last.high - Math.max(last.open, last.close);

  const lowerWick =
    Math.min(last.open, last.close) - last.low;

  const bodySize = Math.abs(last.close - last.open);

  let breakout = "NONE";
  let trapWarning = false;
  let reason = "No confirmed breakout";

  if (bullishBreakout) {
    breakout = "BULLISH_BREAKOUT";
    reason = "Candle closed above confirmed swing high";

    if (
      bodySize > 0 &&
      upperWick > bodySize * WICK_BODY_TRAP_RATIO
    ) {
      trapWarning = true;
      reason = "Bullish breakout with strong upper wick rejection";
    }
  } else if (bearishBreakout) {
    breakout = "BEARISH_BREAKOUT";
    reason = "Candle closed below confirmed swing low";

    if (
      bodySize > 0 &&
      lowerWick > bodySize * WICK_BODY_TRAP_RATIO
    ) {
      trapWarning = true;
      reason = "Bearish breakout with strong lower wick rejection";
    }
  }

  if (
    breakout !== "NONE" &&
    volume?.confirmation !== "VOLUME_CONFIRMED"
  ) {
    trapWarning = true;
    reason = "Breakout without volume confirmation";
  }

  return {
    breakout,
    trapWarning,
    reason,

    swingHigh,
    swingLow,

    upperWick: Number(upperWick.toFixed(2)),
    lowerWick: Number(lowerWick.toFixed(2)),
    bodySize: Number(bodySize.toFixed(2)),
  };
}

// ======================================================
// MAIN MARKET CONFIRMATION ENGINE
// ======================================================

export async function getOIBotMarketConfirmation() {
  try {
    // 1. OI BOT TOKEN

    const accessToken = await getOIBotAccessToken();

    if (!accessToken) {
      throw new Error(
        "OI BOT Zerodha token unavailable. Login again."
      );
    }

    const kite = getKiteClient();
    kite.setAccessToken(accessToken);

    // 2. FIND ACTIVE NIFTY FUTURES

    const instruments = await kite.getInstruments(["NFO"]);

    const now = new Date();
    const today = getISTDate(now);

    const futures = instruments
      .filter((item) => {
        if (
          item.name !== "NIFTY" ||
          item.segment !== "NFO-FUT" ||
          item.instrument_type !== "FUT" ||
          !item.expiry
        ) {
          return false;
        }

        return getISTDate(item.expiry) >= today;
      })
      .sort(
        (a, b) =>
          new Date(a.expiry) - new Date(b.expiry)
      );

    const future = futures[0];

    if (!future) {
      throw new Error(
        "Active NIFTY Futures contract not found"
      );
    }

    // 3. FETCH HISTORICAL CANDLES

    const fromDate = new Date(
      now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000
    );

    const from = getISTDate(fromDate);
    const to = getISTDate(now);

    const rawCandles = await kite.getHistoricalData(
      future.instrument_token,
      TIMEFRAME,
      from,
      to,
      false,
      false
    );

    if (!Array.isArray(rawCandles) || rawCandles.length === 0) {
      throw new Error(
        "NIFTY Futures historical candles unavailable"
      );
    }

    // 4. NORMALIZE HISTORICAL CANDLES

    const allCandles = rawCandles
      .map((candle) => ({
        date: candle.date,
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
        volume: Number(candle.volume),
      }))
      .filter((candle) => {
        return (
          candle.date &&
          [
            candle.open,
            candle.high,
            candle.low,
            candle.close,
            candle.volume,
          ].every(Number.isFinite) &&
          candle.high >= candle.low &&
          candle.high >= Math.max(candle.open, candle.close) &&
          candle.low <= Math.min(candle.open, candle.close) &&
          candle.volume >= 0
        );
      })
      .sort(
        (a, b) =>
          new Date(a.date).getTime() -
          new Date(b.date).getTime()
      );

    // 5. REMOVE INCOMPLETE 5-MINUTE CANDLES

    const currentTime = Date.now();

    const completedCandles = allCandles.filter((candle) => {
      const candleStart = new Date(candle.date).getTime();

      if (!Number.isFinite(candleStart)) return false;

      const candleEnd = candleStart + CANDLE_DURATION_MS;

      return candleEnd <= currentTime;
    });

    if (completedCandles.length < 20) {
      throw new Error(
        `Insufficient completed historical candles for EMA20: ${completedCandles.length}`
      );
    }

    // 6. IDENTIFY LATEST COMPLETED SESSION

    const latestCompletedCandle =
      completedCandles[completedCandles.length - 1];

    const sessionDate = getISTDate(
      latestCompletedCandle.date
    );

    const sessionCandles = completedCandles.filter(
      (candle) => getISTDate(candle.date) === sessionDate
    );

    if (sessionCandles.length < 20) {
      throw new Error(
        `Insufficient completed session candles: ${sessionCandles.length}`
      );
    }

    // 7. EMA - COMPLETED HISTORICAL CANDLES

    const closes = completedCandles.map(
      (candle) => candle.close
    );

    const ema9 = calculateEMA(closes, 9);
    const ema20 = calculateEMA(closes, 20);

    if (ema9 === null || ema20 === null) {
      throw new Error("EMA calculation unavailable");
    }

    // 8. VWAP - COMPLETED CURRENT SESSION CANDLES

    const vwap = calculateVWAP(sessionCandles);

    if (vwap === null) {
      throw new Error("VWAP calculation unavailable");
    }

    // 9. LATEST COMPLETED CANDLES

    const last = sessionCandles.at(-1);
    const previous = sessionCandles.at(-2);

    // 10. CONFIRMED MARKET STRUCTURE

    const structure = getMarketStructure(sessionCandles);

    // 11. VOLUME

    const volume = getVolumeAnalysis(sessionCandles);

    // 12. BREAKOUT

    const breakout = getBreakoutAnalysis(
      sessionCandles,
      structure,
      volume
    );

    // 13. VWAP POSITION

    const price = last.close;

    let vwapPosition = "AT_VWAP";

    if (price > vwap) {
      vwapPosition = "ABOVE_VWAP";
    } else if (price < vwap) {
      vwapPosition = "BELOW_VWAP";
    }

    // 14. EMA TREND

    let emaTrend = "NEUTRAL";

    if (ema9 > ema20 && price > ema9) {
      emaTrend = "BULLISH";
    } else if (ema9 < ema20 && price < ema9) {
      emaTrend = "BEARISH";
    }

    // 15. PRICE MOMENTUM

    let momentum = "SIDEWAYS";

    if (last.close > previous.close) {
      momentum = "UP";
    } else if (last.close < previous.close) {
      momentum = "DOWN";
    }

    // 16. MARKET BIAS

    const bullishChecks = [
      vwapPosition === "ABOVE_VWAP",
      emaTrend === "BULLISH",
      structure.structure === "BULLISH_STRUCTURE",
      momentum === "UP",
    ].filter(Boolean).length;

    const bearishChecks = [
      vwapPosition === "BELOW_VWAP",
      emaTrend === "BEARISH",
      structure.structure === "BEARISH_STRUCTURE",
      momentum === "DOWN",
    ].filter(Boolean).length;

    let bias = "NEUTRAL";

    if (
      bullishChecks >= 3 &&
      bullishChecks > bearishChecks
    ) {
      bias = "BULLISH";
    } else if (
      bearishChecks >= 3 &&
      bearishChecks > bullishChecks
    ) {
      bias = "BEARISH";
    }

    // 17. CANDLE AGE

    const candleStartTime = new Date(last.date).getTime();
    const candleEndTime = candleStartTime + CANDLE_DURATION_MS;

    const candleAgeMinutes = Number(
      ((currentTime - candleEndTime) / 60000).toFixed(2)
    );

    // 18. RETURN

    return {
      success: true,

      contract: future.tradingsymbol,
      expiry: future.expiry,

      timeframe: TIMEFRAME,
      session: sessionDate,

      candleTime: last.date,
      candleCloseTime: new Date(candleEndTime).toISOString(),
      candleAgeMinutes,

      candleCount: sessionCandles.length,
      historicalCandleCount: completedCandles.length,
      rawCandleCount: rawCandles.length,

      price: Number(price.toFixed(2)),

      vwap: Number(vwap.toFixed(2)),
      vwapPosition,

      ema9: Number(ema9.toFixed(2)),
      ema20: Number(ema20.toFixed(2)),
      emaTrend,

      momentum,
      structure,
      volume,
      breakout,

      bias,

      bullishChecks,
      bearishChecks,

      analyzedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(
      "OI BOT MARKET CONFIRMATION ERROR:",
      error.message
    );

    return {
      success: false,
      bias: "NEUTRAL",
      error: error.message,
    };
  }
}
