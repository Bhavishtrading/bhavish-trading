// src/services/oiTrendEngine.js

import { getHistory } from "./oiHistory";

export function analyzeOITrend() {
  const history = getHistory();

  if (history.length < 2) {
    return [];
  }

 const latest = history[history.length - 1];
const oldest = history[0];

  const trend = latest.map((current) => {
    const previous = oldest.find(
      (item) => item.strike === current.strike
    );

    if (!previous) return null;

    const ceDiff = current.ce.oi - previous.ce.oi;
    const peDiff = current.pe.oi - previous.pe.oi;

    const cePct =
      previous.ce.oi > 0
        ? (ceDiff / previous.ce.oi) * 100
        : 0;

    const pePct =
      previous.pe.oi > 0
        ? (peDiff / previous.pe.oi) * 100
        : 0;

    return {
      strike: current.strike,

      ce: {
        startOI: previous.ce.oi,
        currentOI: current.ce.oi,
        diff: ceDiff,
        pct: Number(cePct.toFixed(2)),
        trend:
          ceDiff > 0
            ? "Increasing"
            : ceDiff < 0
            ? "Decreasing"
            : "Flat",
      },

      pe: {
        startOI: previous.pe.oi,
        currentOI: current.pe.oi,
        diff: peDiff,
        pct: Number(pePct.toFixed(2)),
        trend:
          peDiff > 0
            ? "Increasing"
            : peDiff < 0
            ? "Decreasing"
            : "Flat",
      },
    };
  }).filter(Boolean);

  console.log("==================================");
  console.log("OI TREND ENGINE");

  console.table(
    trend.map((x) => ({
      Strike: x.strike,
      CE_Trend: x.ce.trend,
      CE_Pct: `${x.ce.pct}%`,
      PE_Trend: x.pe.trend,
      PE_Pct: `${x.pe.pct}%`,
    }))
  );

  console.log("==================================");

  return trend;
}