
"use client";

import { useEffect, useState } from "react";

// ======================================================
// SMALL REUSABLE UI COMPONENTS
// ======================================================

function MetricBox({
  title,
  value,
  subtitle,
  color = "text-white",
}) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
      <p className="text-xs text-slate-400">
        {title}
      </p>

      <p className={`text-lg md:text-xl font-bold mt-2 ${color}`}>
        {value ?? "--"}
      </p>

      {subtitle && (
        <p className="text-xs text-slate-500 mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ value }) {
  const styles = {
    UP: "bg-green-500/15 text-green-400 border-green-500/30",
    DOWN: "bg-red-500/15 text-red-400 border-red-500/30",
    FLAT: "bg-slate-500/15 text-slate-300 border-slate-500/30",

    WEAK: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    MODERATE: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    STRONG: "bg-green-500/15 text-green-400 border-green-500/30",

    DIVERGENCE: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    NO_CLEAR_DIVERGENCE: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    BOTH_MOVING_SAME_DIRECTION: "bg-blue-500/15 text-blue-400 border-blue-500/30",

    LOW: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    NORMAL: "bg-green-500/15 text-green-400 border-green-500/30",
    HIGH: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    EXTREME: "bg-red-500/15 text-red-400 border-red-500/30",

    FRESH: "bg-green-500/15 text-green-400 border-green-500/30",
    DELAYED: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    STALE: "bg-red-500/15 text-red-400 border-red-500/30",

    SPIKE: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    STRONG_SPIKE: "bg-red-500/15 text-red-400 border-red-500/30",
    NORMAL_MOVEMENT: "bg-green-500/15 text-green-400 border-green-500/30",
    INSUFFICIENT_DATA: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  };

  const style =
    styles[value] ||
    "bg-slate-500/15 text-slate-300 border-slate-500/30";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-semibold ${style}`}
    >
      {value || "WAITING"}
    </span>
  );
}

// ======================================================
// MAIN COMPONENT
// ======================================================

export default function VixIntelligenceCard() {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState(
    "Connecting to Zerodha..."
  );
  const [loading, setLoading] = useState(true);

  // ====================================================
  // LIVE DATA FETCH
  // ====================================================

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
        console.error(
          "VIX stream start error:",
          error
        );
      }

      if (active) {
        await checkStatus();
      }
    }

    initializeStream();

    const interval = setInterval(
      checkStatus,
      3000
    );

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // ====================================================
  // DATA EXTRACTION
  // ====================================================

  const vix = data?.vix;
  const nifty = data?.nifty;

  const intelligence = data?.intelligence;

  const vixMetrics = intelligence?.vix;
  const niftyMetrics = intelligence?.nifty;

  const divergence = intelligence?.divergence;

  const spike = intelligence?.spike;

  const volatility = intelligence?.volatilityRegime;

  const freshness = intelligence?.freshness;

  // ====================================================
  // HELPERS
  // ====================================================

  function formatNumber(value, digits = 2) {
    if (
      value === null ||
      value === undefined
    ) {
      return "--";
    }

    const number = Number(value);

    return Number.isFinite(number)
      ? number.toFixed(digits)
      : "--";
  }

  function getChangeColor(value) {
    if (Number(value) > 0) {
      return "text-green-400";
    }

    if (Number(value) < 0) {
      return "text-red-400";
    }

    return "text-slate-400";
  }

  function formatDirection(value) {
    if (!value) return "WAITING";

    return value.replaceAll("_", " ");
  }

  function getAccelerationColor(value) {
    if (value === "ACCELERATING_UP") {
      return "text-green-400";
    }

    if (value === "ACCELERATING_DOWN") {
      return "text-red-400";
    }

    return "text-slate-300";
  }

  function renderMomentum(metric, digits = 2) {
    if (!metric) {
      return (
        <p className="text-sm text-slate-500">
          Collecting history...
        </p>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <span
          className={`font-bold ${getChangeColor(
            metric.points
          )}`}
        >
          {metric.points > 0 ? "+" : ""}
          {formatNumber(metric.points, digits)}
        </span>

        <span className="text-xs text-slate-400">
          ({metric.percent > 0 ? "+" : ""}
          {formatNumber(metric.percent, 3)}%)
        </span>

        <StatusBadge value={metric.direction} />
      </div>
    );
  }

  const connected =
    data?.connected === true &&
    data?.status === "connected";

  // ====================================================
  // UI
  // ====================================================

  return (
    <section className="bg-slate-800 border border-slate-700 rounded-xl p-5 md:p-6 shadow-lg hover:border-cyan-500 transition-all duration-300">

      {/* HEADER */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

        <div>
          <h2 className="text-lg md:text-xl font-bold text-white">
            📊 Bhavish VIX Intelligence
          </h2>

          <p className="text-xs text-slate-400 mt-1">
            Zerodha Kite Connect | Live Volatility Analysis
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              connected
                ? "bg-green-400"
                : "bg-red-400"
            }`}
          />

          <span
            className={`text-xs font-semibold ${
              connected
                ? "text-green-400"
                : "text-red-400"
            }`}
          >
            {data?.status?.toUpperCase() || "CONNECTING"}
          </span>
        </div>

      </div>

      {loading && !data ? (
        <p className="text-slate-400 text-sm mt-6">
          Connecting to live market stream...
        </p>
      ) : (
        <>

          {/* ========================================= */}
          {/* LIVE MARKET PRICES */}
          {/* ========================================= */}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">

            {/* INDIA VIX */}

            <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">

              <p className="text-xs text-slate-400">
                INDIA VIX
              </p>

              <p className="text-3xl md:text-4xl font-bold text-white mt-2">
                {formatNumber(vix?.ltp)}
              </p>

              <p
                className={`text-sm font-semibold mt-2 ${getChangeColor(
                  vix?.changePercent
                )}`}
              >
                {formatNumber(vix?.changePercent)}%

                <span className="text-slate-500 font-normal ml-2">
                  vs previous close
                </span>
              </p>

            </div>

            {/* NIFTY */}

            <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">

              <p className="text-xs text-slate-400">
                NIFTY 50
              </p>

              <p className="text-3xl md:text-4xl font-bold text-white mt-2">
                {formatNumber(nifty?.ltp)}
              </p>

              <p
                className={`text-sm font-semibold mt-2 ${getChangeColor(
                  nifty?.changePercent
                )}`}
              >
                {formatNumber(nifty?.changePercent)}%

                <span className="text-slate-500 font-normal ml-2">
                  vs previous close
                </span>
              </p>

            </div>

          </div>

          {/* ========================================= */}
          {/* VIX MOMENTUM */}
          {/* ========================================= */}

          <div className="mt-6">

            <h3 className="text-sm font-bold text-cyan-400 mb-3">
              INDIA VIX MOMENTUM
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">

                <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-300">
                    1 Minute Momentum
                  </p>

                  <StatusBadge
                    value={vixMetrics?.strength1m}
                  />
                </div>

                {renderMomentum(
                  vixMetrics?.momentum1m,
                  4
                )}

              </div>

              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">

                <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-300">
                    5 Minute Momentum
                  </p>

                  <StatusBadge
                    value={vixMetrics?.strength5m}
                  />
                </div>

                {renderMomentum(
                  vixMetrics?.momentum5m,
                  4
                )}

              </div>

            </div>

          </div>

          {/* ========================================= */}
          {/* NIFTY MOMENTUM */}
          {/* ========================================= */}

          <div className="mt-6">

            <h3 className="text-sm font-bold text-cyan-400 mb-3">
              NIFTY MOMENTUM
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">

                <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-300">
                    1 Minute Momentum
                  </p>

                  <StatusBadge
                    value={niftyMetrics?.strength1m}
                  />
                </div>

                {renderMomentum(
                  niftyMetrics?.momentum1m,
                  2
                )}

              </div>

              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">

                <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-300">
                    5 Minute Momentum
                  </p>

                  <StatusBadge
                    value={niftyMetrics?.strength5m}
                  />
                </div>

                {renderMomentum(
                  niftyMetrics?.momentum5m,
                  2
                )}

              </div>

            </div>

          </div>

          {/* ========================================= */}
          {/* ACCELERATION */}
          {/* ========================================= */}

          <div className="mt-6">

            <h3 className="text-sm font-bold text-cyan-400 mb-3">
              PRICE ACCELERATION
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              <MetricBox
                title="VIX Acceleration"
                value={
                  vixMetrics?.acceleration
                    ? formatNumber(
                        vixMetrics.acceleration.points,
                        4
                      )
                    : "--"
                }
                subtitle={formatDirection(
                  vixMetrics?.acceleration?.direction
                )}
                color={getAccelerationColor(
                  vixMetrics?.acceleration?.direction
                )}
              />

              <MetricBox
                title="NIFTY Acceleration"
                value={
                  niftyMetrics?.acceleration
                    ? formatNumber(
                        niftyMetrics.acceleration.points,
                        2
                      )
                    : "--"
                }
                subtitle={formatDirection(
                  niftyMetrics?.acceleration?.direction
                )}
                color={getAccelerationColor(
                  niftyMetrics?.acceleration?.direction
                )}
              />

            </div>

          </div>

          {/* ========================================= */}
          {/* VIX NIFTY DIVERGENCE */}
          {/* ========================================= */}

          <div className="mt-6">

            <h3 className="text-sm font-bold text-cyan-400 mb-3">
              VIX vs NIFTY DIVERGENCE
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">

                <p className="text-sm text-slate-300 mb-3">
                  1 Minute Relationship
                </p>

                <StatusBadge
                  value={divergence?.oneMinute?.status}
                />

                <p className="text-xs text-slate-400 mt-3">
                  {divergence?.oneMinute?.description ||
                    "Waiting for data"}
                </p>

              </div>

              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">

                <p className="text-sm text-slate-300 mb-3">
                  5 Minute Relationship
                </p>

                <StatusBadge
                  value={divergence?.fiveMinute?.status}
                />

                <p className="text-xs text-slate-400 mt-3">
                  {divergence?.fiveMinute?.description ||
                    "Waiting for data"}
                </p>

              </div>

            </div>

          </div>

          {/* ========================================= */}
          {/* VOLATILITY REGIME + SPIKE */}
          {/* ========================================= */}

          <div className="mt-6">

            <h3 className="text-sm font-bold text-cyan-400 mb-3">
              VOLATILITY INTELLIGENCE
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">

                <p className="text-xs text-slate-400 mb-3">
                  CURRENT VOLATILITY REGIME
                </p>

                <StatusBadge
                  value={volatility?.regime}
                />

                <p className="text-xs text-slate-400 mt-3">
                  {volatility?.description ||
                    "Waiting for VIX data"}
                </p>

              </div>

              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">

                <p className="text-xs text-slate-400 mb-3">
                  VIX SPIKE DETECTION
                </p>

                <StatusBadge
                  value={spike?.level}
                />

                <p className="text-xs text-slate-400 mt-3">
                  1M Change:{" "}
                  {formatNumber(
                    spike?.changePercent,
                    3
                  )}
                  %
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  Threshold:{" "}
                  {spike?.thresholdPercent ?? "--"}%
                </p>

              </div>

            </div>

          </div>

          {/* ========================================= */}
          {/* DATA QUALITY */}
          {/* ========================================= */}

          <div className="mt-6 bg-slate-900 border border-slate-700 rounded-lg p-4">

            <div className="flex flex-wrap justify-between items-center gap-3">

              <div>
                <p className="text-sm font-semibold text-white">
                  Live Data Quality
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  Tick freshness and collected history
                </p>
              </div>

              <StatusBadge
                value={freshness?.status}
              />

            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">

              <MetricBox
                title="VIX History Samples"
                value={
                  vixMetrics?.historySamples ?? "--"
                }
              />

              <MetricBox
                title="NIFTY History Samples"
                value={
                  niftyMetrics?.historySamples ?? "--"
                }
              />

            </div>

            <p className="text-xs text-slate-400 mt-3">
              Last tick age:{" "}
              {freshness?.ageSeconds != null
                ? `${freshness.ageSeconds} seconds`
                : "--"}
            </p>

          </div>

          {/* ========================================= */}
          {/* MARKET OBSERVATION */}
          {/* ========================================= */}

          <div className="mt-6 bg-slate-900 border border-slate-700 rounded-lg p-4">

            <h3 className="text-sm font-semibold text-cyan-400">
              MARKET OBSERVATION
            </h3>

            <p className="text-sm text-white mt-2">

              {divergence?.fiveMinute?.status ===
              "DIVERGENCE"
                ? "NIFTY and VIX are moving in opposite directions over 5 minutes. Monitor price structure and volatility together."

                : divergence?.fiveMinute?.status ===
                  "BOTH_MOVING_SAME_DIRECTION"
                ? "NIFTY and VIX are moving in the same direction over 5 minutes. This is a mixed volatility observation, not a directional confirmation."

                : "Waiting for sufficient 5-minute momentum data."}

            </p>

            {spike?.detected && (
              <p className="text-yellow-400 text-sm font-semibold mt-3">
                ⚠️ VIX spike detected. Monitor sudden volatility changes.
              </p>
            )}

            <p className="text-xs text-slate-500 mt-3">
              Custom research metrics only. Not a standalone
              trading signal or guaranteed market prediction.
            </p>

          </div>

        </>
      )}

      {/* ============================================= */}
      {/* ERROR MESSAGE */}
      {/* ============================================= */}

      {message && (
        <p className="text-yellow-400 text-xs mt-4">
          {message}
        </p>
      )}

      {data?.error && (
        <p className="text-red-400 text-xs mt-2">
          Stream Error: {data.error}
        </p>
      )}

      {/* ============================================= */}
      {/* FOOTER */}
      {/* ============================================= */}

      <div className="flex flex-wrap justify-between gap-2 mt-4 pt-3 border-t border-slate-700">

        <p className="text-xs text-slate-500">
          Auto refresh: 3 seconds
        </p>

        <p className="text-xs text-slate-500">
          Last Update:{" "}
          {data?.lastUpdate
            ? new Date(
                data.lastUpdate
              ).toLocaleTimeString("en-IN")
            : "--"}
        </p>

      </div>

    </section>
  );
}
