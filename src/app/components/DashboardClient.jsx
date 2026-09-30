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

export default function DashboardClient() {
  const [data, setData] = useState(null);

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
  // AUTO REFRESH
  // ============================================

  useEffect(() => {
    fetchMarketData();

    const interval = setInterval(() => {
      fetchMarketData();
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
          {/* MARKET CARDS */}
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
                  ? (data.nifty - data.close).toFixed(2)
                  : "-"
              }
              percent={
                data.close
                  ? (
                      ((data.nifty - data.close) /
                        data.close) *
                      100
                    ).toFixed(2)
                  : "-"
              }
              secondaryTitle="Market Status"
              secondaryValue={data.status ?? "-"}
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

            {/* ==================================== */}
            {/* RSI */}
            {/* ==================================== */}

            <RSICard
              rsi={data.rsi}
            />

            {/* ==================================== */}
            {/* MACD */}
            {/* ==================================== */}

            <MACDCard
              macd={
                data.macd15m ??
                data.macd
              }
            />

            {/* ==================================== */}
            {/* PCR */}
            {/* ==================================== */}

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg hover:border-green-500 transition-all duration-300">

              {/* PCR TITLE */}

              <h3 className="text-slate-300 text-sm uppercase tracking-wide font-semibold">
                PCR
              </h3>

              {/* PCR VALUE */}

              <div className="text-4xl font-bold mt-4 text-yellow-400">
                {data.pcrDetails?.value ??
                  data.pcr ??
                  "-"}
              </div>

              {/* PCR DATA */}

              <div className="mt-6 space-y-4">

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