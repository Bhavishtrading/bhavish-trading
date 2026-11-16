
import fs from "node:fs";
import path from "node:path";

import { getKiteClient } from "../services/zerodha/client.js";
import { getOIBotAccessToken } from "../services/oi-bot/tokenStore.js";

const INTERVAL = "day";
const CHUNK_DAYS = 30;
const DELAY_MS = 500;

// 36 completed months: November 2023 – October 2026
const START_DATE = "2023-11-01";
const END_DATE = "2026-10-31";

const STOCKS = [
  "BHARTIARTL",
  "RELIANCE",
  "INFY",
  "TCS",
  "ICICIBANK",
];

const OUTPUT_DIR = path.resolve(
  process.cwd(),
  "data/nifty50-stocks-36months"
);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function dateString(date) {
  return date.toISOString().slice(0, 10);
}

function escapeCSV(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function writeCSV(filePath, headers, rows) {
  const csv = [
    headers.join(","),
    ...rows.map(row =>
      headers.map(key => escapeCSV(row[key])).join(",")
    ),
  ].join("\n");

  fs.writeFileSync(filePath, csv, "utf8");
}

function createMonthlySummary(candles, symbol) {
  const months = new Map();

  for (const candle of candles) {
    const month = candle.date.slice(0, 7);

    if (!months.has(month)) {
      months.set(month, []);
    }

    months.get(month).push(candle);
  }

  const result = [];

  for (const [month, records] of months) {
    records.sort((a, b) => a.date.localeCompare(b.date));

    const first = records[0];
    const last = records[records.length - 1];

    let highest = records[0];
    let lowest = records[0];
    let monthlyVolume = 0;

    for (const candle of records) {
      if (candle.high > highest.high) {
        highest = candle;
      }

      if (candle.low < lowest.low) {
        lowest = candle;
      }

      monthlyVolume += Number(candle.volume || 0);
    }

    result.push({
      symbol,
      month,
      firstTradingDate: first.date,
      open: first.open,
      monthlyHigh: highest.high,
      highDate: highest.date,
      monthlyLow: lowest.low,
      lowDate: lowest.date,
      lastTradingDate: last.date,
      close: last.close,
      monthlyVolume,
      changePercent: Number(
        ((last.close / first.open - 1) * 100).toFixed(2)
      ),
      tradingDays: records.length,
    });
  }

  return result;
}

async function main() {
  console.log("====================================");
  console.log("NIFTY 50 STOCKS - 36 MONTH HISTORY");
  console.log("====================================");

  const accessToken = await getOIBotAccessToken();

  if (!accessToken) {
    throw new Error("Zerodha access token missing.");
  }

  const kite = getKiteClient();
  kite.setAccessToken(accessToken);

  // Fetch NSE instrument master to obtain real instrument tokens.
  console.log("Fetching NSE instruments...");

  const instruments = await kite.getInstruments(["NSE"]);

  const instrumentMap = new Map(
    instruments.map(item => [
      item.tradingsymbol,
      item,
    ])
  );

  const missing = STOCKS.filter(
    symbol => !instrumentMap.has(symbol)
  );

  if (missing.length) {
    throw new Error(
      `NSE instruments not found: ${missing.join(", ")}`
    );
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const allMonthlyRows = [];

  for (const symbol of STOCKS) {
    const instrument = instrumentMap.get(symbol);
    const token = instrument.instrument_token;

    console.log("\n====================================");
    console.log("Downloading:", symbol);
    console.log("Token:", token);
    console.log("====================================");

    const candleMap = new Map();

    let current = new Date(`${START_DATE}T00:00:00.000Z`);
    const end = new Date(`${END_DATE}T00:00:00.000Z`);

    let batch = 0;

    while (current <= end) {
      const next = new Date(current);
      next.setUTCDate(next.getUTCDate() + CHUNK_DAYS);

      if (next > end) {
        next.setTime(end.getTime());
      }

      const fromDate = dateString(current);
      const toDate = dateString(next);

      batch++;

      console.log(
        `${symbol} | Batch ${batch} | ${fromDate} to ${toDate}`
      );

      const candles = await kite.getHistoricalData(
        token,
        INTERVAL,
        fromDate,
        toDate,
        false,
        false
      );

      if (!Array.isArray(candles)) {
        throw new Error(`Invalid response for ${symbol}`);
      }

      for (const candle of candles) {
        // Preserve exchange-local trading date.
        const date = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(candle.date));

        candleMap.set(date, {
          date,
          open: Number(candle.open),
          high: Number(candle.high),
          low: Number(candle.low),
          close: Number(candle.close),
          volume: Number(candle.volume || 0),
        });
      }

      console.log(
        `Received: ${candles.length} | Unique total: ${candleMap.size}`
      );

      current = new Date(next);
      current.setUTCDate(current.getUTCDate() + 1);

      await sleep(DELAY_MS);
    }

    const dailyRows = [...candleMap.values()].sort(
      (a, b) => a.date.localeCompare(b.date)
    );

    if (!dailyRows.length) {
      throw new Error(`No daily data received for ${symbol}`);
    }

    const dailyFile = path.join(
      OUTPUT_DIR,
      `${symbol}_DAILY_36MONTHS.csv`
    );

    writeCSV(
      dailyFile,
      ["date", "open", "high", "low", "close", "volume"],
      dailyRows
    );

    const monthlyRows = createMonthlySummary(
      dailyRows,
      symbol
    );

    const monthlyFile = path.join(
      OUTPUT_DIR,
      `${symbol}_MONTHLY_36MONTHS.csv`
    );

    writeCSV(
      monthlyFile,
      [
        "symbol",
        "month",
        "firstTradingDate",
        "open",
        "monthlyHigh",
        "highDate",
        "monthlyLow",
        "lowDate",
        "lastTradingDate",
        "close",
        "monthlyVolume",
        "changePercent",
        "tradingDays",
      ],
      monthlyRows
    );

    allMonthlyRows.push(...monthlyRows);

    console.log("Completed:", symbol);
    console.log("Daily candles:", dailyRows.length);
    console.log("Monthly records:", monthlyRows.length);
    console.log("Daily CSV:", dailyFile);
    console.log("Monthly CSV:", monthlyFile);
  }

  // Combined monthly summary for all five stocks.
  const combinedFile = path.join(
    OUTPUT_DIR,
    "ALL_5_STOCKS_MONTHLY_36MONTHS.csv"
  );

  writeCSV(
    combinedFile,
    [
      "symbol",
      "month",
      "firstTradingDate",
      "open",
      "monthlyHigh",
      "highDate",
      "monthlyLow",
      "lowDate",
      "lastTradingDate",
      "close",
      "monthlyVolume",
      "changePercent",
      "tradingDays",
    ],
    allMonthlyRows
  );

  console.log("\n====================================");
  console.log("ALL DOWNLOADS COMPLETED");
  console.log("Total stocks:", STOCKS.length);
  console.log("Total monthly rows:", allMonthlyRows.length);
  console.log("Output directory:", OUTPUT_DIR);
  console.log("====================================");
}

main().catch(error => {
  console.error("DOWNLOAD FAILED:", error);
  process.exitCode = 1;
});
