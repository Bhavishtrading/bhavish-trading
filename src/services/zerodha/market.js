
import { getKiteClient } from "./client";
import { getAccessToken } from "./session";
import { getCurrentNiftyFuture } from "./instruments";

// =====================================================
// GET LIVE NIFTY / BANK NIFTY QUOTE
// =====================================================

export async function getLiveQuote() {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      throw new Error("Access token not found");
    }

    const kite = getKiteClient();
    kite.setAccessToken(accessToken);

    console.log("Calling getQuote...");

    const quotes = await kite.getQuote([
      "NSE:NIFTY 50",
      "NSE:NIFTY BANK",
    ]);

    console.log("Quotes:", quotes);

    return {
      nifty: quotes["NSE:NIFTY 50"]?.last_price ?? null,
      bankNifty: quotes["NSE:NIFTY BANK"]?.last_price ?? null,
      niftyClose: quotes["NSE:NIFTY 50"]?.ohlc?.close ?? null,
      bankClose: quotes["NSE:NIFTY BANK"]?.ohlc?.close ?? null,
    };
  } catch (err) {
    console.error("MARKET ERROR =================");
    console.error(err);
    throw err;
  }
}

// =====================================================
// GET NIFTY 50 HISTORICAL DATA — CHUNKED
// =====================================================

export async function getNiftyHistoricalData(
  interval = "5minute",
  days = 730
) {
  console.log("🔥 GET NIFTY HISTORICAL FUNCTION CALLED 🔥");
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      throw new Error("Access token not found");
    }

    const kite = getKiteClient();
    kite.setAccessToken(accessToken);

    const instrumentToken = 256265;

    const CHUNK_DAYS = {
      minute: 60,
      "3minute": 100,
      "5minute": 100,
      "15minute": 200,
    };

    const maxChunkDays = CHUNK_DAYS[interval];

    if (!maxChunkDays) {
      throw new Error(`Unsupported NIFTY interval: ${interval}`);
    }

    const safeDays = Math.min(
      Math.max(Number(days) || 730, 1),
      730
    );

    const to = new Date();
    to.setUTCHours(0, 0, 0, 0);

    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - safeDays + 1);

    const formatDate = (date) =>
      date.toISOString().slice(0, 10);

    const allCandles = [];
    let chunkStart = new Date(from);
    let requestCount = 0;

    console.log("==================================");
    console.log("NIFTY HISTORICAL DATA — CHUNKED");
    console.log("Instrument: NSE:NIFTY 50");
    console.log("Token:", instrumentToken);
    console.log("Interval:", interval);
    console.log("Days:", safeDays);
    console.log("From:", formatDate(from));
    console.log("To:", formatDate(to));
    console.log("==================================");

    while (chunkStart <= to) {
      const chunkEnd = new Date(chunkStart);

      chunkEnd.setUTCDate(
        chunkEnd.getUTCDate() + maxChunkDays - 1
      );

      if (chunkEnd > to) {
        chunkEnd.setTime(to.getTime());
      }

      const fromDate = formatDate(chunkStart);
      const toDate = formatDate(chunkEnd);

      console.log(
        `NIFTY HISTORY REQUEST ${requestCount + 1}:`,
        fromDate,
        "to",
        toDate
      );

      const candles = await kite.getHistoricalData(
        instrumentToken,
        interval,
        fromDate,
        toDate,
        false,
        true
      );

      if (Array.isArray(candles)) {
        allCandles.push(...candles);
      }

      requestCount += 1;

      chunkStart = new Date(chunkEnd);
      chunkStart.setUTCDate(chunkStart.getUTCDate() + 1);

      if (chunkStart <= to) {
        await new Promise((resolve) =>
          setTimeout(resolve, 350)
        );
      }
    }

    const uniqueCandles = Array.from(
      new Map(
        allCandles.map((candle) => [
          new Date(candle.date).getTime(),
          candle,
        ])
      ).values()
    ).sort(
      (a, b) =>
        new Date(a.date).getTime() -
        new Date(b.date).getTime()
    );

    console.log("NIFTY REQUEST COUNT:", requestCount);
    console.log("NIFTY TOTAL CANDLES:", uniqueCandles.length);
    console.log("========== RAW NIFTY SPOT VOLUME CHECK ==========");

