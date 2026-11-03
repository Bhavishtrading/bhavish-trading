import { Redis } from "@upstash/redis";
import { getKiteClient } from "@/services/zerodha/client";
import { getOIBotAccessToken } from "./tokenStore";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const INSTRUMENT_CACHE_KEY = "bhavish:oi-bot:nfo:instruments";
const CACHE_TTL = 60 * 60 * 12; // 12 hours

let memoryCache = null;
let memoryCacheTime = 0;
let refreshPromise = null;

export async function getOIBotNFOInstruments() {
  try {
    // 1. Check in-memory cache
    if (
      memoryCache &&
      Date.now() - memoryCacheTime < CACHE_TTL * 1000
    ) {
      return memoryCache;
    }

    // 2. Check Redis cache
    const cached = await redis.get(INSTRUMENT_CACHE_KEY);

    if (Array.isArray(cached) && cached.length > 0) {
      memoryCache = cached;
      memoryCacheTime = Date.now();
      return cached;
    }

    // 3. Prevent duplicate downloads in the same runtime
    if (refreshPromise) {
      return await refreshPromise;
    }

    refreshPromise = (async () => {
      const accessToken = await getOIBotAccessToken();

      if (!accessToken) {
        throw new Error("OI BOT Zerodha token unavailable");
      }

      const kite = getKiteClient();
      kite.setAccessToken(accessToken);

      const instruments = await kite.getInstruments(["NFO"]);

      if (!Array.isArray(instruments) || instruments.length === 0) {
        throw new Error("NFO instruments download returned empty data");
      }

      await redis.set(INSTRUMENT_CACHE_KEY, instruments, {
        ex: CACHE_TTL,
      });

      memoryCache = instruments;
      memoryCacheTime = Date.now();

      console.log("OI BOT NFO INSTRUMENT CACHE REFRESHED", {
        count: instruments.length,
      });

      return instruments;
    })();

    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}