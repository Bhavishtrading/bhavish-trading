"use client";

import { useEffect, useState } from "react";

export default function SilverPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchSilverData() {
    try {
      const response = await fetch(
        "/api/silver/score",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      const result =
        await response.json();

      if (!result.success) {
        throw new Error(
          result.error ||
          "Silver data unavailable"
        );
      }

      setData(result);
      setError("");

    } catch (err) {
      console.error(
        "SILVER DASHBOARD ERROR:",
        err
      );

      setError(
        err.message ||
        "Failed to load Silver data"
      );

    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSilverData();

    const interval =
      setInterval(
        fetchSilverData,
        10000
      );

    return () =>
      clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-cyan-400">
            🥈 Silver Mini Intelligence
          </h1>

          <div className="mt-8 bg-slate-800 rounded-xl p-6 border border-slate-700">
            Loading Silver Mini market data...
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-cyan-400">
            🥈 Silver Mini Intelligence
          </h1>

          <div className="mt-8 bg-red-950 rounded-xl p-6 border border-red-800 text-red-300">
            {error}
          </div>
        </div>
      </div>
    );
  }

  const technical =
    data?.technical || {};

  const ema =
    technical.ema || {};

  const macd =
    technical.macd || {};

  const rsi =
    technical.rsi || {};

  const adx =
    technical.adx || {};

  const volume =
    technical.volume || {};

  const score =
    data?.bhavishScore || {};

  const factors =
    score.factors || {};

  const pcr =
    data?.pcr || {};

  const scoreValue =
    Number(score.score ?? 0);

  const scoreColor =
    scoreValue >= 80
      ? "text-green-400"
      : scoreValue <= -80
      ? "text-red-400"
      : "text-yellow-400";

  const scoreIcon =
    scoreValue >= 80
      ? "🟢"
      : scoreValue <= -80
      ? "🔴"
      : "🟡";

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-8">

      <div className="max-w-7xl mx-auto">

        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          <div>
            <h1 className="text-3xl font-bold text-cyan-400">
              🥈 Silver Mini Intelligence
            </h1>

            <p className="mt-2 text-gray-400">
              SILVERM • 5 Minute Live Analysis
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3">

            <div className="text-xs text-gray-500">
              CONTRACT
            </div>

            <div className="font-semibold text-white">
              {data?.contract || "-"}
            </div>

          </div>

        </div>


        {/* ================================================= */}
        {/* LIVE PRICE */}
        {/* ================================================= */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">

          <Card
            title="SILVERM"
            value={
              data?.price != null
                ? `₹${Number(
                    data.price
                  ).toLocaleString("en-IN")}`
                : "-"
            }
            subtitle="Live Price"
            valueColor="text-cyan-400"
          />

          <Card
            title="EMA STRUCTURE"
            value={
              ema.structureScore != null
                ? `${
                    ema.structureScore > 0
                      ? "+"
                      : ""
                  }${ema.structureScore}`
                : "-"
            }
            subtitle={
              ema.structure ||
              "Unknown"
            }
            valueColor={
              Number(
                ema.structureScore
              ) > 0
                ? "text-green-400"
                : Number(
                    ema.structureScore
                  ) < 0
                ? "text-red-400"
                : "text-yellow-400"
            }
          />

          <Card
            title="TIMEFRAME"
            value="5M"
            subtitle="Live Technical Data"
            valueColor="text-white"
          />

        </div>


        {/* ================================================= */}
        {/* BHAVISH SCORE */}
        {/* ================================================= */}

        <div className="mt-6 bg-slate-800 rounded-xl p-6 border border-slate-700">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div>

              <h2 className="text-gray-400 text-sm uppercase tracking-wide">
                🧠 SILVER MINI BHAVISH SCORE
              </h2>

              <div
                className={`mt-3 text-5xl font-bold ${scoreColor}`}
              >
                {scoreValue > 0
                  ? "+"
                  : ""}
                {scoreValue}
              </div>

              <div
                className={`mt-2 text-lg font-bold ${scoreColor}`}
              >
                {scoreIcon}{" "}
                {score.state ||
                  "NEUTRAL"}
              </div>

            </div>


            <div className="text-left md:text-right">

              <div className="text-gray-400 text-sm">
                Action
              </div>

              <div
                className={`text-2xl font-bold ${
                  score.action ===
                  "BUY CE"
                    ? "text-green-400"
                    : score.action ===
                      "BUY PE"
                    ? "text-red-400"
                    : "text-yellow-400"
                }`}
              >
                {score.action ||
                  "NO TRADE"}
              </div>

              <div className="mt-2 text-xs text-gray-500">
                Range: -100 to +100
              </div>

            </div>

          </div>


          {/* SCORE FACTORS */}

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-6">

            <Factor
              label="EMA"
              value={
                factors.emaStructure
              }
            />

            <Factor
              label="MACD"
              value={
                factors.macd
              }
            />

            <Factor
              label="RSI"
              value={
                factors.rsi
              }
            />

            <Factor
              label="ADX"
              value={
                factors.adx
              }
            />

            <Factor
              label="PCR"
              value={
                factors.pcr
              }
            />

            <Factor
              label="Volume"
              value={
                factors.volume
              }
            />

          </div>

        </div>


        {/* ================================================= */}
        {/* TECHNICAL INDICATORS */}
        {/* ================================================= */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">

          <Card
            title="EMA 9"
            value={
              ema.ema9 != null
                ? Number(
                    ema.ema9
                  ).toFixed(2)
                : "-"
            }
            subtitle="5M"
          />

          <Card
            title="EMA 20"
            value={
              ema.ema20 != null
                ? Number(
                    ema.ema20
                  ).toFixed(2)
                : "-"
            }
            subtitle="5M"
          />

          <Card
            title="EMA 50"
            value={
              ema.ema50 != null
                ? Number(
                    ema.ema50
                  ).toFixed(2)
                : "-"
            }
            subtitle="5M"
          />

          <Card
            title="RSI 14"
            value={
              rsi.value != null
                ? Number(
                    rsi.value
                  ).toFixed(2)
                : "-"
            }
            subtitle={
              rsi.trend ||
              "5M"
            }
          />

        </div>


        {/* ================================================= */}
        {/* MACD / ADX / VOLUME / PCR */}
        {/* ================================================= */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">


          {/* ================================================= */}
          {/* MACD */}
          {/* ================================================= */}

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">

            <h2 className="text-gray-400 text-sm uppercase">
              MACD 12 / 26 / 9
            </h2>

            <div className="mt-4 text-2xl font-bold">
              MACD:{" "}
              {macd.macd != null
                ? Number(
                    macd.macd
                  ).toFixed(2)
                : "-"}
            </div>

            <div className="mt-2 text-sm text-gray-400">
              Signal:{" "}
              {macd.signal != null
                ? Number(
                    macd.signal
                  ).toFixed(2)
                : "-"}
            </div>

            <div className="mt-2 text-sm text-gray-400">
              Histogram:{" "}
              {macd.histogram != null
                ? Number(
                    macd.histogram
                  ).toFixed(2)
                : "-"}
            </div>

            <div
              className={`mt-4 font-bold ${
                macd.trend ===
                "Bullish"
                  ? "text-green-400"
                  : macd.trend ===
                    "Bearish"
                  ? "text-red-400"
                  : "text-yellow-400"
              }`}
            >
              {macd.trend ||
                "Neutral"}
            </div>

          </div>


          {/* ================================================= */}
          {/* ADX */}
          {/* ================================================= */}

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">

            <h2 className="text-gray-400 text-sm uppercase">
              ADX 14
            </h2>

            <div className="mt-4 text-3xl font-bold">
              {adx.value != null
                ? Number(
                    adx.value
                  ).toFixed(2)
                : "-"}
            </div>

            <div className="mt-3 text-sm text-gray-400">
              +DI:{" "}
              {adx.plusDI != null
                ? Number(
                    adx.plusDI
                  ).toFixed(2)
                : "-"}
            </div>

            <div className="mt-2 text-sm text-gray-400">
              -DI:{" "}
              {adx.minusDI != null
                ? Number(
                    adx.minusDI
                  ).toFixed(2)
                : "-"}
            </div>

            <div
              className={`mt-4 font-bold ${
                adx.direction ===
                "Bullish"
                  ? "text-green-400"
                  : adx.direction ===
                    "Bearish"
                  ? "text-red-400"
                  : "text-yellow-400"
              }`}
            >
              {adx.direction ||
                "Neutral"}
            </div>

            <div className="mt-2 text-sm text-gray-400">
              {adx.trend ||
                "Unknown"}
            </div>

          </div>


          {/* ================================================= */}
          {/* VOLUME */}
          {/* ================================================= */}

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">

            <h2 className="text-gray-400 text-sm uppercase">
              VOLUME 5M
            </h2>

            <div className="mt-4 text-3xl font-bold">
              {volume.current ??
                "-"}
            </div>

            <div className="mt-3 text-sm text-gray-400">
              Average:{" "}
              {volume.average != null
                ? Number(
                    volume.average
                  ).toFixed(2)
                : "-"}
            </div>

            <div className="mt-2 text-sm text-gray-400">
              Ratio:{" "}
              {volume.ratio != null
                ? Number(
                    volume.ratio
                  ).toFixed(2)
                : "-"}
            </div>

          </div>


          {/* ================================================= */}
          {/* SILVERM PCR */}
          {/* ================================================= */}

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">

            <h2 className="text-gray-400 text-sm uppercase">
              SILVERM PCR
            </h2>

            <div className="mt-4 text-3xl font-bold text-cyan-400">
              {pcr.value != null
                ? Number(
                    pcr.value
                  ).toFixed(2)
                : "-"}
            </div>

            <div className="mt-3 text-sm text-gray-400">
              CE OI:{" "}
              {pcr.ceOI != null
                ? Number(
                    pcr.ceOI
                  ).toLocaleString(
                    "en-IN"
                  )
                : "-"}
            </div>

            <div className="mt-2 text-sm text-gray-400">
              PE OI:{" "}
              {pcr.peOI != null
                ? Number(
                    pcr.peOI
                  ).toLocaleString(
                    "en-IN"
                  )
                : "-"}
            </div>

            <div className="mt-3 text-xs text-gray-500">
              Expiry:{" "}
              {pcr.expiry || "-"}
            </div>

          </div>

        </div>


        {/* ================================================= */}
        {/* STATUS */}
        {/* ================================================= */}

        <div className="mt-6 text-xs text-gray-500 text-center">
          SILVERM • 5M Live • Auto refresh every 10 seconds
        </div>

      </div>
    </div>
  );
}


// =====================================================
// CARD
// =====================================================

function Card({
  title,
  value,
  subtitle,
  valueColor = "text-white",
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">

      <h2 className="text-gray-400 text-sm uppercase tracking-wide">
        {title}
      </h2>

      <div
        className={`mt-4 text-2xl font-bold ${valueColor}`}
      >
        {value}
      </div>

      <div className="mt-2 text-sm text-gray-500">
        {subtitle}
      </div>

    </div>
  );
}


// =====================================================
// FACTOR
// =====================================================

function Factor({
  label,
  value,
}) {
  const numeric =
    Number(value ?? 0);

  const color =
    numeric > 0
      ? "text-green-400"
      : numeric < 0
      ? "text-red-400"
      : "text-gray-400";

  return (
    <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">

      <div className="text-xs text-gray-500">
        {label}
      </div>

      <div
        className={`mt-1 font-bold ${color}`}
      >
        {numeric > 0
          ? "+"
          : ""}
        {numeric}
      </div>

    </div>
  );
}