
import { Redis } from "@upstash/redis";
import { getKiteClient } from "@/services/zerodha/client";
import { getOIBotAccessToken } from "./tokenStore";
import { getOIBotNFOInstruments } from "./instrumentCache";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const HISTORY_KEY = "bhavish:oi-bot:nifty-futures:history";
const MAX_HISTORY = 360;
const HISTORY_TTL = 60 * 60 * 24 * 2;

function getTodayIST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function captureOIBotSnapshot() {
  try {
    const accessToken = await getOIBotAccessToken();

    if (!accessToken) {
      throw new Error("OI BOT Zerodha token missing or expired. Login again.");
    }

    const kite = getKiteClient();
    kite.setAccessToken(accessToken);

    // Use shared cached NFO instruments
    const instruments = await getOIBotNFOInstruments();

    const todayIST = getTodayIST();

    const futures = instruments
      .filter((item) =>
        item.name === "NIFTY" &&
        item.segment === "NFO-FUT" &&
        item.instrument_type === "FUT" &&
        item.expiry &&
        new Date(item.expiry).toISOString().slice(0, 10) >= todayIST
      )
      .sort((a, b) => new Date(a.expiry) - new Date(b.expiry));

    const future = futures[0];

    if (!future) {
      throw new Error("Active NIFTY Futures contract not found");
    }

    const symbol = `NFO:${future.tradingsymbol}`;
    const quotes = await kite.getQuote([symbol]);
    const quote = quotes?.[symbol];

    if (!quote) {
      throw new Error("NIFTY Futures live quote unavailable");
    }

    const ltp = Number(quote.last_price);
    const oi = Number(quote.oi);

    if (!Number.isFinite(ltp) || ltp <= 0) {
      throw new Error("Invalid Futures LTP");
    }

    if (!Number.isFinite(oi) || oi <= 0) {
      throw new Error("Invalid Futures OI");
    }

    const capturedAt = Date.now();

    const snapshot = {
      symbol: future.tradingsymbol,
      instrumentToken: future.instrument_token,
      expiry: future.expiry,
      ltp,
      oi,
      volume: Number(quote.volume) || 0,
      previousClose: Number(quote.ohlc?.close) || null,
      exchangeTimestamp: quote.timestamp ?? quote.last_trade_time ?? null,
      capturedAt,
      capturedAtISO: new Date(capturedAt).toISOString(),
    };

    await redis.rpush(HISTORY_KEY, JSON.stringify(snapshot));
    await redis.ltrim(HISTORY_KEY, -MAX_HISTORY, -1);
    await redis.expire(HISTORY_KEY, HISTORY_TTL);

    console.log("OI BOT SNAPSHOT SAVED", {
      symbol: snapshot.symbol,
      ltp: snapshot.ltp,
      oi: snapshot.oi,
      capturedAt: snapshot.capturedAtISO,
    });

    return {
      success: true,
      snapshot,
    };
  } catch (error) {
    console.error("OI BOT SNAPSHOT ERROR:", error.message);

    return {
      success: false,
      error: error.message,
    };
  }
}
