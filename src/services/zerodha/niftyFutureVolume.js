
import { getKiteClient } from "./client";
import { getAccessToken } from "./session";
import { getCurrentNiftyFuture } from "./instruments";

export async function getNiftyFutureVolume() {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("Zerodha access token not found");
  }

  const future = await getCurrentNiftyFuture();

  if (!future?.instrument_token) {
    throw new Error("Current NIFTY Futures contract not found");
  }

  const kite = getKiteClient();
  kite.setAccessToken(accessToken);

  // Fetch historical candles
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 5);

  const candles = await kite.getHistoricalData(
    future.instrument_token,
    "5minute",
    from.toISOString().split("T")[0],
    to.toISOString().split("T")[0],
    false,
    true
  );

  const validCandles = candles
    .map((c) => {
      const date = new Date(c.date);

      if (Number.isNaN(date.getTime())) {
        return null;
      }

      // Convert candle timestamp to IST
      const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);

      const day = ist.getUTCDay();
      const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();

      const open = Number(c.open);
      const high = Number(c.high);
      const low = Number(c.low);
      const close = Number(c.close);
      const volume = Number(c.volume);
      const oi = c.oi == null ? null : Number(c.oi);

      // Exclude Saturday and Sunday
      if (day === 0 || day === 6) {
        return null;
      }

      // NSE Futures regular trading session: 09:15–15:30 IST
      if (minutes < 555 || minutes >= 930) {
        return null;
      }

      // Validate OHLC and volume
      if (
        ![open, high, low, close, volume].every(Number.isFinite) ||
        open <= 0 ||
        high <= 0 ||
        low <= 0 ||
        close <= 0 ||
        volume < 0 ||
        high < Math.max(open, close, low) ||
        low > Math.min(open, close, high)
      ) {
        return null;
      }

      return {
        date: c.date,
        open,
        high,
        low,
        close,
        volume,
        oi,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return {
    instrument: future.tradingsymbol,
    instrumentToken: future.instrument_token,
    expiry: future.expiry,
    interval: "5minute",
    candles: validCandles,
    validation: {
      receivedCandles: candles.length,
      validCandles: validCandles.length,
      removedCandles: candles.length - validCandles.length,
    },
  };
}
