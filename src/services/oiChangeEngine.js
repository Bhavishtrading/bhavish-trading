// src/services/oiChangeEngine.js

export function calculateOIChange(previousChain, currentChain) {
  if (!previousChain || !currentChain) return [];

  console.log("========== OI CHANGE DEBUG ==========");
  console.log("Previous Chain Size:", previousChain.length);
  console.log("Current Chain Size :", currentChain.length);

  return currentChain.map((current) => {
    const previous = previousChain.find(
      (item) => item.strike === current.strike
    );

    if (!previous) return null;

    console.log("Strike:", current.strike);
    console.log("Previous CE OI:", previous.ce.oi);
    console.log("Current  CE OI:", current.ce.oi);
    console.log("Previous PE OI:", previous.pe.oi);
    console.log("Current  PE OI:", current.pe.oi);

    const ceOIDiff = current.ce.oi - previous.ce.oi;
    const peOIDiff = current.pe.oi - previous.pe.oi;

    console.log("CE Diff:", ceOIDiff);
    console.log("PE Diff:", peOIDiff);
    console.log("--------------------------------");

    const cePriceDiff = current.ce.ltp - previous.ce.ltp;
    const pePriceDiff = current.pe.ltp - previous.pe.ltp;

    const ceOIChangePct =
      previous.ce.oi > 0 ? (ceOIDiff / previous.ce.oi) * 100 : 0;

    const peOIChangePct =
      previous.pe.oi > 0 ? (peOIDiff / previous.pe.oi) * 100 : 0;

    return {
      strike: current.strike,
      ce: {
        oiDiff: ceOIDiff,
        oiChangePct: Number(ceOIChangePct.toFixed(2)),
        priceDiff: Number(cePriceDiff.toFixed(2)),
      },
      pe: {
        oiDiff: peOIDiff,
        oiChangePct: Number(peOIChangePct.toFixed(2)),
        priceDiff: Number(pePriceDiff.toFixed(2)),
      },
    };
  }).filter(Boolean);
}