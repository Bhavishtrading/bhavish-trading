
import { Redis } from "@upstash/redis";
import { getKiteClient } from "@/services/zerodha/client";
import { getOIBotAccessToken } from "./tokenStore";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const HISTORY_KEY = "bhavish:oi-bot:nifty-options:history";
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

function getDateString(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export async function captureOptionsChainSnapshot() {
  try {
    const accessToken = await getOIBotAccessToken();

    if (!accessToken) {
      throw new Error("OI BOT Zerodha token missing. Login again.");
    }

    const kite = getKiteClient();
    kite.setAccessToken(accessToken);

    // 1. Get NIFTY spot price
    const spotQuotes = await kite.getQuote(["NSE:NIFTY 50"]);
    const spotQuote = spotQuotes?.["NSE:NIFTY 50"];
    const spotPrice = Number(spotQuote?.last_price);

    if (!Number.isFinite(spotPrice) || spotPrice <= 0) {
      throw new Error("NIFTY spot price unavailable");
    }

    // 2. Get NFO instruments
    const instruments = await kite.getInstruments(["NFO"]);
    const todayIST = getTodayIST();

    // 3. Find nearest NIFTY options expiry
    const options = instruments.filter((item) => {
      return (
        item.name === "NIFTY" &&
        item.segment === "NFO-OPT" &&
        ["CE", "PE"].includes(item.instrument_type) &&
        item.expiry &&
        getDateString(item.expiry) >= todayIST
      );
    });

    const expiries = [
      ...new Set(options.map((item) => getDateString(item.expiry))),
    ].sort();

    const expiry = expiries[0];

    if (!expiry) {
      throw new Error("Active NIFTY options expiry not found");
    }

    // 4. Find ATM strike and select 11 strikes
    const expiryOptions = options.filter(
      (item) => getDateString(item.expiry) === expiry
    );

    const atmStrike = Math.round(spotPrice / 50) * 50;

    const selectedStrikes = Array.from(
      { length: 11 },
      (_, index) => atmStrike + (index - 5) * 50
    );

    const selectedOptions = expiryOptions.filter((item) =>
      selectedStrikes.includes(Number(item.strike))
    );

    if (selectedOptions.length === 0) {
      throw new Error("NIFTY ATM option contracts not found");
    }

    // 5. Fetch CE and PE live quotes
    const symbols = selectedOptions.map(
      (item) => `NFO:${item.tradingsymbol}`
    );

    const quotes = await kite.getQuote(symbols);

    // 6. Read previous snapshot for comparison
    const previousRaw = await redis.lindex(HISTORY_KEY, -1);
    const previousSnapshot = previousRaw
      ? typeof previousRaw === "string"
        ? JSON.parse(previousRaw)
        : previousRaw
      : null;

    const previousMap = new Map(
      (previousSnapshot?.options || []).map((item) => [
        item.tradingsymbol,
        item,
      ])
    );

    // 7. Build option chain
    const chain = selectedOptions
      .map((instrument) => {
        const quote = quotes?.[`NFO:${instrument.tradingsymbol}`];

        if (!quote) return null;

        const previous = previousMap.get(instrument.tradingsymbol);

        const ltp = Number(quote.last_price);
        const oi = Number(quote.oi);
        const volume = Number(quote.volume) || 0;

        if (!Number.isFinite(ltp) || !Number.isFinite(oi)) {
          return null;
        }

        return {
          tradingsymbol: instrument.tradingsymbol,
          instrumentToken: instrument.instrument_token,
          strike: Number(instrument.strike),
          optionType: instrument.instrument_type,
          expiry,

          ltp,
          oi,
          volume,

          previousLtp: previous?.ltp ?? null,
          previousOI: previous?.oi ?? null,

          premiumChange:
            previous?.ltp != null
              ? Number((ltp - previous.ltp).toFixed(2))
              : null,

          oiChange:
            previous?.oi != null
              ? oi - previous.oi
              : null,
        };
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          a.strike - b.strike ||
          (a.optionType === "CE" ? -1 : 1)
      );

    if (chain.length === 0) {
      throw new Error("Live NIFTY options quotes unavailable");
    }

    // 8. Build snapshot
    const capturedAt = Date.now();

    const snapshot = {
      underlying: "NIFTY",
      spotPrice,
      atmStrike,
      expiry,
      totalContracts: chain.length,
      options: chain,
      capturedAt,
      capturedAtISO: new Date(capturedAt).toISOString(),
    };

    // 9. Save independent OI BOT history
    await redis.rpush(HISTORY_KEY, JSON.stringify(snapshot));
    await redis.ltrim(HISTORY_KEY, -MAX_HISTORY, -1);
    await redis.expire(HISTORY_KEY, HISTORY_TTL);

    console.log("OI BOT OPTIONS SNAPSHOT SAVED", {
      spotPrice,
      atmStrike,
      expiry,
      totalContracts: chain.length,
    });

    return {
      success: true,
      snapshot,
    };
  } catch (error) {
    console.error("OI BOT OPTIONS ERROR:", error.message);

    return {
      success: false,
      error: error.message,
    };
  }
}
