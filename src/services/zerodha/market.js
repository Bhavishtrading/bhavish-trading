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