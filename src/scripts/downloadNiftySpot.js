
import fs from "node:fs";
import path from "node:path";

import { getKiteClient } from "../services/zerodha/client.js";
import { getOIBotAccessToken } from "../services/oi-bot/tokenStore.js";

const INSTRUMENT_TOKEN = 256265;
const SYMBOL = "NIFTY 50";
const INTERVAL = "5minute";

const YEARS = 2;
const CHUNK_DAYS = 30;
const DELAY_MS = 500;

const OUTPUT_DIR = path.resolve(
  process.cwd(),
  "data/nifty-history"
);

const OUTPUT_FILE = path.join(
  OUTPUT_DIR,
  "NIFTY_SPOT_5MIN_2YEARS.csv"
);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatDate(date) {
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

  const get = type => parts.find(p => p.type === type).value;

  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

function escapeCSV(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

async function main() {
  console.log("==================================");
  console.log("NIFTY 50 HISTORICAL DATA DOWNLOAD");
  console.log("==================================");

  // Step 1: Redis token

  const accessToken = await getOIBotAccessToken();

  if (!accessToken) {
    throw new Error("Zerodha token missing. Login first.");
  }

  // Step 2: Kite connection

  const kite = getKiteClient();
  kite.setAccessToken(accessToken);

  // Step 3: Date range

  const endDate = new Date();

  const startDate = new Date(endDate);
  startDate.setFullYear(startDate.getFullYear() - YEARS);

  console.log("Start:", formatDate(startDate));
  console.log("End:", formatDate(endDate));

  // Step 4: Output folder

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const candlesMap = new Map();

  let currentDate = new Date(startDate);
  let batchNumber = 0;

  // Step 5: Fetch in 30-day batches

  while (currentDate < endDate) {
    const nextDate = new Date(currentDate);

    nextDate.setDate(
      nextDate.getDate() + CHUNK_DAYS
    );

    if (nextDate > endDate) {
      nextDate.setTime(endDate.getTime());
    }

    batchNumber++;

    console.log(
      `Batch ${batchNumber}:`,
      formatDate(currentDate),
      "to",
      formatDate(nextDate)
    );

    try {
      const candles = await kite.getHistoricalData(
        INSTRUMENT_TOKEN,
        INTERVAL,
        formatDate(currentDate),
        formatDate(nextDate),
        false,
        false
      );

      if (!Array.isArray(candles)) {
        throw new Error("Invalid candle response");
      }

      for (const candle of candles) {
        const timestamp = new Date(candle.date).toISOString();

        candlesMap.set(timestamp, {
          date: timestamp,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume ?? 0,
        });
      }

      console.log(
        `Received ${candles.length} candles | Total: ${candlesMap.size}`
      );

    } catch (error) {
      console.error(
        `Batch ${batchNumber} failed:`,
        error.message
      );

      throw error;
    }

    currentDate = nextDate;

    await sleep(DELAY_MS);
  }

  // Step 6: Sort candles

  const rows = [...candlesMap.values()].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  // Step 7: Generate CSV

  const headers = [
    "date",
    "open",
    "high",
    "low",
    "close",
    "volume",
  ];

  const csv = [
    headers.join(","),
    ...rows.map(row =>
      headers.map(key => escapeCSV(row[key])).join(",")
    ),
  ].join("\n");

  fs.writeFileSync(OUTPUT_FILE, csv, "utf8");

  // Step 8: Summary

  console.log("==================================");
  console.log("DOWNLOAD COMPLETED");
  console.log("==================================");

  console.log("Symbol:", SYMBOL);
  console.log("Timeframe:", INTERVAL);
  console.log("Total candles:", rows.length);
  console.log("First candle:", rows[0]?.date);
  console.log("Last candle:", rows.at(-1)?.date);
  console.log("CSV:", OUTPUT_FILE);
}

main().catch(error => {
  console.error("DOWNLOAD FAILED:", error.message);
  process.exitCode = 1;
});
