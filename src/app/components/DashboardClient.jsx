"use client";

import AISignalCard from "./AISignalCard";
import { useEffect, useState } from "react";
import EMATrendCard from "./EMATrendCard";
import Header from "./Header";
import Sidebar from "./Sidebar";
import DashboardCard from "./DashboardCard";
import RSICard from "./RSICard";
import MACDCard from "./MACDCard";
import ADXCard from "./ADXCard";
import ATRCard from "./ATRCard";
import VWAPCard from "./VWAPCard";
import OIAnalysis from "./OIAnalysis";
import AITradePanel from "./AITradePanel";
import LiveOptionChain from "./LiveOptionChain";
import OILeaders from "./OILeaders";
import MarketBiasCard from "./MarketBiasCard";
import NiftyIntelligence from "./NiftyIntelligence";
import BhavishScoreCard from "./BhavishScoreCard";
import Nifty50LiveStocks from "./Nifty50LiveStocks";

export default function DashboardClient() {
  const [data, setData] = useState(null);
  const [sectorData, setSectorData] = useState(null);

  // ============================================
  // EXPANDED SECTOR
  // ============================================

  const [expandedSector, setExpandedSector] = useState(null);

  // ============================================
  // FETCH MARKET DATA
  // ============================================

  async function fetchMarketData() {
    try {
      const response = await fetch("/api/market", {
        cache: "no-store",
      });

      console.log("Status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      console.log("API Result:", result);

      setData(result);
    } catch (error) {
      console.error("Dashboard Error:", error);
    }
  }

  // ============================================
  // FETCH SECTOR INTELLIGENCE
  // ============================================

  async function fetchSectorData() {
    try {
      const response = await fetch("/api/nifty50-sector", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          `Sector API HTTP ${response.status}`
        );
      }

      const result = await response.json();

      console.log("Sector API Result:", result);

      setSectorData(result);
    } catch (error) {
      console.error(
        "Sector Intelligence Error:",
        error
      );
    }
  }

  // ============================================
  // AUTO REFRESH
  // ============================================

  useEffect(() => {
    fetchMarketData();
    fetchSectorData();

    const interval = setInterval(() => {
      fetchMarketData();
      fetchSectorData();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // ============================================
  // LOADING
  // ============================================

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white text-xl md:text-2xl px-4 text-center">
        Loading Market Data...
      </div>
    );
  }

  // ============================================
  // PCR / OI CALCULATIONS
  // ============================================

  const ceOI = Number(
    data.pcrDetails?.ceOI ?? 0
  );

  const peOI = Number(
    data.pcrDetails?.peOI ?? 0
  );

  // PE OI - CE OI
  const oiDifference = peOI - ceOI;

  const oiDifferenceColor =
    oiDifference > 0
      ? "text-green-400"
      : oiDifference < 0
      ? "text-red-400"
      : "text-yellow-400";

  // ============================================
  // SECTOR INTELLIGENCE SUMMARY
  // ============================================

  const sectorScore = Number(
    sectorData?.overallSectorScore ?? 0
  );

  const totalContribution = Number(
    sectorData?.totalContribution ?? 0
  );

  const weightTotal = Number(
    sectorData?.weightTotal ?? 0
  );

  const sectorPerformance =
    weightTotal > 0
      ? (totalContribution / weightTotal) * 100
      : 0;

  const sectors = Array.isArray(
    sectorData?.sectors
  )
    ? sectorData.sectors
    : [];

  const strongestSector =
    sectors.length > 0
      ? [...sectors].sort(
          (a, b) =>
            Number(b.performance ?? 0) -
            Number(a.performance ?? 0)
        )[0]
      : null;

  const weakestSector =
    sectors.length > 0
      ? [...sectors].sort(
          (a, b) =>
            Number(a.performance ?? 0) -
            Number(b.performance ?? 0)
        )[0]
      : null;

  // ============================================
  // SECTOR TOGGLE
  // ============================================

  function toggleSector(sectorName) {
    setExpandedSector((current) =>
      current === sectorName
        ? null
        : sectorName
    );
  }

  // ============================================
  // SECTOR COLORS
  // ============================================

  function getSectorScoreColor(score) {
    if (score > 0) {
      return "text-green-400";
    }

    if (score < 0) {
      return "text-red-400";
    }

    return "text-yellow-400";
  }

  function getSectorDirectionColor(direction) {
    if (
      direction === "Bullish" ||
      direction === "Positive"
    ) {
      return "text-green-400";
    }

    if (
      direction === "Bearish" ||
      direction === "Negative"
    ) {
      return "text-red-400";
    }

    return "text-yellow-400";
  }

  function getStockChangeColor(change) {
    const value = Number(change ?? 0);

    if (value > 0) {
      return "text-green-400";
    }

    if (value < 0) {
      return "text-red-400";
    }

    return "text-slate-400";
  }

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-950 text-white">

      <div className="flex w-full min-w-0">

        {/* ======================================== */}
        {/* SIDEBAR */}
        {/* ======================================== */}

        <Sidebar />

        <div className="flex-1 min-w-0 w-full p-4 md:p-8">

          {/* ====================================== */}
          {/* HEADER */}
          {/* ====================================== */}

          <Header />

          {/* ====================================== */}
          {/* TOP MARKET CARDS */}
          {/* ====================================== */}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">

            {/* ==================================== */}
            {/* NIFTY + MARKET STATUS */}
            {/* ==================================== */}

            <DashboardCard
              title="NIFTY"
              value={data.nifty ?? "-"}
              change={
                data.close
                  ? (
                      data.nifty -
                      data.close
                    ).toFixed(2)
                  : "-"
              }
              percent={
                data.close
                  ? (
                      ((data.nifty -
                        data.close) /
                        data.close) *
                      100
                    ).toFixed(2)
                  : "-"
              }
              secondaryTitle="Market Status"
              secondaryValue={
                data.status ?? "-"
              }
              secondaryColor={
                data.status === "Bullish"
                  ? "text-green-400"
                  : data.status === "Bearish"
                  ? "text-red-400"
                  : "text-yellow-400"
              }
            />

            {/* ==================================== */}
            {/* BHAVISH SCORE */}
            {/* ==================================== */}

            <BhavishScoreCard
              score={data.bhavishScore}
            />

            {/* ==================================== */}
            {/* EMA TREND */}
            {/* ==================================== */}

            <EMATrendCard
              ema={data.ema}
            />

            {/* ==================================== */}
            {/* AI SIGNAL */}
            {/* ==================================== */}

            <AISignalCard
              ai={data.ai}
            />

          </div>

          {/* ===================================================== */}
          {/* NIFTY SECTOR INTELLIGENCE + INDICATORS */}
          {/* ===================================================== */}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mt-6">

            {/* ================================================= */}
            {/* LARGE NIFTY SECTOR INTELLIGENCE */}
            {/* ================================================= */}

            <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-xl p-5 md:p-6 shadow-lg hover:border-cyan-500 transition-all duration-300">

              {/* =============================================== */}
              {/* HEADER */}
              {/* =============================================== */}

              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">

                <div>

                  <h2 className="text-lg md:text-xl font-bold text-white">
                    📊 NIFTY 50 Sector Intelligence
                  </h2>

                  <p className="text-slate-400 text-xs md:text-sm mt-1">
                    Sector → Stock contribution
                  </p>

                </div>

                {/* OVERALL SCORE */}

                <div className="text-left md:text-right">

                  <div
                    className={`text-4xl md:text-5xl font-bold ${
                      sectorScore > 0
                        ? "text-green-400"
                        : sectorScore < 0
                        ? "text-red-400"
                        : "text-yellow-400"
                    }`}
                  >
                    {sectorData
                      ? sectorScore.toFixed(2)
                      : "-"}
                  </div>

                  <div className="text-slate-400 text-xs">
                    Overall Sector Score
                  </div>

                </div>

              </div>

              {/* =============================================== */}
              {/* SUMMARY */}
              {/* =============================================== */}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">

                {/* CONTRIBUTION */}

                <div className="bg-slate-900 rounded-lg p-3">

                  <p className="text-slate-500 text-xs">
                    Contribution
                  </p>

                  <p
                    className={`text-lg font-bold mt-1 ${
                      sectorPerformance > 0
                        ? "text-green-400"
                        : sectorPerformance < 0
                        ? "text-red-400"
                        : "text-yellow-400"
                    }`}
                  >
                    {sectorData
                      ? `${sectorPerformance.toFixed(
                          2
                        )}%`
                      : "-"}
                  </p>

                </div>

                {/* WEIGHT */}

                <div className="bg-slate-900 rounded-lg p-3">

                  <p className="text-slate-500 text-xs">
                    Weight Covered
                  </p>

                  <p className="text-lg font-bold mt-1 text-cyan-400">
                    {sectorData
                      ? `${weightTotal.toFixed(
                          2
                        )}%`
                      : "-"}
                  </p>

                </div>

                {/* STRONGEST */}

                <div className="bg-slate-900 rounded-lg p-3">

                  <p className="text-slate-500 text-xs">
                    Strongest
                  </p>

                  <p className="text-sm font-bold mt-1 text-green-400 truncate">
                    {strongestSector
                      ? strongestSector.sector
                      : "-"}
                  </p>

                  {strongestSector && (
                    <p className="text-xs text-green-400">
                      {Number(
                        strongestSector.performance ??
                          0
                      ).toFixed(2)}
                      %
                    </p>
                  )}

                </div>

                {/* WEAKEST */}

                <div className="bg-slate-900 rounded-lg p-3">

                  <p className="text-slate-500 text-xs">
                    Weakest
                  </p>

                  <p className="text-sm font-bold mt-1 text-red-400 truncate">
                    {weakestSector
                      ? weakestSector.sector
                      : "-"}
                  </p>

                  {weakestSector && (
                    <p className="text-xs text-red-400">
                      {Number(
                        weakestSector.performance ??
                          0
                      ).toFixed(2)}
                      %
                    </p>
                  )}

                </div>

              </div>

              {/* =============================================== */}
              {/* SECTOR STOCKS */}
              {/* =============================================== */}

              <div className="mt-5">

                <div className="flex items-center justify-between mb-3">

                  <div>

                    <h3 className="text-sm md:text-base font-bold text-white">
                      Sector Stocks
                    </h3>

                    <p className="text-xs text-slate-500">
                      Click a sector to view stocks
                    </p>

                  </div>

                  <span className="text-xs text-slate-500">
                    {sectors.length} sectors
                  </span>

                </div>

                {/* ============================================= */}
                {/* SECTOR LIST */}
                {/* ============================================= */}

                <div className="space-y-2">

                  {sectors.map(
                    (sector, index) => {

                      const isExpanded =
                        expandedSector ===
                        sector.sector;

                      const sectorStocks =
                        Array.isArray(
                          sector.stocks
                        )
                          ? sector.stocks
                          : [];

                      return (
                        <div
                          key={
                            sector.sector ??
                            index
                          }
                          className="rounded-lg border border-slate-700 bg-slate-900 overflow-hidden"
                        >

                          {/* ================================= */}
                          {/* SECTOR ROW */}
                          {/* ================================= */}

                          <button
                            type="button"
                            onClick={() =>
                              toggleSector(
                                sector.sector
                              )
                            }
                            className="w-full text-left px-3 md:px-4 py-3 hover:bg-slate-800 transition"
                          >

                            <div className="flex items-center gap-3">

                              {/* SECTOR NAME */}

                              <div className="flex-1 min-w-0">

                                <div className="flex items-center gap-2">

                                  <span className="text-sm font-semibold text-white truncate">
                                    {sector.sector}
                                  </span>

                                  <span className="text-[10px] text-slate-500 shrink-0">
                                    (
                                    {sector.stockCount ??
                                      sectorStocks.length}
                                    )
                                  </span>

                                </div>

                                <div className="flex flex-wrap items-center gap-2 mt-1">

                                  <span
                                    className={`text-xs font-bold ${getSectorScoreColor(
                                      sector.score
                                    )}`}
                                  >
                                    Score{" "}
                                    {Number(
                                      sector.score ??
                                        0
                                    ).toFixed(2)}
                                  </span>

                                  <span
                                    className={`text-xs ${getSectorScoreColor(
                                      sector.performance
                                    )}`}
                                  >
                                    {Number(
                                      sector.performance ??
                                        0
                                    ).toFixed(2)}
                                    %
                                  </span>

                                  <span
                                    className={`text-xs font-semibold ${getSectorDirectionColor(
                                      sector.direction
                                    )}`}
                                  >
                                    {sector.direction ??
                                      "Neutral"}
                                  </span>

                                </div>

                              </div>

                              {/* WEIGHT */}

                              <div className="hidden sm:block text-right shrink-0">

                                <p className="text-[10px] text-slate-500">
                                  Weight
                                </p>

                                <p className="text-xs text-cyan-400 font-semibold">
                                  {Number(
                                    sector.sectorWeight ??
                                      0
                                  ).toFixed(2)}
                                  %
                                </p>

                              </div>

                              {/* ARROW */}

                              <div className="text-slate-400 text-sm shrink-0">

                                {isExpanded
                                  ? "▲"
                                  : "▼"}

                              </div>

                            </div>

                          </button>

                          {/* ================================= */}
                          {/* EXPANDED STOCKS */}
                          {/* ================================= */}

                          {isExpanded && (
                            <div className="border-t border-slate-700 bg-slate-950/70 p-3">

                              {sectorStocks.length ===
                              0 ? (
                                <div className="text-sm text-slate-500 py-3 text-center">
                                  No stock data available
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">

                                  {sectorStocks.map(
                                    (
                                      stock,
                                      stockIndex
                                    ) => {

                                      const change =
                                        Number(
                                          stock.changePercent ??
                                            0
                                        );

                                      return (
                                        <div
                                          key={
                                            stock.symbol ??
                                            stockIndex
                                          }
                                          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2"
                                        >

                                          <div className="flex items-center justify-between gap-3">

                                            {/* STOCK */}

                                            <div className="min-w-0">

                                              <p className="text-sm font-semibold text-white truncate">
                                                {stock.name ??
                                                  stock.symbol ??
                                                  "-"}
                                              </p>

                                              <div className="flex items-center gap-2 mt-1">

                                                <span className="text-[10px] text-cyan-400">
                                                  {stock.symbol ??
                                                    "-"}
                                                </span>

                                                {stock.subSector && (
                                                  <span className="text-[10px] text-slate-500 truncate">
                                                    {
                                                      stock.subSector
                                                    }
                                                  </span>
                                                )}

                                              </div>

                                            </div>

                                            {/* PRICE */}

                                            <div className="text-right shrink-0">

                                              <p className="text-xs text-white font-semibold">
                                                ₹
                                                {Number(
                                                  stock.ltp ??
                                                    0
                                                ).toLocaleString(
                                                  "en-IN",
                                                  {
                                                    maximumFractionDigits: 2,
                                                  }
                                                )}
                                              </p>

                                              <p
                                                className={`text-xs font-bold ${getStockChangeColor(
                                                  change
                                                )}`}
                                              >
                                                {change >
                                                0
                                                  ? "+"
                                                  : ""}
                                                {change.toFixed(
                                                  2
                                                )}
                                                %
                                              </p>

                                            </div>

                                          </div>

                                          {/* STOCK WEIGHT */}

                                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-800">

                                            <span className="text-[10px] text-slate-500">
                                              Weight
                                            </span>

                                            <span className="text-[10px] text-slate-400">
                                              {Number(
                                                stock.weight ??
                                                  0
                                              ).toFixed(
                                                2
                                              )}
                                              %
                                            </span>

                                            <span className="text-[10px] text-slate-500">
                                              Contribution
                                            </span>

                                            <span
                                              className={`text-[10px] font-semibold ${getStockChangeColor(
                                                stock.weightedContribution
                                              )}`}
                                            >
                                              {Number(
                                                stock.weightedContribution ??
                                                  0
                                              ).toFixed(
                                                4
                                              )}
                                            </span>

                                          </div>

                                        </div>
                                      );
                                    }
                                  )}

                                </div>
                              )}

                            </div>
                          )}

                        </div>
                      );
                    }
                  )}

                </div>

              </div>

            </div>

            {/* ================================================= */}
            {/* RIGHT SIDE INDICATORS */}
            {/* ================================================= */}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 md:gap-6">

              {/* ============================================= */}
              {/* RSI */}
              {/* ============================================= */}

              <RSICard
                rsi={data.rsi}
              />

              {/* ============================================= */}
              {/* MACD */}
              {/* ============================================= */}

              <MACDCard
                macd={
                  data.macd15m ??
                  data.macd
                }
              />

              {/* ============================================= */}
              {/* PCR */}
              {/* ============================================= */}

              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg hover:border-green-500 transition-all duration-300">

                <h3 className="text-slate-300 text-sm uppercase tracking-wide font-semibold">
                  PCR
                </h3>

                <div className="text-4xl font-bold mt-3 text-yellow-400">
                  {data.pcrDetails?.value ??
                    data.pcr ??
                    "-"}
                </div>

                <div className="mt-5 space-y-3">

                  {/* CE OI */}

                  <div className="flex justify-between items-center gap-4">

                    <span className="text-slate-300 text-sm">
                      CE OI
                    </span>

                    <span className="text-green-400 font-bold text-sm">
                      {ceOI.toLocaleString(
                        "en-IN"
                      )}
                    </span>

                  </div>

                  {/* PE OI */}

                  <div className="flex justify-between items-center gap-4">

                    <span className="text-slate-300 text-sm">
                      PE OI
                    </span>

                    <span className="text-red-400 font-bold text-sm">
                      {peOI.toLocaleString(
                        "en-IN"
                      )}
                    </span>

                  </div>

                  {/* OI DIFFERENCE */}

                  <div className="flex justify-between items-center gap-4">

                    <span className="text-slate-300 text-sm">
                      OI Difference
                    </span>

                    <span
                      className={`${oiDifferenceColor} font-bold text-sm`}
                    >
                      {oiDifference.toLocaleString(
                        "en-IN"
                      )}
                    </span>

                  </div>

                  {/* EXPIRY */}

                  <div className="flex justify-between items-center gap-4">

                    <span className="text-slate-300 text-sm">
                      Expiry
                    </span>

                    <span className="text-cyan-400 font-semibold text-sm">

                      {data.pcrDetails?.expiry
                        ? new Date(
                            data.pcrDetails.expiry
                          ).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )
                        : "-"}

                    </span>

                  </div>

                </div>

              </div>

            </div>

          </div>

          {/* ===================================================== */}
          {/* ADDITIONAL TECHNICAL INDICATORS */}
          {/* ===================================================== */}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-6">

            {/* ==================================== */}
            {/* ATR */}
            {/* ==================================== */}

            <ATRCard
              atr={data.atr}
            />

            {/* ==================================== */}
            {/* VWAP */}
            {/* ==================================== */}

            <VWAPCard
              vwap={data.vwap}
            />

            {/* ==================================== */}
            {/* ADX */}
            {/* ==================================== */}

            <ADXCard
              adx={data.adx}
            />

            {/* ==================================== */}
            {/* MARKET STRENGTH */}
            {/* ==================================== */}

            <DashboardCard
              title="Market Strength"
              value={
                data.strength
                  ? `${data.strength}%`
                  : "-"
              }
              color="text-green-400"
            />

          </div>

          {/* ====================================== */}
          {/* AI / OI / MARKET BIAS */}
          {/* ====================================== */}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mt-6">

            <AITradePanel
              ai={data.ai}
            />

            <OILeaders
              data={data}
            />

            <MarketBiasCard
              bias={data.marketBias}
            />

          </div>

          {/* ====================================== */}
          {/* NIFTY INTELLIGENCE */}
          {/* ====================================== */}

          <div className="mt-6 w-full min-w-0">

            <NiftyIntelligence
              intelligence={
                data.niftyIntelligence
              }
            />

          </div>
          {/* ====================================== */}
{/* NIFTY 50 LIVE STOCKS */}
{/* ====================================== */}

<div className="mt-6 w-full min-w-0">

  <Nifty50LiveStocks />

</div>

          {/* ====================================== */}
          {/* LIVE OPTION CHAIN */}
          {/* ====================================== */}

          <div className="mt-6 w-full min-w-0">

            <LiveOptionChain
              optionChain={
                data.optionChain
              }
            />

          </div>

          {/* ====================================== */}
          {/* OI ANALYSIS */}
          {/* ====================================== */}

          <div className="mt-6 w-full min-w-0">

            <OIAnalysis
              data={data}
            />

          </div>

        </div>

      </div>

    </main>
  );
}