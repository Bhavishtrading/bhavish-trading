"use client";

import { useEffect, useState } from "react";

export default function CrudePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchData() {
    try {
      const response = await fetch("/api/crude/intelligence", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to fetch data");
      }

      setData(result.data);
      setError("");
    } catch (err) {
      console.error("CRUDE DASHBOARD ERROR:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, 10000);

    return () => clearInterval(interval);
  }, []);

  const price = data?.price;
  const technical = data?.technical;
  const intelligence = data?.intelligence;

  const positive = price?.ltp >= price?.close;

  if (loading && !data) {
    return (
      <div className="p-8 text-white">
        Loading Crude Oil Intelligence...
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          🛢️ Crude Oil Dashboard
        </h1>

        <p className="text-slate-400 mt-1">
          MCX Crude Oil Intelligence
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div className="bg-red-950 border border-red-700 rounded-xl p-4 text-red-300">
          {error}
        </div>
      )}

      {/* ================================================= */}
      {/* PRICE SECTION */}
      {/* ================================================= */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* LTP */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <p className="text-slate-400">
            Crude Oil LTP
          </p>

          <h2 className="text-3xl font-bold text-white mt-2">
            ₹ {price?.ltp ?? "--"}
          </h2>

          <p
            className={`mt-2 ${
              positive ? "text-green-400" : "text-red-400"
            }`}
          >
            {price?.close != null && price?.ltp != null
              ? `${positive ? "+" : ""}${(
                  price.ltp - price.close
                ).toFixed(2)}`
              : "--"}
          </p>
        </div>

        {/* OPEN */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <p className="text-slate-400">
            Open
          </p>

          <h2 className="text-3xl font-bold text-white mt-2">
            ₹ {price?.open ?? "--"}
          </h2>
        </div>

        {/* HIGH */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <p className="text-slate-400">
            Day High
          </p>

          <h2 className="text-3xl font-bold text-green-400 mt-2">
            ₹ {price?.high ?? "--"}
          </h2>
        </div>

        {/* LOW */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <p className="text-slate-400">
            Day Low
          </p>

          <h2 className="text-3xl font-bold text-red-400 mt-2">
            ₹ {price?.low ?? "--"}
          </h2>
        </div>

      </div>

      {/* ================================================= */}
      {/* MARKET DATA */}
      {/* ================================================= */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <p className="text-slate-400">
            Previous Close
          </p>

          <h2 className="text-2xl font-bold text-white mt-2">
            ₹ {price?.close ?? "--"}
          </h2>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <p className="text-slate-400">
            Volume
          </p>

          <h2 className="text-2xl font-bold text-white mt-2">
            {price?.volume?.toLocaleString() ?? "--"}
          </h2>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <p className="text-slate-400">
            Open Interest
          </p>

          <h2 className="text-2xl font-bold text-yellow-400 mt-2">
            {price?.oi?.toLocaleString() ?? "--"}
          </h2>
        </div>

      </div>

      {/* ================================================= */}
      {/* TECHNICAL INDICATORS */}
      {/* ================================================= */}

      <div>

        <h2 className="text-xl font-bold text-white mb-4">
          📊 Technical Indicators
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">

          <Indicator
            title="EMA 9"
            value={technical?.ema9}
          />

          <Indicator
            title="EMA 20"
            value={technical?.ema20}
          />

          <Indicator
            title="EMA 50"
            value={technical?.ema50}
          />

          <Indicator
            title="EMA 200"
            value={technical?.ema200}
          />

          <Indicator
            title="VWAP"
            value={technical?.vwap}
          />

          <Indicator
            title="RSI 14"
            value={technical?.rsi14}
          />

          <Indicator
            title="ADX 14"
            value={technical?.adx14}
          />

          <Indicator
            title="ATR 14"
            value={technical?.atr14}
          />

        </div>

      </div>

      {/* ================================================= */}
      {/* MACD */}
      {/* ================================================= */}
            {/* =====================================================
          SUPPORT / RESISTANCE INTELLIGENCE
      ====================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* SUPPORT */}
        <div className="bg-slate-900 border border-green-800 rounded-xl p-6">

          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400">
                🟢 Strong Support
              </p>

              <h2 className="text-4xl font-bold text-green-400 mt-2">
                ₹ {data?.levels?.support ?? "--"}
              </h2>
            </div>

            <div className="text-right">
              <p className="text-slate-400 text-sm">
                Strength
              </p>

              <p className="text-2xl font-bold text-white">
                {data?.levels?.supportStrength ?? "--"}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">

            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-slate-500 text-sm">
                Distance
              </p>

              <p className="text-white font-bold mt-1">
                ₹ {data?.levels?.supportDistance ?? "--"}
              </p>
            </div>

            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-slate-500 text-sm">
                Touches
              </p>

              <p className="text-white font-bold mt-1">
                {data?.levels?.supportTouches ?? "--"}
              </p>
            </div>

          </div>

        </div>


        {/* RESISTANCE */}
        <div className="bg-slate-900 border border-red-800 rounded-xl p-6">

          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400">
                🔴 Strong Resistance
              </p>

              <h2 className="text-4xl font-bold text-red-400 mt-2">
                ₹ {data?.levels?.resistance ?? "--"}
              </h2>
            </div>

            <div className="text-right">
              <p className="text-slate-400 text-sm">
                Strength
              </p>

              <p className="text-2xl font-bold text-white">
                {data?.levels?.resistanceStrength ?? "--"}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">

            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-slate-500 text-sm">
                Distance
              </p>

              <p className="text-white font-bold mt-1">
                ₹ {data?.levels?.resistanceDistance ?? "--"}
              </p>
            </div>

            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-slate-500 text-sm">
                Touches
              </p>

              <p className="text-white font-bold mt-1">
                {data?.levels?.resistanceTouches ?? "--"}
              </p>
            </div>

          </div>

        </div>

      </div>


      {/* =====================================================
          BREAKOUT / BREAKDOWN INTELLIGENCE
      ====================================================== */}

      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">

        <div className="flex items-center justify-between mb-6">

          <div>
            <h2 className="text-xl font-bold text-white">
              🚨 Breakout / Breakdown Intelligence
            </h2>

            <p className="text-slate-400 text-sm mt-1">
              Price + Candle Close + Volume confirmation
            </p>
          </div>

          <div className="text-right">

            <p className="text-slate-500 text-sm">
              Volume Ratio
            </p>

            <p className={`text-xl font-bold ${
              data?.levels?.volumeConfirmed
                ? "text-green-400"
                : "text-yellow-400"
            }`}>
              {data?.levels?.volumeRatio ?? "--"}x
            </p>

          </div>

        </div>


        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* BREAKOUT */}
          <div className={`rounded-xl p-5 border ${
            data?.levels?.breakout
              ? "border-green-500 bg-green-950"
              : data?.levels?.breakoutWatch
              ? "border-yellow-600 bg-yellow-950"
              : "border-slate-700 bg-slate-800"
          }`}>

            <p className="text-slate-400">
              Breakout
            </p>

            <h3 className={`text-2xl font-bold mt-2 ${
              data?.levels?.breakout
                ? "text-green-400"
                : data?.levels?.breakoutWatch
                ? "text-yellow-400"
                : "text-slate-400"
            }`}>

              {data?.levels?.breakout
                ? "CONFIRMED"
                : data?.levels?.breakoutWatch
                ? "WATCH"
                : "NO SIGNAL"}

            </h3>

            <p className="text-slate-400 text-sm mt-3">
              Resistance: ₹ {data?.levels?.resistance ?? "--"}
            </p>
            <p className="text-slate-400 text-sm mt-2">
  Breakout Reference: ₹ {data?.levels?.breakoutReference ?? "--"}
</p>

          </div>


          {/* VOLUME */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">

            <p className="text-slate-400">
              Volume Confirmation
            </p>

            <h3 className={`text-2xl font-bold mt-2 ${
              data?.levels?.volumeConfirmed
                ? "text-green-400"
                : "text-red-400"
            }`}>

              {data?.levels?.volumeConfirmed
                ? "CONFIRMED"
                : "NOT CONFIRMED"}

            </h3>

            <p className="text-slate-400 text-sm mt-3">
              Ratio: {data?.levels?.volumeRatio ?? "--"}x
            </p>

          </div>


          {/* BREAKDOWN */}
          <div className={`rounded-xl p-5 border ${
            data?.levels?.breakdown
              ? "border-red-500 bg-red-950"
              : data?.levels?.breakdownWatch
              ? "border-yellow-600 bg-yellow-950"
              : "border-slate-700 bg-slate-800"
          }`}>

            <p className="text-slate-400">
              Breakdown
            </p>

            <h3 className={`text-2xl font-bold mt-2 ${
              data?.levels?.breakdown
                ? "text-red-400"
                : data?.levels?.breakdownWatch
                ? "text-yellow-400"
                : "text-slate-400"
            }`}>

              {data?.levels?.breakdown
                ? "CONFIRMED"
                : data?.levels?.breakdownWatch
                ? "WATCH"
                : "NO SIGNAL"}

            </h3>

            <p className="text-slate-400 text-sm mt-3">
              Support: ₹ {data?.levels?.support ?? "--"}
            </p>
            <p className="text-slate-400 text-sm mt-2">
  Breakdown Reference: ₹ {data?.levels?.breakdownReference ?? "--"}
</p>

          </div>

        </div>


        {/* CANDLE DATA */}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">

          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-slate-500 text-sm">
              Previous High
            </p>

            <p className="text-white font-bold mt-1">
              ₹ {data?.levels?.previousHigh ?? "--"}
            </p>
          </div>

          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-slate-500 text-sm">
              Previous Low
            </p>

            <p className="text-white font-bold mt-1">
              ₹ {data?.levels?.previousLow ?? "--"}
            </p>
          </div>

          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-slate-500 text-sm">
              Latest Close
            </p>

            <p className="text-white font-bold mt-1">
              ₹ {data?.levels?.latestClose ?? "--"}
            </p>
          </div>

          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-slate-500 text-sm">
              Range Position
            </p>

            <p className="text-yellow-400 font-bold mt-1">
              {data?.levels?.rangePosition ?? "--"}%
            </p>
          </div>

        </div>

      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">

        <p className="text-slate-400">
          MACD
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">

          <div>
            <p className="text-slate-500 text-sm">
              MACD
            </p>

            <p className="text-xl font-bold text-white">
              {technical?.macd?.macd?.toFixed(2) ?? "--"}
            </p>
          </div>

          <div>
            <p className="text-slate-500 text-sm">
              Signal
            </p>

            <p className="text-xl font-bold text-white">
              {technical?.macd?.signal?.toFixed(2) ?? "--"}
            </p>
          </div>

          <div>
            <p className="text-slate-500 text-sm">
              Histogram
            </p>

            <p
              className={`text-xl font-bold ${
                technical?.macd?.histogram >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {technical?.macd?.histogram?.toFixed(2) ?? "--"}
            </p>
          </div>

        </div>

      </div>

      {/* ================================================= */}
      {/* INTELLIGENCE */}
      {/* ================================================= */}

      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

          <div>
            <p className="text-slate-400">
              Crude Oil Intelligence Score
            </p>

            <h2 className="text-6xl font-bold text-yellow-400 mt-2">
              {intelligence?.score ?? "--"}
              <span className="text-2xl text-slate-500">
                /100
              </span>
            </h2>
          </div>

          <div className="text-left md:text-right">

            <p className="text-slate-400">
              Market Bias
            </p>

            <h2
              className={`text-3xl font-bold mt-2 ${
                intelligence?.bias === "BULLISH"
                  ? "text-green-400"
                  : intelligence?.bias === "BEARISH"
                  ? "text-red-400"
                  : "text-yellow-400"
              }`}
            >
              {intelligence?.bias ?? "--"}
            </h2>

          </div>

        </div>

        {/* DETAILS */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">

          <div>
            <p className="text-slate-400">
              Confidence
            </p>

            <p className="text-2xl font-bold text-white mt-1">
              {intelligence?.confidence ?? "--"}%
            </p>
          </div>

          <div>
            <p className="text-slate-400">
              Trend Strength
            </p>

            <p className="text-2xl font-bold text-yellow-400 mt-1">
              {intelligence?.trendStrength ?? "--"}
            </p>
          </div>

          <div>
            <p className="text-slate-400">
              Suggested Action
            </p>

            <p className="text-2xl font-bold text-white mt-1">
              {intelligence?.action ?? "--"}
            </p>
          </div>

        </div>

      </div>

      {/* ================================================= */}
      {/* REASONS */}
      {/* ================================================= */}

      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">

        <h2 className="text-xl font-bold text-white">
          🧠 Intelligence Reasons
        </h2>

        <div className="mt-4 space-y-3">

          {intelligence?.reasons?.map(
            (reason, index) => (
              <div
                key={index}
                className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-300"
              >
                ✓ {reason}
              </div>
            )
          )}

        </div>

      </div>

      {/* ================================================= */}
      {/* CONTRACT */}
      {/* ================================================= */}

      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">

        <p className="text-slate-400">
          Active Contract
        </p>

        <h2 className="text-2xl font-bold text-white mt-2">
          {data?.tradingsymbol ?? "--"}
        </h2>

      </div>

    </div>
  );
}


/* ===================================================== */
/* INDICATOR COMPONENT */
/* ===================================================== */

function Indicator({ title, value }) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">

      <p className="text-slate-400 text-sm">
        {title}
      </p>

      <p className="text-xl font-bold text-white mt-2">
        {value != null
          ? Number(value).toFixed(2)
          : "--"}
      </p>

    </div>
  );
}