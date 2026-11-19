
"use client";

import { useEffect, useState } from "react";

export default function Nifty50VWAPScanner() {
  const [stocks, setStocks] = useState([]);
  const [summary, setSummary] = useState({
    above: 0,
    below: 0,
    atVWAP: 0,
    waiting: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  async function fetchVWAPData() {
    try {
      const response = await fetch(
        "/api/nifty50-vwap",
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || result.error || "VWAP data unavailable"
        );
      }

      setStocks(result.stocks || []);

      setSummary({
        above: result.above || 0,
        below: result.below || 0,
        atVWAP: result.atVWAP || 0,
        waiting: result.waiting || 0,
      });

      setLastUpdated(new Date());
      setError("");
    } catch (err) {
      console.error("VWAP SCANNER ERROR:", err);
      setError(err.message || "Unable to load VWAP");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchVWAPData();

    const interval = setInterval(
      fetchVWAPData,
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

  const aboveStocks = stocks.filter(
    (stock) => stock.position === "ABOVE"
  );

  const belowStocks = stocks.filter(
    (stock) => stock.position === "BELOW"
  );

  const atStocks = stocks.filter(
    (stock) => stock.position === "AT"
  );

  const aboveScannerStocks = [
    ...aboveStocks,
    ...aboveStocks,
  ];

  const belowScannerStocks = [
    ...belowStocks,
    ...belowStocks,
  ];

  function renderStockCard(stock, type, index) {
    const isAbove = type === "ABOVE";

    const style = isAbove
      ? {
          border: "border-green-500/40",
          background: "bg-green-500/10",
          text: "text-green-400",
          label: "ABOVE VWAP",
        }
      : {
          border: "border-red-500/40",
          background: "bg-red-500/10",
          text: "text-red-400",
          label: "BELOW VWAP",
        };

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
              VWAP
            </p>

            <p className="text-sm font-bold text-cyan-300">
              {formatPrice(stock.vwap)}
            </p>
          </div>

        </div>

        <div className={`mt-3 text-xs font-semibold ${style.text}`}>
          Difference:{" "}
          {Number(stock.difference) > 0 ? "+" : ""}
          {formatPrice(stock.difference)}

          {stock.differencePercent !== null &&
            ` (${Number(stock.differencePercent) > 0 ? "+" : ""}${formatPrice(stock.differencePercent)}%)`}
        </div>

      </div>
    );
  }

  function renderScannerRow(title, type, scannerStocks, count) {
    const isAbove = type === "ABOVE";

    return (
      <div className="mb-4">

        <div className="flex items-center gap-2 mb-3">

          <span
            className={`text-sm font-bold ${
              isAbove ? "text-green-400" : "text-red-400"
            }`}
          >
            {title}
          </span>

          <span className="text-xs text-slate-500">
            ({count})
          </span>

        </div>

        {scannerStocks.length === 0 ? (
          <div className="text-sm text-slate-400 py-4 text-center">
            No stocks available.
          </div>
        ) : (
          <div className="overflow-hidden relative">

            <div className={`flex gap-3 w-max ${
              isAbove ? "vwap-above-track" : "vwap-below-track"
            }`}>

              {scannerStocks.map((stock, index) =>
                renderStockCard(stock, type, index)
              )}

            </div>

          </div>
        )}

      </div>
    );
  }

  const readyCount =
    aboveStocks.length + belowStocks.length + atStocks.length;

  return (
    <div className="w-full min-w-0 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-lg">

      {/* HEADER */}

      <div className="p-4 border-b border-slate-700">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

          <div>

            <div className="flex items-center gap-3">

              <h2 className="text-lg font-bold text-white">
                NIFTY 50 VWAP SCANNER
              </h2>

              <span className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                LIVE
              </span>

            </div>

            <p className="text-xs text-slate-400 mt-1">
              5 Minute Timeframe · Live Price vs VWAP
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
              At VWAP: <b>{summary.atVWAP}</b>
            </span>

            <span className="text-yellow-400">
              Waiting: <b>{summary.waiting}</b>
            </span>

          </div>

        </div>

      </div>

      {/* TWO HORIZONTAL SCROLLING ROWS */}

      <div className="p-4">

        {loading && stocks.length === 0 ? (
          <div className="text-sm text-cyan-400 py-6 text-center">
            Loading 5-minute VWAP data...
          </div>
        ) : error && stocks.length === 0 ? (
          <div className="text-sm text-red-400 py-6 text-center">
            {error}

            <button
              onClick={fetchVWAPData}
              className="ml-3 text-cyan-400 underline"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {renderScannerRow(
              "▲ ABOVE VWAP",
              "ABOVE",
              aboveScannerStocks,
              aboveStocks.length
            )}

            <div className="border-t border-slate-700 my-3" />

            {renderScannerRow(
              "▼ BELOW VWAP",
              "BELOW",
              belowScannerStocks,
              belowStocks.length
            )}

            {atStocks.length > 0 && (
              <div className="mt-2 text-xs text-slate-400">
                AT VWAP:{" "}
                <span className="text-slate-200">
                  {atStocks.map((stock) => stock.symbol).join(", ")}
                </span>
              </div>
            )}
          </>
        )}

      </div>

      {/* FOOTER */}

      <div className="px-4 py-3 bg-slate-950 border-t border-slate-700 flex flex-wrap justify-between gap-2">

        <span className="text-xs text-slate-500">
          Showing {readyCount} of 50 stocks
        </span>

        <span className="text-xs text-slate-500">
          {lastUpdated
            ? `Updated ${lastUpdated.toLocaleTimeString()}`
            : "Updating..."}
          {" · "}Refresh: 10 seconds
        </span>

      </div>

      {/* SCROLL ANIMATION */}

      <style jsx global>{`
        .vwap-above-track,
        .vwap-below-track {
          animation: vwap-scroll 55s linear infinite;
        }

        .vwap-above-track:hover,
        .vwap-below-track:hover {
          animation-play-state: paused;
        }

        @keyframes vwap-scroll {
          from {
            transform: translateX(0);
          }

          to {
            transform: translateX(-50%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .vwap-above-track,
          .vwap-below-track {
            animation: none;
          }
        }
      `}</style>

    </div>
  );
}
