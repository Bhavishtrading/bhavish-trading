import { getKiteClient } from "../services/zerodha/client.js";
import { getOIBotAccessToken } from "../services/oi-bot/tokenStore.js";

async function testHistory() {
  try {
    const token = await getOIBotAccessToken();

    if (!token) {
      throw new Error("Access token missing");
    }

    const kite = getKiteClient();
    kite.setAccessToken(token);

    const candles = await kite.getHistoricalData(
      256265,
      "5minute",
      "2026-11-02 09:15:00",
      "2026-11-06 15:30:00",
      false,
      false
    );

    console.log("HISTORICAL DATA SUCCESS");
    console.log("Total candles:", candles.length);
    console.log("First candle:", candles[0]);
    console.log("Last candle:", candles[candles.length - 1]);

  } catch (error) {
    console.error("HISTORY TEST FAILED:", error.message);
  }
}

testHistory();