console.log(
  "LATEST RAW CANDLE:",
  uniqueCandles.slice(-1)[0]
);

console.log(
  "LAST 5 RAW CANDLES:",
  uniqueCandles.slice(-5).map(c => ({
    date: c.date,
    close: c.close,
    volume: c.volume
  }))
);

console.log(
  "TOTAL RAW VOLUME:",
  uniqueCandles.reduce(
    (sum, c) => sum + (Number(c.volume) || 0),
    0
  )
);

console.log("=================================================");

    return {
      tradingsymbol: "NIFTY 50",
      instrumentToken,
      interval,
      candles: uniqueCandles,
    };
  } catch (err) {
    console.error("NIFTY HISTORICAL ERROR =================");
    console.error(err);
    throw err;
  }
}

// =====================================================
// GET NIFTY FUTURES HISTORICAL DATA — 5 MINUTE
// Uses existing getCurrentNiftyFuture()
// =====================================================

export async function getNiftyFutureHistoricalData(
  interval = "5minute",
  days = 5
) {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      throw new Error("Access token not found");
    }

    const kite = getKiteClient();
    kite.setAccessToken(accessToken);

    if (!["minute", "3minute", "5minute", "15minute"].includes(interval)) {
      throw new Error(`Unsupported NIFTY Futures interval: ${interval}`);
    }

    const contract = await getCurrentNiftyFuture();

    if (!contract?.instrument_token) {
      throw new Error("Active NIFTY Futures contract not found");
    }

    const safeDays = Math.min(
      Math.max(Number(days) || 5, 1),
      30
    );

    const to = new Date();
    const from = new Date();

    from.setDate(from.getDate() - safeDays);

    const formatDate = (date) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);

    const fromDate = formatDate(from);
    const toDate = formatDate(to);

    console.log("==================================");
    console.log("NIFTY FUTURES HISTORICAL DATA");
    console.log("Contract:", contract.tradingsymbol);
    console.log("Token:", contract.instrument_token);
    console.log("Expiry:", contract.expiry);
    console.log("Interval:", interval);
    console.log("From:", fromDate);
    console.log("To:", toDate);
    console.log("==================================");

    const candles = await kite.getHistoricalData(
      contract.instrument_token,
      interval,
      fromDate,
      toDate,
      false,
      true
    );

    const validCandles = Array.isArray(candles)
      ? candles
          .filter((candle) => {
            return (
              candle &&
              Number.isFinite(Number(candle.open)) &&
              Number.isFinite(Number(candle.high)) &&
              Number.isFinite(Number(candle.low)) &&
              Number.isFinite(Number(candle.close)) &&
              Number.isFinite(Number(candle.volume))
            );
          })
          .sort(
            (a, b) =>
              new Date(a.date).getTime() -
              new Date(b.date).getTime()
          )
      : [];

    console.log(
      "NIFTY FUTURES CANDLE COUNT:",
      validCandles.length
    );

    console.log(
      "NIFTY FUTURES LAST CANDLE:",
      validCandles[validCandles.length - 1] ?? null
    );

    return {
      tradingsymbol: contract.tradingsymbol,
      instrumentToken: contract.instrument_token,
      expiry: contract.expiry,
      interval,
      candles: validCandles,
    };
  } catch (err) {
    console.error("NIFTY FUTURES HISTORICAL ERROR =================");
    console.error(err);
    throw err;
  }
}

// =====================================================
// TEST NFO INSTRUMENTS
// =====================================================

