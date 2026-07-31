// src/services/oiTrendEngine.js

import { getHistory } from "./oiHistory";

export function analyzeOITrend() {
  const history = getHistory();

  if (history.length < 2) {
    return [];
  }

  // Compare Latest Snapshot with Previous Snapshot
  const latest = history[history.length - 1];
  const previous = history[history.length - 2];

  const trend = latest
    .map((current) => {
      const prev = previous.find(
        (item) => item.strike === current.strike
      );

      if (!prev) return null;

      const ceDiff = current.ce.oi - prev.ce.oi;
      const peDiff = current.pe.oi - prev.pe.oi;

      const cePct =
        prev.ce.oi > 0
          ? (ceDiff / prev.ce.oi) * 100
          : 0;

      const pePct =
        prev.pe.oi > 0
          ? (peDiff / prev.pe.oi) * 100
          : 0;

      let signal = "Neutral";

      // OI Classification
      if (ceDiff > 0 && peDiff < 0) {
        signal = "Short Build-up";
      } else if (ceDiff < 0 && peDiff > 0) {
        signal = "Long Build-up";
      } else if (ceDiff < 0 && peDiff < 0) {
        signal = "Short Covering";
      } else if (ceDiff > 0 && peDiff > 0) {
        signal = "Long Unwinding";
      }

      let marketBias = "Neutral";

      if (signal === "Long Build-up") {
        marketBias = "Bullish";
      } else if (signal === "Short Covering") {
        marketBias = "Bullish";
      } else if (signal === "Short Build-up") {
        marketBias = "Bearish";
      } else if (signal === "Long Unwinding") {
        marketBias = "Bearish";
      }

      return {
        strike: current.strike,

        ce: {
          startOI: prev.ce.oi,
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
          startOI: prev.pe.oi,
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

        signal,
        marketBias,
      };
    })
    .filter(Boolean);

  console.log("==================================");
  console.log("OI TREND ENGINE V3");
  console.log("Snapshots:", history.length);

  console.table(
    trend.map((x) => ({
      Strike: x.strike,
      CE_Diff: x.ce.diff,
      CE_Pct: `${x.ce.pct}%`,
      PE_Diff: x.pe.diff,
      PE_Pct: `${x.pe.pct}%`,
      Signal: x.signal,
      Bias: x.marketBias,
    }))
  );

  console.log("==================================");

  return trend;
}