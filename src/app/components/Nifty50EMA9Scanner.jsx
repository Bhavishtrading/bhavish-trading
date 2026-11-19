
"use client";

import { useEffect, useState } from "react";

export default function Nifty50EMA9Scanner() {
  const [stocks, setStocks] = useState([]);
  const [summary, setSummary] = useState({
    above: 0,
    below: 0,
    atEMA: 0,
    waiting: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  async function fetchEMAData() {
    try {
      const response = await fetch(
        "/api/nifty50-ema9",
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "EMA9 data unavailable"
        );
      }

      setStocks(result.stocks || []);

      setSummary({
        above: result.above || 0,
        below: result.below || 0,
        atEMA: result.atEMA || 0,
        waiting: result.waiting || 0,
      });

      setLastUpdated(new Date());
      setError("");
    } catch (err) {
      console.error("EMA9 SCANNER ERROR:", err);
      setError(err.message || "Unable to load EMA9");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEMAData();

    const interval = setInterval(
      fetchEMAData,
      10000
    );

    return () => clearInterval(interval);
  }, []);

  function formatPrice(value) {
    if (value === null || value === undefined) {
      return "--";
    }

    return Number(value).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const readyStocks = stocks.filter(
    (stock) =>
      stock.position === "ABOVE" ||
      stock.position === "BELOW" ||
      stock.position === "AT"
  );

  const scannerStocks = [...readyStocks, ...readyStocks];

  function getPositionStyle(position) {
    if (position === "ABOVE") {
      return {
        border: "border-green-500/40",
        background: "bg-green-500/10",
        text: "text-green-400",
        label: "ABOVE EMA9",
      };
    }

    if (position === "BELOW") {
      return {
        border: "border-red-500/40",
        background: "bg-red-500/10",
        text: "text-red-400",
        label: "BELOW EMA9",
      };
    }

    return {
      border: "border-slate-500/40",
      background: "bg-slate-500/10",
      text: "text-slate-300",
      label: "AT EMA9",
    };
  }

  return (
    <div className="w-full min-w-0 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-lg">

      {/* HEADER */}

      <div className="p-4 border-b border-slate-700">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

          <div>
            <div className="flex items-center gap-3">

              <h2 className="text-lg font-bold text-white">
                NIFTY 50 EMA9 SCANNER
              </h2>

              <span className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                LIVE
              </span>

            </div>

            <p className="text-xs text-slate-400 mt-1">
              5 Minute Timeframe · Live Price vs EMA9
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-xs">

            <span className="text-green-400">
              Above: <b>{summary.above}</b>
            </span>

            <span className="text-red-400">
              Below: <b>{summary.below}</b>
            </span>

            <span className="text-slate-300">
              At EMA: <b>{summary.atEMA}</b>
            </span>

            <span className="text-yellow-400">
              Waiting: <b>{summary.waiting}</b>
            </span>

          </div>

        </div>

      </div>

      {/* SCANNER */}

      <div className="p-4">

        {loading && stocks.length === 0 ? (
          <div className="text-sm text-cyan-400 py-6 text-center">
            Loading 5-minute EMA9 data...
          </div>
        ) : error && stocks.length === 0 ? (
          <div className="text-sm text-red-400 py-6 text-center">
            {error}

            <button
              onClick={fetchEMAData}
              className="ml-3 text-cyan-400 underline"
            >
              Retry
            </button>
          </div>
        ) : readyStocks.length === 0 ? (
          <div className="text-sm text-slate-400 py-6 text-center">
            No completed EMA9 data available.
          </div>
        ) : (
          <div className="overflow-hidden relative">

            <div className="flex gap-3 w-max ema9-track">

              {scannerStocks.map((stock, index) => {
                const style = getPositionStyle(
                  stock.position
                );

                return (
                  <div
                    key={`${stock.symbol}-${index}`}
                    className={`w-52 shrink-0 rounded-lg border ${style.border} ${style.background} p-3`}
                  >

                    <div className="flex items-center justify-between gap-2">

                      <span className="font-bold text-white text-sm">
                        {stock.symbol}
                      </span>

                      <span className={`text-[10px] font-bold ${style.text}`}>
                        {style.label}
                      </span>

                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">

                      <div>
                        <p className="text-[10px] text-slate-500">
                          LTP
                        </p>

                        <p className="text-sm font-bold text-white">
                          {formatPrice(stock.ltp)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] text-slate-500">
                          EMA 9
                        </p>

                        <p className="text-sm font-bold text-cyan-300">
                          {formatPrice(stock.ema9)}
                        </p>
                      </div>

                    </div>

                    <div className={`mt-3 text-xs font-semibold ${style.text}`}>
                      Difference:{" "}
                      {stock.difference > 0 ? "+" : ""}
                      {formatPrice(stock.difference)}

                      {stock.differencePercent !== null &&
                        ` (${stock.differencePercent > 0 ? "+" : ""}${stock.differencePercent}%)`}
                    </div>

                  </div>
                );
              })}

            </div>

          </div>
        )}

      </div>

      {/* FOOTER */}

      <div className="px-4 py-3 bg-slate-950 border-t border-slate-700 flex flex-wrap justify-between gap-2">

        <span className="text-xs text-slate-500">
          Showing {readyStocks.length} of 50 stocks
        </span>

        <span className="text-xs text-slate-500">
          {lastUpdated
            ? `Updated ${lastUpdated.toLocaleTimeString()}`
            : "Updating..."}
          {" · "}Refresh: 10 seconds
        </span>

      </div>

      <style jsx>{`
        .ema9-track {
          animation: ema9-scroll 55s linear infinite;
        }

        .ema9-track:hover {
          animation-play-state: paused;
        }

        @keyframes ema9-scroll {
          from {
            transform: translateX(0);
          }

          to {
            transform: translateX(-50%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ema9-track {
            animation: none;
          }
        }
      `}</style>

    </div>
  );
}
