import { getKiteClient } from "./client";
import { getAccessToken } from "./session";

export async function getLiveQuote() {
  try {
    const accessToken = await getAccessToken();

    console.log("Access Token:", accessToken);

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
// GET NIFTY 50 HISTORICAL DATA
// =====================================================
export async function getNiftyHistoricalData(
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

    const instrumentToken = 256265;

    const to = new Date();

    const from = new Date();
    from.setDate(from.getDate() - days);

    const fromDate = from.toISOString().split("T")[0];
    const toDate = to.toISOString().split("T")[0];

    console.log("==================================");
    console.log("NIFTY HISTORICAL DATA");
    console.log("Instrument: NSE:NIFTY 50");
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

    console.log("NIFTY CANDLE COUNT:", candles.length);

    return {
      tradingsymbol: "NIFTY 50",
      instrumentToken,
      interval,
      candles,
    };
  } catch (err) {
    console.error("NIFTY HISTORICAL ERROR =================");
    console.error(err);

    throw err;
  }
}

export async function testInstruments() {
  try {
    const accessToken = await getAccessToken();

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

export async function getNFOInstruments() {
  try {
    const accessToken = await getAccessToken();

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

    // Import current nearest-expiry Crude contract
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

    // Zerodha expects YYYY-MM-DD
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