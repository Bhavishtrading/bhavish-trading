
import { getCurrentNiftyFuture } from "./instruments";
import { getQuotes } from "./quotes";

// =====================================================
// NIFTY FUTURES LIVE OI DATA
// =====================================================

export async function getNiftyFutureOI() {
  try {
    // 1. GET CURRENT ACTIVE FUTURES CONTRACT

    const future = await getCurrentNiftyFuture();

    if (!future || !future.tradingsymbol) {
      throw new Error("Active NIFTY Futures contract not found");
    }

    // 2. BUILD ZERODHA SYMBOL

    const symbol = `NFO:${future.tradingsymbol}`;

    // 3. FETCH LIVE QUOTE

    const quotes = await getQuotes([symbol]);

console.log("===== NIFTY FUTURES QUOTE DEBUG =====");
console.log("Requested Symbol:", symbol);
console.log("Received Quote Keys:", Object.keys(quotes));
console.log("Received Quote:", quotes[symbol]);
console.log("====================================");

const quote = quotes[symbol];

if (!quote) {
  throw new Error(
    `NIFTY Futures quote unavailable. Requested: ${symbol}. Received keys: ${Object.keys(quotes).join(", ") || "None"}`
  );
}

    // 4. EXTRACT MARKET DATA

    const ltp = Number(quote.last_price);
    const oi = Number(quote.oi);
    const volume = Number(quote.volume);

    const previousClose = Number(
      quote.ohlc?.close
    );

    if (!Number.isFinite(ltp) || ltp <= 0) {
      throw new Error("Invalid Futures LTP");
    }

    if (!Number.isFinite(oi) || oi <= 0) {
      throw new Error("Invalid Futures OI");
    }

    // 5. CALCULATE PRICE CHANGE

    const priceChange =
      Number.isFinite(previousClose) &&
      previousClose > 0
        ? Number((ltp - previousClose).toFixed(2))
        : null;

    const priceChangePct =
      priceChange !== null
        ? Number(
            ((priceChange / previousClose) * 100).toFixed(2)
          )
        : null;

    // 6. RETURN STRUCTURED DATA

    return {
      success: true,

      instrument: "NIFTY FUTURES",

      symbol: future.tradingsymbol,

      instrumentToken: future.instrument_token,

      expiry: future.expiry,

      ltp,

      previousClose:
        Number.isFinite(previousClose) &&
        previousClose > 0
          ? previousClose
          : null,

      priceChange,

      priceChangePct,

      oi,

      volume: Number.isFinite(volume)
        ? volume
        : null,

      oiDayHigh: quote.oi_day_high ?? null,

      oiDayLow: quote.oi_day_low ?? null,

      exchangeTimestamp:
        quote.timestamp ??
        quote.last_trade_time ??
        null,

      fetchedAt: new Date().toISOString(),

      source: "ZERODHA_KITE",
    };

  } catch (error) {
    console.error(
      "NIFTY FUTURES OI ERROR:",
      error
    );

    throw error;
  }
}
