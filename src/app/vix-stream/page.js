
"use client";

import { useState } from "react";

export default function VixStreamPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function startStream() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/zerodha/vix-stream/start",
        { method: "POST" }
      );

      const result = await response.json();

      setMessage(result.message || "Start request completed");

      if (!response.ok) {
        throw new Error(result.message);
      }

      await checkStatus();
    } catch (error) {
      setMessage(error.message || "Stream start failed");
    } finally {
      setLoading(false);
    }
  }

  async function checkStatus() {
    try {
      const response = await fetch(
        "/api/zerodha/vix-stream/status",
        { cache: "no-store" }
      );

      const result = await response.json();
      setData(result);

      if (!response.ok) {
        setMessage(result.message || "Status check failed");
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        <h1 className="text-3xl font-bold">
          Bhavish VIX Stream
        </h1>

        <p className="text-slate-400">
          Zerodha Kite Connect Live Market Stream
        </p>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={startStream}
            disabled={loading}
            className="bg-green-600 px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? "Starting..." : "Start VIX Stream"}
          </button>

          <button
            onClick={checkStatus}
            className="bg-blue-600 px-6 py-3 rounded-lg font-semibold"
          >
            Check Status
          </button>
        </div>

        {message && (
          <p className="text-yellow-400">{message}</p>
        )}

        {data && (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">

            <h2 className="text-xl font-semibold">
              Connection Status: {data.status}
            </h2>

            <p>
              Connected: {data.connected ? "YES" : "NO"}
            </p>

            <div className="grid grid-cols-2 gap-4">

              <div className="bg-slate-800 p-4 rounded-lg">
                <p className="text-slate-400">INDIA VIX</p>
                <h2 className="text-3xl font-bold">
                  {data.vix?.ltp ?? "--"}
                </h2>
                <p className="text-sm text-slate-400">
                  Change: {data.vix?.changePercent ?? "--"}%
                </p>
              </div>

              <div className="bg-slate-800 p-4 rounded-lg">
                <p className="text-slate-400">NIFTY 50</p>
                <h2 className="text-3xl font-bold">
                  {data.nifty?.ltp ?? "--"}
                </h2>
                <p className="text-sm text-slate-400">
                  Change: {data.nifty?.changePercent ?? "--"}%
                </p>
              </div>

            </div>

            <p className="text-xs text-slate-400">
              Last Update: {data.lastUpdate || "--"}
            </p>

            {data.error && (
              <p className="text-red-400">
                Error: {data.error}
              </p>
            )}

          </div>
        )}

      </div>
    </main>
  );
}
