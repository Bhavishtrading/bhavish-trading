
import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { getKiteClient } from "@/services/zerodha/client";
import { getAccessToken } from "@/services/zerodha/session";
import { NIFTY50_STOCKS } from "@/services/zerodha/nifty50Sectors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function formatDate(date) {
  const pad = (n) => String(n).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function toCsv(candles) {
  const header = "timestamp,open,high,low,close,volume";

  const rows = candles.map((candle) => [
    candle.date,
    candle.open,
    candle.high,
    candle.low,
    candle.close,
    candle.volume,
  ].join(","));

  return [header, ...rows].join("\n");
}

export async function POST(request) {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "Zerodha login required" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const months = Number(body.months ?? 6);

    if (!Number.isInteger(months) || months < 1 || months > 12) {
      return NextResponse.json(
        { success: false, error: "Months must be between 1 and 12" },
        { status: 400 }
      );
    }

    const to = new Date();
    to.setHours(15, 30, 0, 0);

    const from = new Date(to);
    from.setMonth(from.getMonth() - months);
    from.setHours(9, 15, 0, 0);

    const kite = getKiteClient();
    kite.setAccessToken(accessToken);

    console.log("Downloading NSE instrument master...");

    const instruments = await kite.getInstruments("NSE");

    const instrumentMap = new Map(
      instruments.map((item) => [item.tradingsymbol, item])
    );

    const outputDir = path.join(
      process.cwd(),
      "data",
      "nifty50-history"
    );

    await mkdir(outputDir, { recursive: true });

    const report = {
      interval: "5minute",
      from: formatDate(from),
      to: formatDate(to),
      totalStocks: NIFTY50_STOCKS.length,
      downloaded: 0,
      failed: 0,
      results: [],
    };

    for (const stock of NIFTY50_STOCKS) {
      const symbol = stock.symbol;

      try {
        const instrument = instrumentMap.get(symbol);

        if (!instrument) {
          throw new Error(`NSE instrument not found for ${symbol}`);
        }

        console.log(`Downloading ${symbol}...`);

        // Download historical candles in 90-day chunks
const allCandles = [];

let chunkStart = new Date(from);

while (chunkStart < to) {
  const chunkEnd = new Date(
    Math.min(
      chunkStart.getTime() + 89 * 24 * 60 * 60 * 1000,
      to.getTime()
    )
  );

  console.log(
    `${symbol}: ${formatDate(chunkStart)} to ${formatDate(chunkEnd)}`
  );

  const chunkCandles = await kite.getHistoricalData(
    instrument.instrument_token,
    "5minute",
    formatDate(chunkStart),
    formatDate(chunkEnd),
    false,
    false
  );

  allCandles.push(...(chunkCandles || []));

  // Move forward without overlapping the previous chunk
  chunkStart = new Date(chunkEnd.getTime() + 1000);

  await sleep(300);
}

// Remove duplicate timestamps and sort candles
const uniqueCandles = Array.from(
  new Map(
    allCandles.map((candle) => [
      new Date(candle.date).getTime(),
      candle,
    ])
  ).values()
).sort(
  (a, b) =>
    new Date(a.date).getTime() -
    new Date(b.date).getTime()
);

const candles = uniqueCandles;

        const csv = toCsv(candles || []);

        const filePath = path.join(
          outputDir,
          `${symbol}.csv`
        );

        await writeFile(filePath, csv, "utf8");

        report.downloaded++;

        report.results.push({
          symbol,
          instrumentToken: instrument.instrument_token,
          candles: candles?.length || 0,
          status: "success",
        });

        console.log(
          `${symbol}: ${candles?.length || 0} candles saved`
        );
      } catch (error) {
        report.failed++;

        report.results.push({
          symbol,
          status: "failed",
          error: error.message,
        });

        console.error(`Failed ${symbol}:`, error.message);
      }

      // Keep requests sequential and avoid bursts.
      await sleep(400);
    }

    await writeFile(
      path.join(outputDir, "download-report.json"),
      JSON.stringify(report, null, 2),
      "utf8"
    );

    return NextResponse.json({
      success: true,
      message: "NIFTY 50 historical download completed",
      report,
      folder: "data/nifty50-history",
    });
  } catch (error) {
    console.error("NIFTY 50 HISTORY DOWNLOAD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Historical download failed",
      },
      { status: 500 }
    );
  }
}
