"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
});

const SECTOR_SLOTS = [
  { row: 1, col: 1 },
  { row: 1, col: 2 },
  { row: 1, col: 3 },
  { row: 1, col: 4 },
  { row: 1, col: 5 },

  { row: 2, col: 1 },
  { row: 2, col: 5 },

  { row: 3, col: 1 },
  { row: 3, col: 5 },

  { row: 4, col: 1 },
  { row: 4, col: 5 },

  { row: 5, col: 1 },
  { row: 5, col: 2 },
  { row: 5, col: 3 },
  { row: 5, col: 4 },
];

const CONNECTOR_POINTS = [
  { x: 100, y: 70 },
  { x: 300, y: 70 },
  { x: 500, y: 70 },
  { x: 700, y: 70 },
  { x: 900, y: 70 },

  { x: 100, y: 210 },
  { x: 900, y: 210 },

  { x: 100, y: 350 },
  { x: 900, y: 350 },

  { x: 100, y: 490 },
  { x: 900, y: 490 },

  { x: 100, y: 630 },
  { x: 300, y: 630 },
  { x: 500, y: 630 },
  { x: 700, y: 630 },
];

const INDIA_LAT = 22.5;
const INDIA_LNG = 79.0;

function getColor(score) {
  if (score > 5) return "text-green-400";
  if (score < -5) return "text-red-400";
  return "text-yellow-400";
}

function getBorder(score) {
  if (score > 5) return "border-green-500/60";
  if (score < -5) return "border-red-500/60";
  return "border-yellow-500/60";
}

function getGlow(score) {
  if (score > 5) return "rgba(34,197,94,0.55)";
  if (score < -5) return "rgba(239,68,68,0.55)";
  return "rgba(250,204,21,0.45)";
}

function getArrow(performance) {
  if (performance > 0) return "▲";
  if (performance < 0) return "▼";
  return "•";
}

