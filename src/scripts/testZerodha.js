
import { getKiteClient } from "../services/zerodha/client.js";
import { getOIBotAccessToken } from "../services/oi-bot/tokenStore.js";

async function testZerodha() {
  try {
    console.log("Checking Redis token...");

    const token = await getOIBotAccessToken();

    if (!token) {
      throw new Error("Zerodha access token not found in Redis");
    }

    console.log("Redis token found.");

    const kite = getKiteClient();
    kite.setAccessToken(token);

    console.log("Connecting to Zerodha...");

    const profile = await kite.getProfile();

    console.log("ZERODHA CONNECTION SUCCESS!");
    console.log("User:", profile.user_name);
    console.log("Broker:", profile.broker);

    const instruments = await kite.getInstruments(["NSE"]);

    const nifty = instruments.find(
      item =>
        item.tradingsymbol === "NIFTY 50" &&
        item.exchange === "NSE"
    );

    if (!nifty) {
      throw new Error("NIFTY Spot instrument not found");
    }

    console.log("NIFTY SPOT FOUND!");
    console.log("Instrument:", nifty.tradingsymbol);
    console.log("Token:", nifty.instrument_token);

  } catch (error) {
    console.error("TEST FAILED:", error.message);
  }
}

testZerodha();
