
import fs from "node:fs";
import path from "node:path";

import { getKiteClient } from "../services/zerodha/client.js";
import { getOIBotAccessToken } from "../services/oi-bot/tokenStore.js";

const INSTRUMENT_TOKEN = 256265;
const INTERVAL = "5minute";

const START_DATE = "2026-11-07 00:00:00";
const END_DATE = "2026-11-14 00:00:00";

const OUTPUT_FILE = path.resolve(
  process.cwd(),
  "data/nifty-history/NIFTY_SPOT_5MIN_2YEARS.csv"
);

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
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume ?? 0,
  };
}

async function main() {
  console.log("\n======================================");
  console.log("NIFTY EMA BACKTEST DATA UPDATE");
  console.log("======================================");

  if (!fs.existsSync(OUTPUT_FILE)) {
    throw new Error(`Existing CSV not found: ${OUTPUT_FILE}`);
  }

  const accessToken = await getOIBotAccessToken();

  if (!accessToken) {
    throw new Error("Zerodha access token not found in Redis.");
  }

  const kite = getKiteClient();
  kite.setAccessToken(accessToken);

  // Read existing CSV
  const content = fs.readFileSync(OUTPUT_FILE, "utf8")
    .replace(/^\uFEFF/, "")
    .trim();

  const lines = content.split(/\r?\n/);
  const headers = parseCSVLine(lines[0]).map(x => x.trim().toLowerCase());

  const dateIndex = headers.indexOf("date");
  const openIndex = headers.indexOf("open");
  const highIndex = headers.indexOf("high");
  const lowIndex = headers.indexOf("low");
  const closeIndex = headers.indexOf("close");
  const volumeIndex = headers.indexOf("volume");

  if ([dateIndex, openIndex, highIndex, lowIndex, closeIndex].some(i => i < 0)) {
    throw new Error("CSV headers are missing required OHLC columns.");
  }

  const candlesMap = new Map();

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
      volume: volumeIndex >= 0 ? Number(values[volumeIndex] || 0) : 0,
    };

    candlesMap.set(row.date, row);
  }

  console.log("Existing unique candles:", candlesMap.size);
  console.log("Downloading:", START_DATE, "to", END_DATE);

  const downloaded = await kite.getHistoricalData(
    INSTRUMENT_TOKEN,
    INTERVAL,
    START_DATE,
    END_DATE,
    false,
    false
  );

  if (!Array.isArray(downloaded)) {
    throw new Error("Invalid response from Zerodha Historical API.");
  }

  let added = 0;

  for (const candle of downloaded) {
    const row = toCandleRow(candle);

    if (!candlesMap.has(row.date)) {
      added++;
    }

    candlesMap.set(row.date, row);
  }

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

  const tempFile = `${OUTPUT_FILE}.tmp`;

  fs.writeFileSync(tempFile, csvRows.join("\n"), "utf8");
  fs.renameSync(tempFile, OUTPUT_FILE);

  console.log("\n======================================");
  console.log("DATA UPDATE COMPLETED");
  console.log("======================================");
  console.log("Downloaded candles:", downloaded.length);
  console.log("New candles added:", added);
  console.log("Total unique candles:", rows.length);
  console.log("First candle:", rows[0]?.date);
  console.log("Last candle:", rows.at(-1)?.date);
  console.log("CSV:", OUTPUT_FILE);
}

main().catch(error => {
  console.error("\nDATA UPDATE FAILED:", error.message);
  process.exitCode = 1;
});
