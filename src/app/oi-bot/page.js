
"use client";

import { useCallback, useEffect, useState } from "react";

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "N/A";
  }
  return Number(value).toFixed(digits);
}

function formatLabel(value) {
  return value ? String(value).replaceAll("_", " ") : "N/A";
}

function directionColor(value) {
  if (value === "BULLISH" || value === "BUY_CE") return "text-green-400";
  if (value === "BEARISH" || value === "BUY_PE") return "text-red-400";
  return "text-yellow-400";
}

function Metric({ label, value, color = "text-white" }) {
  return (
    <div className="rounded-xl bg-slate-950 border border-slate-800 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`font-semibold mt-2 ${color}`}>{value ?? "N/A"}</p>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-lg font-bold text-white mb-4">{children}</h2>
  );
}

export default function OIBotPage() {
  const [timeframe, setTimeframe] = useState("30");
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      const [decisionResponse, historyResponse] = await Promise.all([
        fetch("/api/oi-bot/decision", {
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/oi-bot/signal-history?limit=20", {
          cache: "no-store",
          credentials: "include",
        }),
      ]);

      const decisionResult = await decisionResponse.json();
      const historyResult = await historyResponse.json();

      if (!decisionResponse.ok || !decisionResult.success) {
        throw new Error(
          decisionResult.reason ||
          decisionResult.error ||
          "Unable to load AI prediction"
        );
      }

      setData(decisionResult);

      if (historyResponse.ok && historyResult.success) {
        setHistory(historyResult.history || []);
      }

      setError("");
    } catch (err) {
      setError(err.message || "Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();

    const timer = setInterval(loadDashboard, 30000);

    return () => clearInterval(timer);
  }, [loadDashboard]);

  const decision = data?.decision;
  const early = data?.earlySignal;
  const analysis = data?.analysis;
  const market = data?.marketConfirmation;
  const sync = data?.dataSync;

  const futures = analysis?.futures;
  const options = analysis?.options;
  const optionDecision = decision?.confirmations?.options;
  const marketDecision = decision?.confirmations?.market;

  const direction =
    early?.direction ||
    decision?.bias ||
    "NEUTRAL";

  const predictionStatus =
    early?.status ||
    decision?.signal ||
    "WAIT";

  const predictionColor = directionColor(direction);

  const signalColor = directionColor(decision?.signal);

  const formatDate = (value) => {
    if (!value) return "N/A";

    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-blue-400">
              🤖 BHAVISH AI PREDICTOR
            </h1>
            <p className="text-slate-400 mt-2">
              NIFTY Futures & Options Intelligence
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${
              sync?.valid ? "bg-green-400" : "bg-yellow-400"
            }`} />
            <span className="text-sm text-slate-400">
              {sync?.valid ? "Data Synchronized" : "Data Not Validated"}
            </span>

            <button
              onClick={loadDashboard}
              className="ml-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm"
            >
              ↻ Refresh
            </button>
          </div>
        </header>

        {/* TIMEFRAME SELECTOR */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-semibold">Prediction Horizon</p>
              <p className="text-xs text-slate-500 mt-1">
                Select the analysis horizon
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setTimeframe("30")}
                className={`px-5 py-3 rounded-lg text-sm font-semibold ${
                  timeframe === "30"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                Next 30 Minutes
              </button>

              <button
                onClick={() => setTimeframe("60")}
                className={`px-5 py-3 rounded-lg text-sm font-semibold ${
                  timeframe === "60"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                Next 1 Hour
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 mb-6">
            {error}
          </div>
        )}

        {/* MAIN PREDICTION */}
        <section className="bg-slate-900 border border-slate-700 rounded-2xl p-5 md:p-8 mb-6">
          {loading && !data ? (
            <div className="text-center py-12 text-slate-400">
              Loading AI Market Intelligence...
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row md:justify-between gap-6">
                <div>
                  <p className="text-sm text-slate-400">
                    NIFTY MARKET PREDICTION
                  </p>

                  <h2 className={`text-4xl md:text-5xl font-bold mt-3 ${predictionColor}`}>
                    {formatLabel(predictionStatus)}
                  </h2>

                  <p className="text-slate-400 mt-3 max-w-xl">
                    {early?.reason ||
                      decision?.reason ||
                      "Waiting for market confirmation"}
                  </p>
                </div>

                <div className="md:text-right">
                  <p className="text-sm text-slate-500">
                    Current NIFTY Price
                  </p>
                  <p className="text-3xl font-bold mt-2">
                    {formatNumber(market?.price)}
                  </p>

                  <p className="text-xs text-slate-500 mt-2">
                    Horizon: {timeframe === "30" ? "30 Minutes" : "1 Hour"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
                <Metric
                  label="EARLY DIRECTION"
                  value={formatLabel(early?.direction)}
                  color={predictionColor}
                />

                <Metric
                  label="FINAL DECISION"
                  value={formatLabel(decision?.signal)}
                  color={signalColor}
                />

                <Metric
                  label="ALIGNMENT SCORE"
                  value={
                    decision?.confidence != null
                      ? `${decision.confidence}%`
                      : "N/A"
                  }
                  color="text-blue-400"
                />
              </div>

              <p className="text-xs text-slate-500 mt-5">
                Prediction horizon selection is currently a display selection.
                Separate 30-minute and 1-hour forecasting logic is not yet implemented.
              </p>
            </>
          )}
        </section>

        {/* MARKET INTELLIGENCE */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
          <SectionTitle>Market Intelligence</SectionTitle>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric
              label="FUTURES BIAS"
              value={formatLabel(analysis?.bias)}
              color={directionColor(analysis?.bias)}
            />

            <Metric
              label="FUTURES CLASSIFICATION"
              value={formatLabel(futures?.classification)}
            />

            <Metric
              label="OPTIONS BIAS"
              value={formatLabel(optionDecision?.bias)}
              color={directionColor(optionDecision?.bias)}
            />

            <Metric
              label="MARKET BIAS"
              value={formatLabel(marketDecision?.bias)}
              color={directionColor(marketDecision?.bias)}
            />
          </div>
        </section>

        {/* OI ANALYSIS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <SectionTitle>NIFTY Futures Analysis</SectionTitle>

            <div className="grid grid-cols-2 gap-3">
              <Metric
                label="Current Futures Price"
                value={formatNumber(futures?.currentPrice)}
              />

              <Metric
                label="Price Change"
                value={formatNumber(futures?.priceChange)}
                color={Number(futures?.priceChange) >= 0
                  ? "text-green-400"
                  : "text-red-400"}
              />

              <Metric
                label="OI Change"
                value={futures?.oiChange?.toLocaleString("en-IN")}
              />

              <Metric
                label="OI Change %"
                value={futures?.oiChangePercent != null
                  ? `${futures.oiChangePercent}%`
                  : "N/A"}
              />
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <SectionTitle>Options Chain Intelligence</SectionTitle>

            <div className="grid grid-cols-2 gap-3">
              <Metric
                label="ATM STRIKE"
                value={options?.atmStrike}
              />

              <Metric
                label="MATCHED CONTRACTS"
                value={options?.matchedContracts}
              />

              <Metric
                label="CALL WRITING"
                value={optionDecision?.callWritingCount}
              />

              <Metric
                label="PUT WRITING"
                value={optionDecision?.putWritingCount}
              />

              <Metric
                label="CALL COVERING"
                value={optionDecision?.callCoveringCount}
              />

              <Metric
                label="PUT COVERING"
                value={optionDecision?.putCoveringCount}
              />

              <Metric
                label="RESISTANCE CANDIDATE"
                value={options?.resistanceCandidate}
              />

              <Metric
                label="SUPPORT CANDIDATE"
                value={options?.supportCandidate}
              />
            </div>
          </section>
        </div>

        {/* PRICE ACTION */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
          <SectionTitle>Price Action & Market Structure</SectionTitle>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric
              label="VWAP"
              value={formatNumber(market?.vwap)}
            />

            <Metric
              label="VWAP POSITION"
              value={formatLabel(market?.vwapPosition)}
            />

            <Metric
              label="EMA 9"
              value={formatNumber(market?.ema9)}
            />

            <Metric
              label="EMA 20"
              value={formatNumber(market?.ema20)}
            />

            <Metric
              label="EMA TREND"
              value={formatLabel(market?.emaTrend)}
              color={directionColor(market?.emaTrend)}
            />

            <Metric
              label="MOMENTUM"
              value={formatLabel(market?.momentum)}
              color={market?.momentum === "UP"
                ? "text-green-400"
                : market?.momentum === "DOWN"
                  ? "text-red-400"
                  : "text-yellow-400"}
            />

            <Metric
              label="MARKET STRUCTURE"
              value={formatLabel(market?.structure?.structure)}
              color={market?.structure?.structure === "BULLISH_STRUCTURE"
                ? "text-green-400"
                : market?.structure?.structure === "BEARISH_STRUCTURE"
                  ? "text-red-400"
                  : "text-yellow-400"}
            />

            <Metric
              label="VOLUME RATIO"
              value={market?.volume?.volumeRatio != null
                ? `${formatNumber(market.volume.volumeRatio)}x`
                : "N/A"}
            />

            <Metric
              label="VOLUME STATUS"
              value={formatLabel(market?.volume?.confirmation)}
            />

            <Metric
              label="BREAKOUT"
              value={formatLabel(market?.breakout?.breakout)}
            />

            <Metric
              label="TRAP WARNING"
              value={market?.breakout?.trapWarning ? "YES" : "NO"}
              color={market?.breakout?.trapWarning
                ? "text-red-400"
                : "text-green-400"}
            />

            <Metric
              label="MARKET CANDLE AGE"
              value={market?.candleAgeMinutes != null
                ? `${formatNumber(market.candleAgeMinutes, 1)} min`
                : "N/A"}
            />
          </div>
        </section>

        {/* AI REASONING */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
          <SectionTitle>Why Is AI Predicting This Direction?</SectionTitle>

          <div className="space-y-3">
            {[
              ["Futures", analysis?.futures?.classification],
              ["Options", optionDecision?.reason],
              ["Market Confirmation", marketDecision?.reason],
              ["Market Structure", market?.structure?.structure],
              ["Volume", market?.volume?.confirmation],
              ["Breakout", market?.breakout?.breakout],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex flex-col sm:flex-row sm:justify-between gap-2 border-b border-slate-800 pb-3"
              >
                <span className="text-slate-400 text-sm">{label}</span>
                <span className="text-white text-sm font-medium">
                  {formatLabel(value)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-4">
            <p className="text-yellow-400 text-sm font-semibold">
              Final Decision Reason
            </p>
            <p className="text-slate-300 text-sm mt-2">
              {decision?.reason || "Waiting for sufficient confirmation"}
            </p>
          </div>
        </section>

        {/* SIGNAL HISTORY */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <SectionTitle>Prediction History</SectionTitle>

          {history.length === 0 ? (
            <p className="text-slate-500 text-sm py-6 text-center">
              No prediction history available yet.
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((item, index) => (
                <div
                  key={`${item.capturedAt}-${index}`}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                    <div>
                      <p className={`font-semibold ${directionColor(item.direction)}`}>
                        {formatLabel(item.status)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatLabel(item.eventType)}
                      </p>
                    </div>

                    <p className="text-xs text-slate-500">
                      {formatDate(item.capturedAt)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    <Metric
                      label="PRICE"
                      value={formatNumber(item.price)}
                    />
                    <Metric
                      label="VOLUME"
                      value={item.volumeRatio != null
                        ? `${formatNumber(item.volumeRatio)}x`
                        : "N/A"}
                    />
                    <Metric
                      label="STRUCTURE"
                      value={formatLabel(item.structure)}
                    />
                    <Metric
                      label="DECISION"
                      value={formatLabel(item.decision)}
                      color={directionColor(item.decision)}
                    />
                  </div>

                  <p className="text-xs text-slate-400 mt-3">
                    {item.reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="text-xs text-slate-600 mt-6 text-center">
          AI analysis is based on available market data. Predictions are not guaranteed.
          Validate risk before taking any trade.
          <p className="mt-2">
            Last updated: {formatDate(data?.checkedAt)}
          </p>
        </footer>

      </div>
    </main>
  );
}
