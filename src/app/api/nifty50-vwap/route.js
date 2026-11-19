
import { NextResponse } from "next/server";

import { getKiteClient } from "@/services/zerodha/client";
import { getAccessToken } from "@/services/zerodha/session";
import { NIFTY50_STOCKS } from "@/services/zerodha/nifty50Sectors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INTERVAL = "5minute";
const VWAP_CACHE_DURATION = 60 * 1000;
const IST_TIME_ZONE = "Asia/Kolkata";

let vwapCache = {
  data: null,
  expiresAt: 0,
};

let refreshPromise = null;

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Get current date and time in Indian Standard Time.
function getIndiaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    date: `${values.year}-${values.month}-${values.day}`,
  };
}

function formatKiteDate(date) {
  const parts = getIndiaDateParts(date);

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(date);

  return `${parts.date} ${time}`;
}

function getCandleIndiaDate(candleDate) {
  const date = new Date(candleDate);

  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  return getIndiaDateParts(date).date;
}

// Calculate current trading day's VWAP using 5-minute candles.
function calculateSessionVWAP(candles, tradingDate) {
  let cumulativePV = 0;
  let cumulativeVolume = 0;

  const sessionCandles = (candles || [])
    .filter((candle) => {
      const date = new Date(candle.date);

      return (
        Number.isFinite(date.getTime()) &&
        getCandleIndiaDate(candle.date) === tradingDate &&
        date.getTime() <= Date.now() &&
        Number(candle.high) > 0 &&
        Number(candle.low) > 0 &&
        Number(candle.close) > 0 &&
        Number(candle.volume) > 0
      );
    })
    .sort(
      (a, b) =>
        new Date(a.date).getTime() -
        new Date(b.date).getTime()
    );

  for (const candle of sessionCandles) {
    const high = Number(candle.high);
    const low = Number(candle.low);
    const close = Number(candle.close);
    const volume = Number(candle.volume);

    const typicalPrice = (high + low + close) / 3;

    cumulativePV += typicalPrice * volume;
    cumulativeVolume += volume;
  }

  if (cumulativeVolume <= 0) {
    return null;
  }

  return {
    vwap: Number(
      (cumulativePV / cumulativeVolume).toFixed(2)
    ),
    candleCount: sessionCandles.length,
    cumulativeVolume,
  };
}

async function refreshVWAPData(kite) {
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

  const now = new Date();
  const tradingDate = getIndiaDateParts(now).date;

  const from = new Date(
    `${tradingDate}T03:45:00.000Z`
  );

  const to = now;

  const results = [];

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
        formatKiteDate(from),
        formatKiteDate(to),
        false,
        false
      );

      const result = calculateSessionVWAP(
        candles,
        tradingDate
      );

      results.push({
        symbol: stock.symbol,
        name: stock.name,
        instrumentToken: instrument.instrument_token,
        vwap: result?.vwap ?? null,
        candleCount: result?.candleCount ?? 0,
        cumulativeVolume: result?.cumulativeVolume ?? 0,
        tradingDate,
        status: result ? "READY" : "INSUFFICIENT_DATA",
      });
    } catch (error) {
      console.error(
        `VWAP ERROR ${stock.symbol}:`,
        error.message
      );

      results.push({
        symbol: stock.symbol,
        name: stock.name,
        vwap: null,
        candleCount: 0,
        cumulativeVolume: 0,
        tradingDate,
        status: "ERROR",
        error: error.message,
      });
    }

    // Keep historical requests sequential.
    await sleep(300);
  }

  vwapCache = {
    data: results,
    expiresAt: Date.now() + VWAP_CACHE_DURATION,
  };

  return results;
}

export async function GET() {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      throw new Error("Zerodha access token not found");
    }

    const kite = getKiteClient();
    kite.setAccessToken(accessToken);

    // Refresh historical VWAP data when cache expires.
    if (!vwapCache.data || Date.now() >= vwapCache.expiresAt) {
      if (!refreshPromise) {
        refreshPromise = refreshVWAPData(kite).finally(() => {
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

    const stocks = (vwapCache.data || []).map((item) => {
      const quote = quotes[`NSE:${item.symbol}`];

      const ltp = Number(quote?.last_price || 0);
      const vwap = item.vwap;

      let position = "WAITING";
      let difference = null;
      let differencePercent = null;

      if (ltp > 0 && vwap !== null && vwap > 0) {
        difference = Number((ltp - vwap).toFixed(2));

        differencePercent = Number(
          (((ltp - vwap) / vwap) * 100).toFixed(2)
        );

        if (difference > 0.01) {
          position = "ABOVE";
        } else if (difference < -0.01) {
          position = "BELOW";
        } else {
          position = "AT";
        }
      }

      return {
        ...item,
        ltp,
        position,
        difference,
        differencePercent,
      };
    });

    const above = stocks.filter(
      (stock) => stock.position === "ABOVE"
    );

    const below = stocks.filter(
      (stock) => stock.position === "BELOW"
    );

    const atVWAP = stocks.filter(
      (stock) => stock.position === "AT"
    );

    const waiting = stocks.filter(
      (stock) => stock.position === "WAITING"
    );

    return NextResponse.json(
      {
        success: true,
        timeframe: "5 Minute",
        indicator: "VWAP",
        calculation: "Intraday Session VWAP",
        totalStocks: stocks.length,
        above: above.length,
        below: below.length,
        atVWAP: atVWAP.length,
        waiting: waiting.length,
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
    console.error("NIFTY 50 VWAP API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Unable to calculate VWAP",
      },
      { status: 500 }
    );
  }
}
