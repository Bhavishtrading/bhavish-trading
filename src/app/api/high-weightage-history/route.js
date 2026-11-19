import { NextResponse } from "next/server";

import { getKiteClient } from "@/services/zerodha/client";
import { getAccessToken } from "@/services/zerodha/session";
import { NIFTY50_WEIGHTS } from "@/services/zerodha/nifty50Weights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOP_STOCKS = [
  "HDFCBANK",
  "ICICIBANK",
  "RELIANCE",
  "BHARTIARTL",
  "LT",
  "SBIN",
  "INFY",
];

const INTERVAL = "5minute";

function getISTParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );
}

function formatISTDate(date = new Date()) {
  const p = getISTParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

function formatISTDateTime(date = new Date()) {
  const p = getISTParts(date);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

function round(value, digits = 2) {
  return Number(Number(value || 0).toFixed(digits));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getContribution(price, previousClose, weight, niftyPreviousClose) {
  const changePercent =
    ((price - previousClose) / previousClose) * 100;

  const weightedContribution =
    (weight * changePercent) / 100;

  return (
    (weightedContribution * niftyPreviousClose) / 100
  );
}

export async function GET() {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      throw new Error("Zerodha access token not found");
    }

    const kite = getKiteClient();
    kite.setAccessToken(accessToken);

    // Previous-close reference from the same live quote source
    const quoteSymbols = [
      ...TOP_STOCKS.map((symbol) => `NSE:${symbol}`),
      "NSE:NIFTY 50",
    ];

    const quotes = await kite.getQuote(quoteSymbols);

    const niftyPreviousClose = Number(
      quotes["NSE:NIFTY 50"]?.ohlc?.close || 0
    );

    if (!niftyPreviousClose) {
      throw new Error("NIFTY previous close not available");
    }

    const previousCloses = {};

    for (const symbol of TOP_STOCKS) {
      const value = Number(
        quotes[`NSE:${symbol}`]?.ohlc?.close || 0
      );

      if (value > 0) previousCloses[symbol] = value;
    }

    // NSE instrument tokens
    const instruments = await kite.getInstruments("NSE");

    const instrumentMap = new Map(
      instruments.map((item) => [
        item.tradingsymbol,
        item.instrument_token,
      ])
    );

    const today = formatISTDate();
    const from = `${today} 09:15:00`;
    const to = formatISTDateTime();

    const stockCandles = {};

    // Fetch actual 5-minute candles for all seven stocks
    for (const symbol of TOP_STOCKS) {
      const token = instrumentMap.get(symbol);
      const previousClose = previousCloses[symbol];

      if (!token || !previousClose) {
        stockCandles[symbol] = [];
        continue;
      }

      try {
        stockCandles[symbol] = await kite.getHistoricalData(
          token,
          INTERVAL,
          from,
          to,
          false,
          false
        ) || [];
      } catch (error) {
        console.error(
          `Historical fetch failed for ${symbol}:`,
          error.message
        );

        stockCandles[symbol] = [];
      }

      await sleep(200);
    }

    // Match all seven stocks by exact candle timestamp
    const timestampMap = new Map();

    for (const symbol of TOP_STOCKS) {
      for (const candle of stockCandles[symbol] || []) {
        const timestamp = new Date(candle.date).getTime();

        if (!Number.isFinite(timestamp)) continue;

        if (!timestampMap.has(timestamp)) {
          timestampMap.set(timestamp, {});
        }

        timestampMap.get(timestamp)[symbol] = candle;
      }
    }

    const points = [];

    const timestamps = [...timestampMap.keys()].sort(
      (a, b) => a - b
    );

    for (const timestamp of timestamps) {
      const candlesBySymbol = timestampMap.get(timestamp);

      // Require all seven stocks for a comparable score
      if (
        TOP_STOCKS.some(
          (symbol) => !candlesBySymbol[symbol]
        )
      ) {
        continue;
      }

      let open = 0;
      let high = 0;
      let low = 0;
      let close = 0;

      const contributions = [];

      for (const symbol of TOP_STOCKS) {
        const candle = candlesBySymbol[symbol];
        const previousClose = previousCloses[symbol];
        const weight = Number(NIFTY50_WEIGHTS[symbol] || 0);

        const stockOpen = Number(candle.open);
        const stockHigh = Number(candle.high);
        const stockLow = Number(candle.low);
        const stockClose = Number(candle.close);

        if (
          !previousClose ||
          !weight ||
          ![stockOpen, stockHigh, stockLow, stockClose].every(
            Number.isFinite
          )
        ) {
          continue;
        }

        const openContribution = getContribution(
          stockOpen, previousClose, weight, niftyPreviousClose
        );

        const highContribution = getContribution(
          stockHigh, previousClose, weight, niftyPreviousClose
        );

        const lowContribution = getContribution(
          stockLow, previousClose, weight, niftyPreviousClose
        );

        const closeContribution = getContribution(
          stockClose, previousClose, weight, niftyPreviousClose
        );

        open += openContribution;
        high += highContribution;
        low += lowContribution;
        close += closeContribution;

        const changePercent =
          ((stockClose - previousClose) / previousClose) * 100;

        contributions.push({
          symbol,
          price: stockClose,
          changePercent: round(changePercent, 4),
          weight,
          pointsContribution: round(closeContribution),
        });
      }

      if (contributions.length !== TOP_STOCKS.length) {
        continue;
      }

      points.push({
        timestamp,
        open: round(open),
        high: round(high),
        low: round(low),
        close: round(close),
        score: round(close),
        contributions,
      });
    }

    return NextResponse.json({
      success: true,
      date: today,
      interval: INTERVAL,
      niftyPreviousClose,
      stockCount: TOP_STOCKS.length,
      points,
      count: points.length,
    });

  } catch (error) {
    console.error("HIGH WEIGHTAGE HISTORY API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message || "Unable to fetch historical score",
      },
      { status: 500 }
    );
  }
}