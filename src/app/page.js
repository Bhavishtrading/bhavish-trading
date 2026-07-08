import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import DashboardCard from "./components/DashboardCard";
import OIAnalysis from "./components/OIAnalysis";
import MarketScore from "./components/MarketScore";
import MarketMomentum from "./components/MarketMomentum";
import { getNiftyData } from "../lib/api";

export default async function Home() {

  const data = await getNiftyData();

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <div className="flex">

        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex-1 p-8">

          <Header />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            <DashboardCard
              title="NIFTY"
              value={data.nifty}
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

          </div>

         <OIAnalysis data={data} />

          <MarketScore data={data} />

          <MarketMomentum data={data} />

        </div>

      </div>

    </main>
  );
}