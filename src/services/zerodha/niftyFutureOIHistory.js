
import { Redis } from "@upstash/redis";

// =====================================================
// REDIS CONFIGURATION
// =====================================================

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// =====================================================
// CONFIGURATION
// =====================================================

const HISTORY_KEY = "bhavish:nifty:future:oi:history";

const MAX_HISTORY = 360;

// Keep Redis history for 2 days
const HISTORY_TTL = 60 * 60 * 24 * 2;

// =====================================================
// SAVE NIFTY FUTURES OI SNAPSHOT
// =====================================================

export async function saveNiftyFutureOISnapshot(data) {
  try {
    if (!data || data.success !== true) {
      throw new Error("Invalid Futures OI data");
    }

    const ltp = Number(data.ltp);
    const oi = Number(data.oi);

    if (
      !Number.isFinite(ltp) ||
      ltp <= 0 ||
      !Number.isFinite(oi) ||
      oi <= 0
    ) {
      throw new Error("Invalid Futures price or OI");
    }

    if (!data.symbol || !data.expiry) {
      throw new Error("Missing Futures contract details");
    }

    const capturedAt = Date.now();

    const snapshot = {
      symbol: data.symbol,
      instrumentToken: data.instrumentToken,
      expiry: data.expiry,

      ltp,
      oi,

      volume: Number(data.volume) || 0,

      previousClose: data.previousClose ?? null,

      exchangeTimestamp: data.exchangeTimestamp ?? null,

      capturedAt,

      capturedAtISO: new Date(capturedAt).toISOString(),
    };

    // Store snapshot
    await redis.rpush(
      HISTORY_KEY,
      JSON.stringify(snapshot)
    );

    // Retain latest 360 snapshots
    await redis.ltrim(
      HISTORY_KEY,
      -MAX_HISTORY,
      -1
    );

    // Refresh history expiry
    await redis.expire(
      HISTORY_KEY,
      HISTORY_TTL
    );

    console.log("==================================");
    console.log("NIFTY FUTURES OI SNAPSHOT SAVED");
    console.log("Contract:", snapshot.symbol);
    console.log("LTP:", snapshot.ltp);
    console.log("OI:", snapshot.oi);
    console.log("Time:", snapshot.capturedAtISO);
    console.log("==================================");

    return {
      success: true,
      snapshot,
    };

  } catch (error) {
    console.error(
      "NIFTY FUTURES OI SNAPSHOT SAVE ERROR:",
      error
    );

    return {
      success: false,
      error: error.message,
    };
  }
}

// =====================================================
// GET COMPLETE OI HISTORY
// =====================================================

export async function getNiftyFutureOIHistory() {
  try {
    const history = await redis.lrange(
      HISTORY_KEY,
      0,
      -1
    );

    if (!Array.isArray(history)) {
      return [];
    }

    return history
      .map((item) => {
        if (typeof item === "string") {
          try {
            return JSON.parse(item);
          } catch {
            return null;
          }
        }

        return item;
      })
      .filter(Boolean);

  } catch (error) {
    console.error(
      "NIFTY FUTURES OI HISTORY READ ERROR:",
      error
    );

    return [];
  }
}

// =====================================================
// GET HISTORY STATUS
// =====================================================

export async function getNiftyFutureOIHistoryStatus() {
  try {
    const history = await getNiftyFutureOIHistory();

    return {
      success: true,
      totalSnapshots: history.length,
      maximumSnapshots: MAX_HISTORY,
      oldestSnapshot:
        history.length > 0
          ? history[0].capturedAtISO
          : null,
      latestSnapshot:
        history.length > 0
          ? history[history.length - 1].capturedAtISO
          : null,
    };

  } catch (error) {
    console.error(
      "NIFTY FUTURES OI HISTORY STATUS ERROR:",
      error
    );

    return {
      success: false,
      error: error.message,
    };
  }
}
