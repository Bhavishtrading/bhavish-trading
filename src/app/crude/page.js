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
  const bhavishScore = data?.bhavishScore;

  const positive = price?.ltp >= price?.close;

  // =================================================
  // PCR CONTEXT
  // =================================================

  const pcrValue = Number(data?.pcr?.value);

  const pcrContext =
    !Number.isFinite(pcrValue)
      ? "NO DATA"
      : pcrValue > 1
      ? "BULLISH CONTEXT"
      : pcrValue < 0.7
      ? "BEARISH CONTEXT"
      : "BALANCED";

  const pcrContextClass =
    pcrContext === "BULLISH CONTEXT"
      ? "text-green-400"
      : pcrContext === "BEARISH CONTEXT"
      ? "text-red-400"
      : pcrContext === "BALANCED"
      ? "text-yellow-400"
      : "text-slate-400";

  const pcrContextBg =
    pcrContext === "BULLISH CONTEXT"
      ? "bg-green-950 border-green-800"
      : pcrContext === "BEARISH CONTEXT"
      ? "bg-red-950 border-red-800"
      : pcrContext === "BALANCED"
      ? "bg-yellow-950 border-yellow-800"
      : "bg-slate-900 border-slate-700";

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

        {/* PREVIOUS CLOSE */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <p className="text-slate-400">
            Previous Close
          </p>

          <h2 className="text-2xl font-bold text-white mt-2">
            ₹ {price?.close ?? "--"}
          </h2>
        </div>

        {/* VOLUME */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <p className="text-slate-400">
            Volume
          </p>

          <h2 className="text-2xl font-bold text-white mt-2">
            {price?.volume?.toLocaleString() ?? "--"}
          </h2>
        </div>

        {/* OPEN INTEREST */}
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
      {/* PCR INTELLIGENCE */}
      {/* ================================================= */}

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">

          <div>
            <h2 className="text-xl font-bold text-white">
              📊 PCR Intelligence
            </h2>

            <p className="text-slate-500 text-sm mt-1">
              Crude Oil Options Positioning
            </p>
          </div>

          {/* PCR VALUE */}
          <div className="text-left md:text-right">

            <p className="text-slate-400 text-sm">
              PCR
            </p>

            <p className="text-4xl font-bold text-white mt-1">
              {data?.pcr?.value != null
                ? Number(data.pcr.value).toFixed(2)
                : "--"}
            </p>

          </div>

        </div>

        {/* PCR CONTEXT */}
        <div className="mt-5">

          <div
            className={`border rounded-xl p-4 ${pcrContextBg}`}
          >

            <p className="text-slate-400 text-sm">
              PCR Context
            </p>

            <p className={`text-2xl font-bold mt-1 ${pcrContextClass}`}>
              {pcrContext}
            </p>

            <p className="text-slate-500 text-sm mt-2">
              {pcrContext === "BULLISH CONTEXT"
                ? "Put OI is relatively higher than Call OI."
                : pcrContext === "BEARISH CONTEXT"
                ? "Call OI is relatively higher than Put OI."
                : pcrContext === "BALANCED"
                ? "Put and Call OI relationship is relatively balanced."
                : "PCR data is currently unavailable."}
            </p>

          </div>

        </div>

        {/* PCR DETAILS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">

          {/* CE OI */}
          <div className="bg-slate-900 rounded-xl p-4">

            <p className="text-slate-500 text-sm">
              CE OI
            </p>

            <p className="text-xl font-bold text-white mt-2">
              {Number(
                data?.pcr?.ceOI ?? 0
              ).toLocaleString("en-IN")}
            </p>

          </div>

          {/* PE OI */}
          <div className="bg-slate-900 rounded-xl p-4">

            <p className="text-slate-500 text-sm">
              PE OI
            </p>

            <p className="text-xl font-bold text-white mt-2">
              {Number(
                data?.pcr?.peOI ?? 0
              ).toLocaleString("en-IN")}
            </p>

          </div>

          {/* EXPIRY */}
          <div className="bg-slate-900 rounded-xl p-4">

            <p className="text-slate-500 text-sm">
              Active Expiry
            </p>

            <p className="text-xl font-bold text-white mt-2">
              {data?.pcr?.expiry
                ? new Date(
                    data.pcr.expiry
                  ).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "--"}
            </p>

          </div>

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

          {/* ADX 14 */}

<div className="bg-slate-900 border border-slate-700 rounded-xl p-4">

  <p className="text-slate-400 text-sm">
    ADX 14
  </p>

  <p className="text-3xl font-bold text-white mt-2">
    {technical?.adx14 != null
      ? Number(technical.adx14).toFixed(2)
      : "--"}
  </p>

  <div className="mt-3 text-sm text-slate-400">
    +DI:{" "}
    {technical?.adxPlusDI != null
      ? Number(technical.adxPlusDI).toFixed(2)
      : "--"}
  </div>

  <div className="mt-2 text-sm text-slate-400">
    -DI:{" "}
    {technical?.adxMinusDI != null
      ? Number(technical.adxMinusDI).toFixed(2)
      : "--"}
  </div>

  <div
    className={`mt-3 font-bold ${
      technical?.adxDirection === "Bullish"
        ? "text-green-400"
        : technical?.adxDirection === "Bearish"
        ? "text-red-400"
        : "text-yellow-400"
    }`}
  >
    {technical?.adxDirection ?? "Neutral"}
  </div>

  <div className="mt-2 text-sm text-slate-400">
    {technical?.adxTrend ?? "Unknown"}
  </div>

</div>

          <Indicator
            title="ATR 14"
            value={technical?.atr14}
          />

        </div>

      </div>

      {/* ================================================= */}
      {/* SUPPORT / RESISTANCE INTELLIGENCE */}
      {/* ================================================= */}

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

            <p
              className={`text-xl font-bold ${
                data?.levels?.volumeConfirmed
                  ? "text-green-400"
                  : "text-yellow-400"
              }`}
            >
              {data?.levels?.volumeRatio ?? "--"}x
            </p>

          </div>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* BREAKOUT */}
          <div
            className={`rounded-xl p-5 border ${
              data?.levels?.breakout
                ? "border-green-500 bg-green-950"
                : data?.levels?.breakoutWatch
                ? "border-yellow-600 bg-yellow-950"
                : "border-slate-700 bg-slate-800"
            }`}
          >

            <p className="text-slate-400">
              Breakout
            </p>

            <h3
              className={`text-2xl font-bold mt-2 ${
                data?.levels?.breakout
                  ? "text-green-400"
                  : data?.levels?.breakoutWatch
                  ? "text-yellow-400"
                  : "text-slate-400"
              }`}
            >
              {data?.levels?.breakout
                ? "CONFIRMED"
                : data?.levels?.breakoutWatch
                ? "WATCH"
                : "NO SIGNAL"}
            </h3>

            <p className="text-slate-400 text-sm mt-3">
              Resistance: ₹{" "}
              {data?.levels?.resistance ?? "--"}
            </p>

            <p className="text-slate-400 text-sm mt-2">
              Breakout Reference: ₹{" "}
              {data?.levels?.breakoutReference ?? "--"}
            </p>

          </div>

          {/* VOLUME */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">

            <p className="text-slate-400">
              Volume Confirmation
            </p>

            <h3
              className={`text-2xl font-bold mt-2 ${
                data?.levels?.volumeConfirmed
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {data?.levels?.volumeConfirmed
                ? "CONFIRMED"
                : "NOT CONFIRMED"}
            </h3>

            <p className="text-slate-400 text-sm mt-3">
              Ratio:{" "}
              {data?.levels?.volumeRatio ?? "--"}x
            </p>

          </div>

          {/* BREAKDOWN */}
          <div
            className={`rounded-xl p-5 border ${
              data?.levels?.breakdown
                ? "border-red-500 bg-red-950"
                : data?.levels?.breakdownWatch
                ? "border-yellow-600 bg-yellow-950"
                : "border-slate-700 bg-slate-800"
            }`}
          >

            <p className="text-slate-400">
              Breakdown
            </p>

            <h3
              className={`text-2xl font-bold mt-2 ${
                data?.levels?.breakdown
                  ? "text-red-400"
                  : data?.levels?.breakdownWatch
                  ? "text-yellow-400"
                  : "text-slate-400"
              }`}
            >
              {data?.levels?.breakdown
                ? "CONFIRMED"
                : data?.levels?.breakdownWatch
                ? "WATCH"
                : "NO SIGNAL"}
            </h3>

            <p className="text-slate-400 text-sm mt-3">
              Support: ₹{" "}
              {data?.levels?.support ?? "--"}
            </p>

            <p className="text-slate-400 text-sm mt-2">
              Breakdown Reference: ₹{" "}
              {data?.levels?.breakdownReference ?? "--"}
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

      {/* ================================================= */}
      {/* MACD */}
      {/* ================================================= */}

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
      {/* EXISTING CRUDE OIL INTELLIGENCE */}
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
{/* CRUDE BHAVISH SCORE */}
{/* ================================================= */}

<div className="bg-slate-900 border border-cyan-800 rounded-xl p-6">

  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

    {/* SCORE */}

    <div>

      <p className="text-slate-400">
        🧠 Crude Bhavish Score
      </p>

      <h2
        className={`text-6xl font-bold mt-2 ${
          Number(bhavishScore?.score) > 0
            ? "text-green-400"
            : Number(bhavishScore?.score) < 0
            ? "text-red-400"
            : "text-yellow-400"
        }`}
      >
        {Number(bhavishScore?.score) > 0 ? "+" : ""}
        {bhavishScore?.score ?? "--"}

        <span className="text-2xl text-slate-500">
          {" "}/100
        </span>
      </h2>

      <p
        className={`text-2xl font-bold mt-2 ${
          bhavishScore?.score >= 25
            ? "text-green-400"
            : bhavishScore?.score <= -25
            ? "text-red-400"
            : "text-yellow-400"
        }`}
      >
        {bhavishScore?.state ?? "NEUTRAL"}
      </p>

    </div>


    {/* CONFIDENCE + ACTION */}

    <div className="text-left md:text-right">

      <p className="text-slate-400">
        Confidence
      </p>

      <p className="text-3xl font-bold text-white mt-2">
        {bhavishScore?.confidence ?? "--"}%
      </p>

      <p className="text-slate-400 mt-4">
        Action
      </p>

      <p className="text-xl font-bold text-cyan-400 mt-1">
        {bhavishScore?.action ?? "--"}
      </p>

    </div>

  </div>


  {/* SCORE FACTORS */}

  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-8">

    <ScoreFactor
      label="EMA"
      value={bhavishScore?.factors?.emaStructure}
    />

    <ScoreFactor
      label="MACD"
      value={bhavishScore?.factors?.macd}
    />

    <ScoreFactor
      label="RSI"
      value={bhavishScore?.factors?.rsi}
    />

    <ScoreFactor
      label="ADX"
      value={bhavishScore?.factors?.adx}
    />

    <ScoreFactor
      label="PCR"
      value={bhavishScore?.factors?.pcr}
    />

    <ScoreFactor
      label="Volume"
      value={bhavishScore?.factors?.volume}
    />

  </div>


  {/* SCORE REASONS */}

  <div className="mt-6">

    <p className="text-slate-400 text-sm uppercase tracking-wide">
      Score Factors
    </p>

    <div className="mt-3 space-y-2">

      {bhavishScore?.reasons?.map(
        (reason, index) => (

          <div
            key={index}
            className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-300 text-sm"
          >
            ✓ {reason}
          </div>

        )
      )}

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
function ScoreFactor({ label, value }) {

  const numeric = Number(value ?? 0);

  const color =
    numeric > 0
      ? "text-green-400"
      : numeric < 0
      ? "text-red-400"
      : "text-slate-400";

  return (

    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">

      <p className="text-slate-500 text-xs">
        {label}
      </p>

      <p className={`text-lg font-bold mt-1 ${color}`}>

        {numeric > 0 ? "+" : ""}

        {numeric}

      </p>

    </div>

  );
}
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