export default function SectorGlobe({
  sectors = [],
  overallScore = 0,
  overallPerformance = 0,
  weightTotal = 0,
}) {
  const globeRef = useRef(null);

  const [indiaPolygon, setIndiaPolygon] = useState(null);

  /*
   * Load India country boundary.
   * Source: Natural Earth country polygons.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadIndia() {
      try {
        const response = await fetch(
          "https://raw.githubusercontent.com/datasets/geo-countries/main/data/countries.geojson"
        );

        if (!response.ok) {
          throw new Error(`India map HTTP ${response.status}`);
        }

        const world = await response.json();

        const india = world.features?.find(
          (feature) =>
            feature?.properties?.name === "India" ||
            feature?.properties?.["ISO3166-1-Alpha-3"] === "IND"
        );

        if (!cancelled && india) {
          setIndiaPolygon(india);
        }
      } catch (error) {
        console.error("INDIA MAP ERROR:", error);
      }
    }

    loadIndia();

    return () => {
      cancelled = true;
    };
  }, []);

  const sortedSectors = useMemo(() => {
    return Array.isArray(sectors) ? sectors.slice(0, 15) : [];
  }, [sectors]);

  const pointsData = useMemo(() => {
    const locations = [
      [22, 78],
      [28, 84],
      [18, 88],
      [12, 76],
      [8, 82],
      [32, 72],
      [24, 68],
      [16, 92],
      [5, 70],
      [35, 88],
      [20, 100],
      [2, 95],
      [30, 96],
      [10, 65],
      [38, 80],
    ];

    return sortedSectors.map((sector, index) => {
      const score = Number(sector.score || 0);
      const [lat, lng] = locations[index];

      return {
        lat,
        lng,
        sector: sector.sector,
        score,
        performance: Number(sector.performance || 0),
        color:
          score > 5
            ? "#22c55e"
            : score < -5
            ? "#ef4444"
            : "#facc15",
      };
    });
  }, [sortedSectors]);

  /*
   * Once globe is ready:
   * India becomes the center of the globe.
   */
  function handleGlobeReady() {
    if (!globeRef.current) return;

    globeRef.current.pointOfView(
      {
        lat: INDIA_LAT,
        lng: INDIA_LNG,
        altitude: 1.65,
      },
      1200
    );

    const controls = globeRef.current.controls();

    if (controls) {
      controls.autoRotate = false;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.enableRotate = true;
    }
  }

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-cyan-500/20 bg-[#010914] shadow-2xl">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[650px] w-[650px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/5 blur-3xl" />

        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(34,211,238,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.06) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-50 px-4 pt-7 text-center md:px-8 md:pt-8">
        <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-400 md:text-xs">
          Live Market Data • Weighted Analysis
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-wide text-white md:text-4xl">
          NIFTY 50
        </h1>

        <p className="mt-1 text-xs font-medium tracking-[0.3em] text-slate-400 md:text-sm">
          SECTOR INTELLIGENCE
        </p>
      </div>

      {/* Main Area */}
      <div className="relative mx-auto mt-5 h-[700px] max-w-[1250px] px-2 md:h-[720px] md:px-5">
        {/* Connector lines */}
        <svg
          className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full md:block"
          viewBox="0 0 1000 700"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="sectorGlow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />

              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {sortedSectors.map((sector, index) => {
            const point = CONNECTOR_POINTS[index];

            if (!point) return null;

            const score = Number(sector.score || 0);

            const color =
              score > 5
                ? "#22c55e"
                : score < -5
                ? "#ef4444"
                : "#facc15";

            return (
              <line
                key={`connector-${sector.sector}`}
                x1={point.x}
                y1={point.y}
                x2="500"
                y2="350"
                stroke={color}
                strokeWidth="1.3"
                strokeDasharray="5 7"
                opacity="0.55"
                filter="url(#sectorGlow)"
              />
            );
          })}
        </svg>

        {/* Sector Cards */}
        <div className="absolute inset-0 z-30 hidden md:grid md:grid-cols-5 md:grid-rows-5">
          {sortedSectors.map((sector, index) => {
            const slot = SECTOR_SLOTS[index];

            if (!slot) return null;

            const score = Number(sector.score || 0);
            const performance = Number(sector.performance || 0);
            const weight = Number(sector.sectorWeight || 0);

            return (
              <div
                key={sector.sector}
                className="relative flex items-center justify-center p-2"
                style={{
                  gridRow: slot.row,
                  gridColumn: slot.col,
                }}
              >
                <div
                  className={`w-[175px] rounded-xl border bg-[#020812]/95 p-3 backdrop-blur-xl transition-all duration-300 hover:scale-105 ${getBorder(
                    score
                  )}`}
                  style={{
                    boxShadow: `0 0 22px ${getGlow(score)}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] font-bold uppercase tracking-wide text-slate-300">
                      {sector.sector}
                    </p>

                    <span className="shrink-0 text-[9px] text-slate-500">
                      {weight.toFixed(2)}%
                    </span>
                  </div>

                  <div
                    className={`mt-2 text-lg font-black ${getColor(score)}`}
                  >
                    {getArrow(performance)}{" "}
                    {performance >= 0 ? "+" : ""}
                    {performance.toFixed(2)}%
                  </div>

                  <div
                    className={`mt-1 text-[10px] font-bold ${getColor(
                      score
                    )}`}
                  >
                    Score {score >= 0 ? "+" : ""}
                    {score.toFixed(2)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3D Globe */}
        <div className="absolute left-1/2 top-1/2 z-20 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 md:h-[460px] md:w-[460px]">
          <div className="absolute inset-[-30px] rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative h-full w-full overflow-hidden rounded-full">
            <Globe
              ref={globeRef}
              width={460}
              height={460}
              backgroundColor="rgba(0,0,0,0)"

              globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"

              bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"

              backgroundImageUrl="https://unpkg.com/three-globe/example/img/night-sky.png"

              showAtmosphere={true}
              atmosphereColor="#22d3ee"
              atmosphereAltitude={0.18}

              /*
               * INDIA MAP
               */
              polygonsData={indiaPolygon ? [indiaPolygon] : []}

              polygonGeoJsonGeometry="geometry"

              polygonAltitude={0.035}

              polygonCapColor={() => "rgba(34, 211, 238, 0.70)"}

              polygonSideColor={() => "rgba(34, 211, 238, 0.25)"}

              polygonStrokeColor={() => "#67e8f9"}

              polygonLabel={() => `
                <div style="
                  background:#020812;
                  border:1px solid #22d3ee;
                  padding:8px 12px;
                  border-radius:8px;
                  color:#67e8f9;
                  font-size:12px;
                  font-weight:700;
                ">
                  INDIA
                </div>
              `}

              polygonsTransitionDuration={800}

              pointsData={pointsData}
              pointLat="lat"
              pointLng="lng"
              pointColor="color"
              pointAltitude={0.04}
              pointRadius={0.65}
              pointResolution={12}
              enablePointerInteraction={true}

              /*
               * IMPORTANT:
               * No automatic rotation.
               * India stays visible.
               */
              onGlobeReady={handleGlobeReady}

              controlsOptions={{
                enableZoom: false,
                minDistance: 250,
                maxDistance: 250,
              }}
            />
          </div>

          {/* Center label */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-full border border-cyan-400/30 bg-slate-950/45 px-7 py-5 text-center backdrop-blur-[2px]">
              <p className="text-xl font-black tracking-wider text-white md:text-2xl">
                NIFTY 50
              </p>

              <p className="mt-1 text-[9px] uppercase tracking-[0.28em] text-cyan-300">
                INDIA MARKET
              </p>
            </div>
          </div>
        </div>

        {/* Mobile */}
        <div className="absolute inset-0 z-40 grid grid-cols-1 gap-2 overflow-y-auto p-3 md:hidden">
          {sortedSectors.map((sector) => {
            const score = Number(sector.score || 0);
            const performance = Number(sector.performance || 0);

            return (
              <div
                key={sector.sector}
                className={`rounded-xl border bg-slate-950/95 p-3 ${getBorder(
                  score
                )}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    {sector.sector}
                  </span>

                  <span className={`text-sm font-black ${getColor(score)}`}>
                    {getArrow(performance)}{" "}
                    {performance >= 0 ? "+" : ""}
                    {performance.toFixed(2)}%
                  </span>
                </div>

                <div
                  className={`mt-1 text-[10px] font-bold ${getColor(
                    score
                  )}`}
                >
                  Score {score >= 0 ? "+" : ""}
                  {score.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Summary */}
      <div className="relative z-50 grid grid-cols-1 gap-3 border-t border-cyan-500/10 bg-[#010710]/95 p-4 md:grid-cols-3 md:p-5">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">
            NIFTY 50 Sector Score
          </p>

          <p
            className={`mt-1 text-3xl font-black ${
              Number(overallScore) >= 0
                ? "text-green-400"
                : "text-red-400"
            }`}
          >
            {Number(overallScore) >= 0 ? "+" : ""}
            {Number(overallScore).toFixed(2)}
          </p>

          <p className="text-[9px] text-slate-600">
            Range −100 to +100
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">
            Overall Contribution
          </p>

          <p
            className={`mt-1 text-2xl font-black ${
              Number(overallPerformance) >= 0
                ? "text-green-400"
                : "text-red-400"
            }`}
          >
            {Number(overallPerformance) >= 0 ? "+" : ""}
            {Number(overallPerformance).toFixed(2)}%
          </p>

          <p className="text-[9px] text-slate-600">
            Weighted NIFTY 50 contribution
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">
            Weight Covered
          </p>

          <p className="mt-1 text-2xl font-black text-cyan-400">
            {Number(weightTotal).toFixed(2)}%
          </p>

          <p className="text-[9px] text-slate-600">
            50 / 50 NIFTY stocks
          </p>
        </div>
      </div>
    </div>
  );
}