
"use client";

import { useEffect, useState } from "react";

export default function VixIntelligenceCard() {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("Connecting to Zerodha...");
  const [loading, setLoading] = useState(true);

  // LIVE DATA FETCH - EXISTING API LOGIC PRESERVED
  useEffect(() => {
    let active = true;

    async function checkStatus() {
      try {
        const response = await fetch(
          "/api/zerodha/vix-stream/status",
          {
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok || result.success === false) {
          throw new Error(
            result.message || "Status check failed"
          );
        }

        if (active) {
          setData(result);
          setMessage("");
          setLoading(false);
        }
      } catch (error) {
        if (active) {
          setMessage(error.message);
          setLoading(false);
        }
      }
    }

    async function initializeStream() {
      try {
        await fetch(
          "/api/zerodha/vix-stream/start",
          {
            method: "POST",
          }
        );
      } catch (error) {
        console.error("VIX stream start error:", error);
      }

      if (active) {
        await checkStatus();
      }
    }

    initializeStream();

    const interval = setInterval(checkStatus, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // LIVE DATA EXTRACTION
  const vix = data?.vix;
  const nifty = data?.nifty;

  const connected =
    data?.connected === true &&
    data?.status === "connected";

  // FORMATTING HELPERS
  function formatNumber(value, digits = 2) {
    if (value === null || value === undefined) {
      return "--";
    }

    const number = Number(value);

    return Number.isFinite(number)
      ? number.toFixed(digits)
      : "--";
  }

  function getChangeColor(value) {
    if (Number(value) > 0) {
      return "text-emerald-400";
    }

    if (Number(value) < 0) {
      return "text-rose-400";
    }

    return "text-slate-400";
  }

  return (
    <section className="rounded-2xl border border-slate-700/70 bg-[#111C2B] p-5 shadow-lg transition-all duration-300 hover:border-cyan-500/40 md:p-6">

      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h2 className="text-lg font-bold text-white md:text-xl">
            📊 Bhavish VIX Intelligence
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Zerodha Kite Connect | Live Volatility Analysis
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              connected
                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                : "bg-rose-400"
            }`}
          />

          <span
            className={`text-xs font-semibold ${
              connected
                ? "text-emerald-400"
                : "text-rose-400"
            }`}
          >
            {data?.status?.toUpperCase() || "CONNECTING"}
          </span>
        </div>

      </div>

      {/* LIVE MARKET PRICES */}

      {loading && !data ? (
        <p className="mt-6 text-sm text-slate-400">
          Connecting to live market stream...
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">

          {/* INDIA VIX */}

          <div className="rounded-xl border border-slate-700/70 bg-[#0D1727] p-5 transition-all duration-300 hover:border-cyan-500/40">

            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              INDIA VIX
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
              {formatNumber(vix?.ltp)}
            </p>

            <p
              className={`mt-3 text-sm font-semibold ${getChangeColor(
                vix?.changePercent
              )}`}
            >
              {formatNumber(vix?.changePercent)}%

              <span className="ml-2 font-normal text-slate-500">
                vs previous close
              </span>
            </p>

          </div>

          {/* NIFTY 50 */}

          <div className="rounded-xl border border-slate-700/70 bg-[#0D1727] p-5 transition-all duration-300 hover:border-cyan-500/40">

            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              NIFTY 50
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
              {formatNumber(nifty?.ltp)}
            </p>

            <p
              className={`mt-3 text-sm font-semibold ${getChangeColor(
                nifty?.changePercent
              )}`}
            >
              {formatNumber(nifty?.changePercent)}%

              <span className="ml-2 font-normal text-slate-500">
                vs previous close
              </span>
            </p>

          </div>

        </div>
      )}

      {/* ERROR MESSAGE */}

      {message && (
        <p className="mt-4 text-xs text-amber-400">
          {message}
        </p>
      )}

      {data?.error && (
        <p className="mt-2 text-xs text-rose-400">
          Stream Error: {data.error}
        </p>
      )}

    </section>
  );
}
