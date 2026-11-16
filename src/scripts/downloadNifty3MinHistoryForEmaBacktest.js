
import fs from "node:fs";
import path from "node:path";

import { getKiteClient } from "../services/zerodha/client.js";
import { getOIBotAccessToken } from "../services/oi-bot/tokenStore.js";

const INSTRUMENT_TOKEN = 256265;
const INTERVAL = "3minute";

// Backtest data range
const START_DATE = "2026-01-01 00:00:00";
const END_DATE = "2026-11-14 00:00:00";

// Separate 3-minute CSV. Existing 5-minute CSV will NOT be modified.
const OUTPUT_FILE = path.resolve(
  process.cwd(),
  "data/nifty-history/NIFTY_SPOT_3MIN_2YEARS.csv"
);

// Keep each API request to 30 days.
const CHUNK_DAYS = 30;

function parseCSVLine(line) {
  const values = [];
  let value = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }

  values.push(value);
  return values;
}

function formatCSVValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function toCandleRow(candle) {
  return {
    date: new Date(candle.date).toISOString(),
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
    volume: Number(candle.volume ?? 0),
  };
}

function parseDate(value) {
  // Interpret date strings as UTC to keep chunk boundaries consistent.
  return new Date(`${value.replace(" ", "T")}Z`);
}

function formatDate(date) {
  return date.toISOString().replace("T", " ").slice(0, 19);
}

function readExistingCSV() {
  const candlesMap = new Map();

  if (!fs.existsSync(OUTPUT_FILE)) {
    console.log("No existing 3-minute CSV found. Creating a new file.");
    return candlesMap;
  }

  const content = fs.readFileSync(OUTPUT_FILE, "utf8")
    .replace(/^\uFEFF/, "")
    .trim();

  if (!content) return candlesMap;

  const lines = content.split(/\r?\n/);
  const headers = parseCSVLine(lines[0]).map(x =>
    x.trim().toLowerCase()
  );

  const dateIndex = headers.indexOf("date");
  const openIndex = headers.indexOf("open");
  const highIndex = headers.indexOf("high");
  const lowIndex = headers.indexOf("low");
  const closeIndex = headers.indexOf("close");
  const volumeIndex = headers.indexOf("volume");

  if (
    [dateIndex, openIndex, highIndex, lowIndex, closeIndex]
      .some(index => index < 0)
  ) {
    throw new Error("Existing 3-minute CSV has missing OHLC columns.");
  }

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;

    const values = parseCSVLine(line);
    const date = new Date(values[dateIndex]);

    if (Number.isNaN(date.getTime())) continue;

    const row = {
      date: date.toISOString(),
      open: Number(values[openIndex]),
      high: Number(values[highIndex]),
      low: Number(values[lowIndex]),
      close: Number(values[closeIndex]),
      volume: volumeIndex >= 0
        ? Number(values[volumeIndex] || 0)
        : 0,
    };

    candlesMap.set(row.date, row);
  }

  return candlesMap;
}

async function downloadInChunks(kite, candlesMap) {
  const start = parseDate(START_DATE);
  const end = parseDate(END_DATE);

  const chunkMilliseconds = CHUNK_DAYS * 24 * 60 * 60 * 1000;
  let cursor = start;

  let totalDownloaded = 0;
  let totalAdded = 0;
  let requestNumber = 0;

  while (cursor <= end) {
    const chunkEnd = new Date(
      Math.min(
        cursor.getTime() + chunkMilliseconds - 1000,
        end.getTime()
      )
    );

    const from = formatDate(cursor);
    const to = formatDate(chunkEnd);

    requestNumber++;

    console.log("\n--------------------------------------");
    console.log(`Request ${requestNumber}`);
    console.log("From:", from);
    console.log("To:", to);

    const downloaded = await kite.getHistoricalData(
      INSTRUMENT_TOKEN,
      INTERVAL,
      from,
      to,
      false,
      false
    );

    if (!Array.isArray(downloaded)) {
      throw new Error(`Invalid Zerodha response for ${from} to ${to}`);
    }

    let addedInChunk = 0;

    for (const candle of downloaded) {
      const row = toCandleRow(candle);

      if (
        !Number.isFinite(row.open) ||
        !Number.isFinite(row.high) ||
        !Number.isFinite(row.low) ||
        !Number.isFinite(row.close)
      ) {
        continue;
      }

      if (!candlesMap.has(row.date)) {
        addedInChunk++;
      }

      candlesMap.set(row.date, row);
    }

    totalDownloaded += downloaded.length;
    totalAdded += addedInChunk;

    console.log("Downloaded:", downloaded.length);
    console.log("New candles:", addedInChunk);
    console.log("Total unique candles:", candlesMap.size);

    // Move to the next non-overlapping time range.
    cursor = new Date(chunkEnd.getTime() + 1000);
  }

  return {
    totalDownloaded,
    totalAdded,
    requestNumber,
  };
}

function saveCSV(candlesMap) {
  const rows = [...candlesMap.values()].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const csvRows = [
    "date,open,high,low,close,volume",
    ...rows.map(row =>
      [
        row.date,
        row.open,
        row.high,
        row.low,
        row.close,
        row.volume,
      ].map(formatCSVValue).join(",")
    ),
  ];

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

  const tempFile = `${OUTPUT_FILE}.tmp`;

  fs.writeFileSync(tempFile, csvRows.join("\n"), "utf8");
  fs.renameSync(tempFile, OUTPUT_FILE);

  return rows;
}

async function main() {
  console.log("\n======================================");
  console.log("NIFTY 3-MINUTE HISTORICAL DATA DOWNLOAD");
  console.log("======================================");

  console.log("Instrument Token:", INSTRUMENT_TOKEN);
  console.log("Interval:", INTERVAL);
  console.log("Start:", START_DATE);
  console.log("End:", END_DATE);
  console.log("Output:", OUTPUT_FILE);

  const accessToken = await getOIBotAccessToken();

  if (!accessToken) {
    throw new Error("Zerodha access token not found in Redis.");
  }

  const kite = getKiteClient();
  kite.setAccessToken(accessToken);

  const candlesMap = readExistingCSV();

  console.log("\nExisting 3-minute candles:", candlesMap.size);

  const result = await downloadInChunks(kite, candlesMap);

  const rows = saveCSV(candlesMap);

  console.log("\n======================================");
  console.log("3-MINUTE DATA DOWNLOAD COMPLETED");
  console.log("======================================");

  console.log("API Requests:", result.requestNumber);
  console.log("Downloaded candles:", result.totalDownloaded);
  console.log("New candles added:", result.totalAdded);
  console.log("Total unique candles:", rows.length);
  console.log("First candle:", rows[0]?.date);
  console.log("Last candle:", rows.at(-1)?.date);
  console.log("CSV:", OUTPUT_FILE);

  console.log("\nExisting 5-minute CSV was not modified.");
}

main().catch(error => {
  console.error("\n3-MINUTE DOWNLOAD FAILED:", error.message);
  process.exitCode = 1;
});
