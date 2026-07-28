// src/services/oiAnalyzer.js

export function analyzeOIChange(previous, current) {
  if (!previous || !current) {
    return [];
  }

  const result = current.map((currRow) => {
    const prevRow = previous.find(
      (row) => row.strike === currRow.strike
    );

    if (!prevRow) {
      return {
        strike: currRow.strike,

        ce: {
          oldPrice: 0,
          newPrice: currRow.ce.ltp,
          oldOI: 0,
          newOI: currRow.ce.oi,
          signal: "No Previous Data",
          priceDiff: 0,
          oiDiff: 0,
        },

        pe: {
          oldPrice: 0,
          newPrice: currRow.pe.ltp,
          oldOI: 0,
          newOI: currRow.pe.oi,
          signal: "No Previous Data",
          priceDiff: 0,
          oiDiff: 0,
        },
      };
    }

    const ceOldPrice = prevRow.ce.ltp;
    const ceNewPrice = currRow.ce.ltp;
    const ceOldOI = prevRow.ce.oi;
    const ceNewOI = currRow.ce.oi;

    const peOldPrice = prevRow.pe.ltp;
    const peNewPrice = currRow.pe.ltp;
    const peOldOI = prevRow.pe.oi;
    const peNewOI = currRow.pe.oi;

    const cePriceDiff = Number((ceNewPrice - ceOldPrice).toFixed(2));
    const pePriceDiff = Number((peNewPrice - peOldPrice).toFixed(2));

    const ceOIDiff = ceNewOI - ceOldOI;
    const peOIDiff = peNewOI - peOldOI;

    return {
      strike: currRow.strike,

      ce: {
        oldPrice: ceOldPrice,
        newPrice: ceNewPrice,
        oldOI: ceOldOI,
        newOI: ceNewOI,
        priceDiff: cePriceDiff,
        oiDiff: ceOIDiff,
        signal: classify(ceOldPrice, ceNewPrice, ceOldOI, ceNewOI),
      },

      pe: {
        oldPrice: peOldPrice,
        newPrice: peNewPrice,
        oldOI: peOldOI,
        newOI: peNewOI,
        priceDiff: pePriceDiff,
        oiDiff: peOIDiff,
        signal: classify(peOldPrice, peNewPrice, peOldOI, peNewOI),
      },
    };
  });

  console.log("==================================");
  console.log("OI ANALYZER");

  console.table(
    result.map((r) => ({
      Strike: r.strike,
      CE: r.ce.signal,
      PE: r.pe.signal,
      CE_OI: r.ce.oiDiff,
      PE_OI: r.pe.oiDiff,
      CE_Price: r.ce.priceDiff,
      PE_Price: r.pe.priceDiff,
    }))
  );

  return result;
}

function classify(oldPrice, newPrice, oldOI, newOI) {
  const priceDiff = newPrice - oldPrice;
  const oiDiff = newOI - oldOI;

  if (priceDiff > 0 && oiDiff > 0) {
    return "Long Build-up";
  }

  if (priceDiff < 0 && oiDiff > 0) {
    return "Short Build-up";
  }

  if (priceDiff > 0 && oiDiff < 0) {
    return "Short Covering";
  }

  if (priceDiff < 0 && oiDiff < 0) {
    return "Long Unwinding";
  }

  return "Neutral";
}