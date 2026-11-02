
"use client";

import { useState } from "react";

export default function OIBotPage() {
  const [timeframe, setTimeframe] = useState("15-30");

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">

      <div className="max-w-7xl mx-auto">

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-blue-400">
            🤖 OI Direction BOT
          </h1>

          <p className="text-slate-400 mt-2">
            NIFTY Options & Futures Intelligence
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

          <button
            onClick={() => setTimeframe("15-30")}
            className={`p-5 rounded-xl border text-left ${
              timeframe === "15-30"
                ? "bg-blue-600/20 border-blue-500"
                : "bg-slate-900 border-slate-700"
            }`}
          >
            <p className="text-slate-400 text-sm">
              Intraday Prediction
            </p>
            <h2 className="text-2xl font-bold mt-2">
              15–30 Minutes
            </h2>
          </button>

          <button
            onClick={() => setTimeframe("1-2")}
            className={`p-5 rounded-xl border text-left ${
              timeframe === "1-2"
                ? "bg-blue-600/20 border-blue-500"
                : "bg-slate-900 border-slate-700"
            }`}
          >
            <p className="text-slate-400 text-sm">
              Short-term Prediction
            </p>
            <h2 className="text-2xl font-bold mt-2">
              1–2 Hours
            </h2>
          </button>

        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 mb-6">

          <p className="text-slate-400 text-sm">
            Selected Timeframe
          </p>

          <h2 className="text-xl font-bold mt-2">
            {timeframe === "15-30"
              ? "15–30 Minutes"
              : "1–2 Hours"}
          </h2>

          <div className="mt-6 flex items-center justify-center min-h-32">
            <div className="text-center">
              <div className="text-3xl mb-3">⏳</div>

              <p className="text-yellow-400 font-semibold">
                Waiting for Live OI Intelligence
              </p>

              <p className="text-slate-500 text-sm mt-2">
                Signal generation will start after data validation.
              </p>
            </div>
          </div>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {[
            "NIFTY Futures OI",
            "Options CE / PE OI",
            "VWAP & Price Momentum",
          ].map((item) => (
            <div
              key={item}
              className="bg-slate-900 border border-slate-700 rounded-xl p-5"
            >
              <p className="text-slate-400 text-sm">{item}</p>
              <p className="text-yellow-400 font-semibold mt-3">
                Awaiting Data
              </p>
            </div>
          ))}

        </div>

        <p className="text-xs text-slate-500 mt-8">
          Signals will be enabled only after sufficient live data,
          timestamp validation and historical testing.
        </p>

      </div>

    </main>
  );
}