export async function testInstruments() {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      throw new Error("Access token not found");
    }

    const kite = getKiteClient();
    kite.setAccessToken(accessToken);

    console.log("==================================");
    console.log("Fetching NFO Instruments...");

    const instruments = await kite.getInstruments(["NFO"]);

    console.log("Instrument Count:", instruments.length);
    console.log("First Instrument:");
    console.log(instruments[0]);
    console.log("==================================");

    return instruments;
  } catch (err) {
    console.error("==================================");
    console.error("TEST INSTRUMENT ERROR");
    console.error(err);
    console.error("==================================");
    throw err;
  }
}

// =====================================================
// GET NFO INSTRUMENTS
// =====================================================

export async function getNFOInstruments() {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      throw new Error("Access token not found");
    }

    const kite = getKiteClient();
    kite.setAccessToken(accessToken);

    console.log("Fetching NFO Instruments...");

    const instruments = await kite.getInstruments(["NFO"]);

    console.log("Total NFO Instruments:", instruments.length);

    return instruments;
  } catch (err) {
    console.error("NFO Instrument Error");
    console.error(err);
    throw err;
  }
}

// =====================================================
// GET LIVE CRUDE OIL QUOTE
// =====================================================

export async function getLiveCrudeQuote() {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      throw new Error("Access token not found");
    }

    const kite = getKiteClient();
    kite.setAccessToken(accessToken);

    const { getCurrentCrudeFuture } = await import("./instruments");

    const contract = await getCurrentCrudeFuture();
    const instrument = `MCX:${contract.tradingsymbol}`;

    console.log("CRUDE INSTRUMENT:", instrument);

    const quotes = await kite.getQuote([instrument]);

    console.log("CRUDE QUOTE:", quotes);

    const quote = quotes[instrument];

    if (!quote) {
      throw new Error("Crude Oil quote not found");
    }

    return {
      tradingsymbol: contract.tradingsymbol,
      instrumentToken: contract.instrument_token,
      expiry: contract.expiry,
      ltp: quote.last_price ?? null,
      open: quote.ohlc?.open ?? null,
      high: quote.ohlc?.high ?? null,
      low: quote.ohlc?.low ?? null,
      close: quote.ohlc?.close ?? null,
      volume: quote.volume ?? null,
      oi: quote.oi ?? null,
      change: quote.change ?? null,
    };
  } catch (err) {
    console.error("CRUDE MARKET ERROR =================");
    console.error(err);
    throw err;
  }
}

// =====================================================
// GET CRUDE OIL HISTORICAL DATA
// =====================================================

export async function getCrudeHistoricalData(
  interval = "5minute",
  days = 5
) {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      throw new Error("Access token not found");
    }

    const kite = getKiteClient();
    kite.setAccessToken(accessToken);

    const { getCurrentCrudeFuture } = await import("./instruments");

    const contract = await getCurrentCrudeFuture();
    const instrumentToken = contract.instrument_token;

    const to = new Date();

    const from = new Date();
    from.setDate(from.getDate() - days);

    const fromDate = from.toISOString().split("T")[0];
    const toDate = to.toISOString().split("T")[0];

    console.log("==================================");
    console.log("CRUDE HISTORICAL DATA");
    console.log("Contract:", contract.tradingsymbol);
    console.log("Token:", instrumentToken);
    console.log("Interval:", interval);
    console.log("From:", fromDate);
    console.log("To:", toDate);
    console.log("==================================");

    const candles = await kite.getHistoricalData(
      instrumentToken,
      interval,
      fromDate,
      toDate,
      false,
      true
    );

    console.log("CRUDE CANDLE COUNT:", candles.length);

    return {
      tradingsymbol: contract.tradingsymbol,
      instrumentToken,
      expiry: contract.expiry,
      interval,
      candles,
    };
  } catch (err) {
    console.error("CRUDE HISTORICAL ERROR =================");
    console.error(err);
    throw err;
  }
}
