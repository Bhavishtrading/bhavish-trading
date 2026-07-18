import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import DashboardCard from "./components/DashboardCard";
import OIAnalysis from "./components/OIAnalysis";
import MarketScore from "./components/MarketScore";
import MarketMomentum from "./components/MarketMomentum";
import AISignalCard from "./components/AISignalCard";
import EMATrendCard from "./components/EMATrendCard";

// Import directly from dataProvider
import { getMarketData } from "../services/dataProvider";

export default async function Home() {
  // Get data directly (No API Fetch)
  const data = await getMarketData();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">

        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex-1 p-8">

          {/* Header */}
          <Header />

          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            <DashboardCard
              title="NIFTY"
              value={data.nifty}
              change={(data.nifty - data.close).toFixed(2)}
  percent={(((data.nifty - data.close) / data.close) * 100).toFixed(2)} 
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

          </div>

          {/* OI Analysis */}
          <OIAnalysis data={data} />

          {/* AI Market Score */}
          <MarketScore data={data} />

          {/* Market Momentum */}
          <MarketMomentum data={data} />

        </div>
      </div>
    </main>
  );
}