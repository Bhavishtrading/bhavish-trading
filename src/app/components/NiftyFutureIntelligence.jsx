
"use client";

import { useEffect, useState } from "react";

function formatValue(value, digits = 2) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "--";
}

function Status({ value }) {
  const text = String(value ?? "UNAVAILABLE");
  const color =
    text.includes("BULLISH") || text.includes("Above")
      ? "text-green-400"
      : text.includes("BEARISH") || text.includes("Below")
        ? "text-red-400"
        : "text-yellow-400";

  return (
    <span className={`text-xs font-semibold ${color}`}>
      {text.replaceAll("_", " ")}
    </span>
  );
}

function Metric({ label, value, status }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-bold text-white">
        {value}
      </p>
      {status && (
        <div className="mt-1">
          <Status value={status} />
        </div>
      )}
    </div>
  );
}

export default function NiftyFutureIntelligence() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function fetchIntelligence() {
      try {
        const response = await fetch(
          "/api/trend-intelligence",
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const json = await response.json();

        if (!json.success || !json.analysis?.success) {
          throw new Error(
            json.message || "Futures intelligence unavailable"
          );
        }

        if (active) {
          setResult(json);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load Futures data");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchIntelligence();

    // Refresh once per minute
    const timer = setInterval(fetchIntelligence, 60000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  if (loading) {
    return (
      <div className="mt-6 rounded-xl border border-slate-700 bg-slate-800 p-6 text-slate-300">
        Loading NIFTY Futures Intelligence...
      </div>
    );
  }

  if (error && !result) {
    return (
      <div className="mt-6 rounded-xl border border-red-800 bg-slate-800 p-5">
        <h2 className="font-bold text-red-400">
          NIFTY Futures Intelligence
        </h2>
        <p className="mt-2 text-sm text-slate-300">{error}</p>
      </div>
    );
  }

  const technical = result?.futuresTechnical || {};
  const analysis = result?.analysis || {};
  const indicators = analysis.indicators || {};
  const futures = analysis.futures || {};
  const market = analysis.market || {};
  const ema = indicators.ema || {};
  const vwap = technical.vwap || {};
  const macd = indicators.macd || {};
  const rsi = indicators.rsi || {};
  const adx = indicators.adx || {};
  const atr = indicators.atr || {};
  const volume = technical.volume || {};

  const timestamp = technical.lastCandle?.timestamp
    ? new Date(technical.lastCandle.timestamp).toLocaleString(
        "en-IN",
        {
          timeZone: "Asia/Kolkata",
          dateStyle: "medium",
          timeStyle: "short",
        }
      )
    : "--";

  return (
    <section className="mt-6 w-full min-w-0 rounded-xl border border-cyan-800/70 bg-slate-800 p-5 shadow-lg md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">
            NIFTY FUTURES INTELLIGENCE
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Zerodha Live Futures Technical Analysis · 5 Minute
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {technical.contract || "--"} · Last candle: {timestamp}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-md bg-slate-900 px-3 py-2 text-xs text-green-400">
            LIVE DATA
          </span>
          <span className="rounded-md bg-slate-900 px-3 py-2 text-xs text-slate-300">
            {technical.candleCount ?? 0} Candles
          </span>
        </div>
      </div>

      {error && (
        <p className="mb-4 text-xs text-yellow-400">
          Refresh warning: {error}. Showing last successful data.
        </p>
      )}

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">MARKET DIRECTION</p>
          <p className={`mt-2 text-2xl font-bold ${
            market.direction === "BULLISH"
              ? "text-green-400"
              : market.direction === "BEARISH"
                ? "text-red-400"
                : "text-yellow-400"
          }`}>
            {market.direction || "--"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Strength: {formatValue(market.trendStrength)}%
          </p>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">FUTURES PRICE</p>
          <p className="mt-2 text-2xl font-bold text-white">
            {formatValue(technical.currentPrice)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {technical.contract || "--"}
          </p>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">SUSTAINABILITY</p>
          <p className="mt-2 text-xl font-bold text-yellow-400">
            {market.sustainability || "--"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Entry: {market.entryStatus || "--"}
          </p>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">FUTURES VWAP</p>
          <p className="mt-2 text-2xl font-bold text-white">
            {formatValue(vwap.value)}
          </p>
          <Status value={vwap.trend} />
        </div>
      </div>

      <h3 className="mb-3 text-sm font-bold tracking-wide text-cyan-400">
        FUTURES TECHNICAL INDICATORS
      </h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="EMA 9"
          value={formatValue(ema.ema9)}
        />
        <Metric
          label="EMA 20"
          value={formatValue(ema.ema20)}
        />
        <Metric
          label="EMA 50"
          value={formatValue(ema.ema50)}
        />
        <Metric
          label="EMA 200"
          value={formatValue(ema.ema200)}
        />

        <Metric
          label="MACD Histogram"
          value={formatValue(macd.histogram, 3)}
          status={macd.trend}
        />
        <Metric
          label="RSI"
          value={formatValue(rsi.value)}
          status={rsi.trend}
        />
        <Metric
          label="ADX"
          value={formatValue(adx.adx)}
          status={adx.strength}
        />
        <Metric
          label="ATR"
          value={formatValue(atr.value)}
          status={atr.volatility}
        />
      </div>

      <h3 className="mb-3 mt-6 text-sm font-bold tracking-wide text-cyan-400">
        VWAP BANDS & MARKET PARTICIPATION
      </h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="VWAP Upper 1 SD"
          value={formatValue(vwap.upper1)}
        />
        <Metric
          label="VWAP Lower 1 SD"
          value={formatValue(vwap.lower1)}
        />
        <Metric
          label="VWAP Upper 2 SD"
          value={formatValue(vwap.upper2)}
        />
        <Metric
          label="VWAP Lower 2 SD"
          value={formatValue(vwap.lower2)}
        />

        <Metric
          label="Futures Volume"
          value={Number(volume.current || 0).toLocaleString("en-IN")}
        />
        <Metric
          label="Volume Ratio"
          value={`${formatValue(volume.ratio)}x`}
          status={volume.status}
        />
        <Metric
          label="OI Change %"
          value={`${formatValue(futures.oiChangePercent)}%`}
          status={futures.marketPosition}
        />
        <Metric
          label="Relative Volume"
          value={`${formatValue(futures.relativeVolume)}x`}
          status={futures.hasElevatedVolume ? "Elevated" : "Normal"}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 pt-4">
        <div className="text-xs text-slate-400">
          Spot Market Structure:{" "}
          <Status value={indicators.structure} />
        </div>

        <div className="text-xs text-slate-400">
          Timestamp Alignment:{" "}
          <Status
            value={
              analysis.diagnostics?.futuresTimestampsAligned
                ? "ALIGNED"
                : "NOT ALIGNED"
            }
          />
        </div>
      </div>
    </section>
  );
}
