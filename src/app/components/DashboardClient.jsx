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

  useEffect(() => {
    fetchMarketData();

    const interval = setInterval(() => {
      fetchMarketData();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white text-xl md:text-2xl px-4 text-center">
        Loading Market Data...
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-950 text-white">
      <div className="flex w-full min-w-0">
        <Sidebar />

        <div className="flex-1 min-w-0 w-full p-4 md:p-8">
          <Header />

          {/* ============================= */}
          {/* MARKET CARDS */}
          {/* ============================= */}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">

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
                      ((data.nifty - data.close) / data.close) *
                      100
                    ).toFixed(2)
                  : "-"
              }
            />

            <DashboardCard
              title="Market Status"
              value={data.status ?? "-"}
              color="text-green-400"
            />

            <AISignalCard ai={data.ai} />

            <EMATrendCard ema={data.ema} />

            <BhavishScoreCard score={data.bhavishScore} />

            <RSICard rsi={data.rsi} />

            <MACDCard macd={data.macd15m ?? data.macd} />

            <ADXCard adx={data.adx} />

            <ATRCard atr={data.atr} />
            <VWAPCard
  vwap={data.vwap}
/>

            

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
  <h3 className="text-slate-400 text-lg">
    PCR
  </h3>

  <div className="text-4xl font-bold mt-3 text-white">
    {data.pcrDetails?.value ?? data.pcr ?? "-"}
  </div>

  <div className="mt-5 space-y-3">

    <div className="flex justify-between items-center">
      <span className="text-slate-400">
        CE OI
      </span>

      <span className="text-white font-semibold">
        {Number(
          data.pcrDetails?.ceOI ?? 0
        ).toLocaleString("en-IN")}
      </span>
    </div>

    <div className="flex justify-between items-center">
      <span className="text-slate-400">
        PE OI
      </span>

      <span className="text-white font-semibold">
        {Number(
          data.pcrDetails?.peOI ?? 0
        ).toLocaleString("en-IN")}
      </span>
    </div>

    <div className="flex justify-between items-center">
      <span className="text-slate-400">
        Expiry
      </span>

      <span className="text-white font-semibold">
        {data.pcrDetails?.expiry
  ? new Date(
      data.pcrDetails.expiry
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  : "-"}
      </span>
    </div>

  </div>
</div>

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

          {/* ============================= */}
          {/* AI / OI / MARKET BIAS */}
          {/* ============================= */}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mt-6">

            <AITradePanel ai={data.ai} />

            <OILeaders data={data} />

            <MarketBiasCard bias={data.marketBias} />

          </div>

          {/* ============================= */}
          {/* NIFTY INTELLIGENCE */}
          {/* ============================= */}

          <div className="mt-6 w-full min-w-0">
            <NiftyIntelligence
              intelligence={data.niftyIntelligence}
            />
          </div>

          {/* ============================= */}
          {/* LIVE OPTION CHAIN */}
          {/* ============================= */}

          <div className="mt-6 w-full min-w-0">
            <LiveOptionChain
              optionChain={data.optionChain}
            />
          </div>

          {/* ============================= */}
          {/* OI ANALYSIS */}
          {/* ============================= */}

          <div className="mt-6 w-full min-w-0">
            <OIAnalysis data={data} />
          </div>

        </div>
      </div>
    </main>
  );
}