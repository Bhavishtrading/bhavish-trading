"use client";

import { useEffect, useState } from "react";

import Header from "./Header";
import Sidebar from "./Sidebar";
import DashboardCard from "./DashboardCard";
import OIAnalysis from "./OIAnalysis";
import MarketScore from "./MarketScore";
import MarketMomentum from "./MarketMomentum";
import AISignalCard from "./AISignalCard";
import EMATrendCard from "./EMATrendCard";
import RSICard from "./RSICard";
import MACDCard from "./MACDCard";
import ADXCard from "./ADXCard";
import ATRCard from "./ATRCard";

export default function DashboardClient() {
  const [data, setData] = useState(null);

  async function fetchMarketData() {
    try {
      const response = await fetch("/api/market", {
        cache: "no-store",
      });

      const result = await response.json();

      setData(result);
    } catch (error) {
      console.error("Dashboard Error:", error);
    }
  }

  useEffect(() => {
    fetchMarketData();

    const interval = setInterval(() => {
      fetchMarketData();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white text-2xl">
        Loading Market Data...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">

        <Sidebar />

        <div className="flex-1 p-8">

          <Header />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            <DashboardCard
              title="NIFTY"
              value={data.nifty}
              change={(data.nifty - data.close).toFixed(2)}
              percent={(
                ((data.nifty - data.close) / data.close) *
                100
              ).toFixed(2)}
            />

            <DashboardCard
              title="Market Status"
              value={data.status}
              color="text-green-400"
            />

            <DashboardCard
              title="PCR"
              value={data.pcr}
            />

            <DashboardCard
              title="Market Strength"
              value={`${data.strength}%`}
              color="text-green-400"
            />

            <AISignalCard ai={data.ai} />

            <EMATrendCard ema={data.ema} />

            <RSICard rsi={data.rsi} />

            <MACDCard macd={data.macd} />

            <ADXCard adx={data.adx} />

            <ATRCard atr={data.atr} />

          </div>

          <OIAnalysis data={data} />

          <MarketScore data={data} />

          <MarketMomentum data={data} />

        </div>

      </div>
    </main>
  );
}