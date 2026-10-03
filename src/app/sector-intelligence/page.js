"use client";

import { useEffect, useState } from "react";
import SectorGlobe from "../components/SectorGlobe";

export default function SectorIntelligencePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  async function fetchSectorData() {
    try {
      const response = await fetch("/api/nifty50-sector", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(
          result.message || "Unable to load sector data"
        );
      }

      setData(result);
      setError("");
    } catch (err) {
      console.error("SECTOR INTELLIGENCE ERROR:", err);
      setError(err.message);
    }
  }

  useEffect(() => {
    fetchSectorData();

    const interval = setInterval(
      fetchSectorData,
      10000
    );

    return () => clearInterval(interval);
  }, []);

  /*
   * Overall contribution comes from the
   * weighted contribution of all 50 stocks.
   *
   * Example:
   * -0.8418 contribution / 99.98 weight
   * = approximately -0.84% overall performance.
   */
  const totalContribution =
    Number(data?.totalContribution ?? 0);

  const weightTotal =
    Number(data?.weightTotal ?? 0);

  const overallPerformance =
    weightTotal > 0
      ? (totalContribution / weightTotal) * 100
      : 0;

  /*
   * Overall score is only a summary indicator.
   * Individual sector scores remain unchanged.
   */
  const overallScore = Number(
  data?.overallSectorScore ?? 0
);

  if (!data) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white md:p-8">
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <div className="text-5xl">🌐</div>

            <p className="mt-4 text-lg text-slate-300">
              Loading NIFTY 50 Sector Intelligence...
            </p>

            {error && (
              <p className="mt-3 text-sm text-red-400">
                {error}
              </p>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-3 text-white md:p-6">

      {/* PAGE HEADER */}
      <div className="mx-auto mb-5 max-w-[1400px]">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">
              Bhavish Trading
            </p>

            <h1 className="mt-1 text-2xl font-bold md:text-3xl">
              NIFTY 50 Sector Intelligence
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Live sector performance based on NIFTY 50 stock weights
            </p>
          </div>

          <div className="flex items-center gap-2 self-start rounded-full border border-green-500/20 bg-green-500/5 px-4 py-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />

            <span className="text-xs font-semibold text-green-400">
              LIVE
            </span>

            <span className="text-xs text-slate-500">
              Auto refresh 10s
            </span>
          </div>

        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mx-auto mb-4 max-w-[1400px] rounded-xl border border-red-800 bg-red-950/50 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* GLOBE */}
      <div className="mx-auto max-w-[1400px]">
        <SectorGlobe
          sectors={data.sectors || []}
          overallScore={overallScore}
          overallPerformance={overallPerformance}
          weightTotal={weightTotal}
        />
      </div>

    </main>
  );
}