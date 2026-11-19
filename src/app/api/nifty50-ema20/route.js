
import { NextResponse } from "next/server";

import { getKiteClient } from "@/services/zerodha/client";
import { getAccessToken } from "@/services/zerodha/session";
import { NIFTY50_STOCKS } from "@/services/zerodha/nifty50Sectors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMA_PERIOD = 20;
const INTERVAL = "5minute";
const HISTORY_DAYS = 10;
const CACHE_DURATION = 5 * 60 * 1000;

let emaCache = {
  data: null,
  expiresAt: 0,
};

let refreshPromise = null;

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function formatDate(date) {
  const pad = (n) => String(n).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// Calculate EMA20 using completed candle closes.
function calculateEMA20(candles) {
  const now = Date.now();

  const closes = (candles || [])
    .filter((candle) => {
      const timestamp = new Date(candle.date).getTime();

      return (
        Number.isFinite(timestamp) &&
        timestamp + 5 * 60 * 1000 <= now &&
        Number(candle.close) > 0
      );
    })
    .sort(
      (a, b) =>
        new Date(a.date).getTime() -
        new Date(b.date).getTime()
    )
    .map((candle) => Number(candle.close));

  if (closes.length < EMA_PERIOD) {
    return null;
  }

  // SMA of first 20 completed candles.
  let ema =
    closes
      .slice(0, EMA_PERIOD)
      .reduce((sum, value) => sum + value, 0) /
    EMA_PERIOD;

  const multiplier = 2 / (EMA_PERIOD + 1);

  for (let i = EMA_PERIOD; i < closes.length; i++) {
    ema =
      (closes[i] - ema) * multiplier + ema;
  }

  return Number(ema.toFixed(2));
}

async function refreshEMAData(kite) {
  const instruments = await kite.getInstruments("NSE");

  const instrumentMap = new Map(
    instruments
      .filter(
        (item) =>
          item.exchange === "NSE" &&
          item.segment === "NSE"
      )
      .map((item) => [
        item.tradingsymbol.toUpperCase(),
        item,
      ])
  );

  const from = new Date();
  from.setDate(from.getDate() - HISTORY_DAYS);
  from.setHours(9, 15, 0, 0);

  const to = new Date();

  const emaResults = [];

  for (const stock of NIFTY50_STOCKS) {
    try {
      const instrument = instrumentMap.get(
        stock.symbol.toUpperCase()
      );

      if (!instrument) {
        throw new Error("Instrument not found");
      }

      const candles = await kite.getHistoricalData(
        instrument.instrument_token,
        INTERVAL,
        formatDate(from),
        formatDate(to),
        false,
        false
      );

      const ema20 = calculateEMA20(candles);

      emaResults.push({
        symbol: stock.symbol,
        name: stock.name,
        instrumentToken: instrument.instrument_token,
        ema20,
        candleCount: candles?.length || 0,
        status: ema20 === null ? "INSUFFICIENT_DATA" : "READY",
      });
    } catch (error) {
      console.error(
        `EMA20 ERROR ${stock.symbol}:`,
        error.message
      );

      emaResults.push({
        symbol: stock.symbol,
        name: stock.name,
        ema20: null,
        status: "ERROR",
        error: error.message,
      });
    }

    // Keep historical requests sequential.
    await sleep(300);
  }

  emaCache = {
    data: emaResults,
    expiresAt: Date.now() + CACHE_DURATION,
  };

  return emaResults;
}

export async function GET() {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      throw new Error("Zerodha access token not found");
    }

    const kite = getKiteClient();
    kite.setAccessToken(accessToken);

    // Refresh historical EMA only when cache expires.
    if (!emaCache.data || Date.now() >= emaCache.expiresAt) {
      if (!refreshPromise) {
        refreshPromise = refreshEMAData(kite).finally(() => {
          refreshPromise = null;
        });
      }

      await refreshPromise;
    }

    // Fetch fresh live prices on every request.
    const instruments = NIFTY50_STOCKS.map(
      (stock) => `NSE:${stock.symbol}`
    );

    const quotes = await kite.getQuote(instruments);

    const stocks = (emaCache.data || []).map((item) => {
      const quote = quotes[`NSE:${item.symbol}`];

      const ltp = Number(quote?.last_price || 0);
      const ema20 = item.ema20;

      let position = "WAITING";

      if (ltp > 0 && ema20 !== null) {
        if (ltp > ema20) {
          position = "ABOVE";
        } else if (ltp < ema20) {
          position = "BELOW";
        } else {
          position = "AT";
        }
      }

      return {
        ...item,
        ltp,
        position,
        difference:
          ema20 !== null && ltp > 0
            ? Number((ltp - ema20).toFixed(2))
            : null,
        differencePercent:
          ema20 !== null && ema20 > 0 && ltp > 0
            ? Number((((ltp - ema20) / ema20) * 100).toFixed(2))
            : null,
      };
    });

    const readyStocks = stocks.filter(
      (stock) => stock.position !== "WAITING"
    );

    return NextResponse.json(
      {
        success: true,
        timeframe: "5 Minute",
        indicator: "EMA 20",
        totalStocks: stocks.length,
        above: stocks.filter((s) => s.position === "ABOVE").length,
        below: stocks.filter((s) => s.position === "BELOW").length,
        atEMA: stocks.filter((s) => s.position === "AT").length,
        waiting: stocks.length - readyStocks.length,
        lastUpdated: new Date().toISOString(),
        stocks,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("NIFTY 50 EMA20 API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Unable to calculate EMA20",
      },
      { status: 500 }
    );
  }
}
