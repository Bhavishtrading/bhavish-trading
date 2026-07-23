export function analyzeOIChange(previous, current) {
  if (!previous || !current) {
    return [];
  }

  return current.map((currRow) => {
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
    },

    pe: {
      oldPrice: 0,
      newPrice: currRow.pe.ltp,
      oldOI: 0,
      newOI: currRow.pe.oi,
      signal: "No Previous Data",
    },
  };
}

    const ceOldOI = prevRow.ce.oi;
    const ceNewOI = currRow.ce.oi;

    const ceOldPrice = prevRow.ce.ltp;
    const ceNewPrice = currRow.ce.ltp;

    const peOldOI = prevRow.pe.oi;
    const peNewOI = currRow.pe.oi;

    const peOldPrice = prevRow.pe.ltp;
    const peNewPrice = currRow.pe.ltp;

    const ceSignal = classify(
      ceOldPrice,
      ceNewPrice,
      ceOldOI,
      ceNewOI
    );

    const peSignal = classify(
      peOldPrice,
      peNewPrice,
      peOldOI,
      peNewOI
    );

    return {
      strike: currRow.strike,

      ce: {
        oldPrice: ceOldPrice,
        newPrice: ceNewPrice,
        oldOI: ceOldOI,
        newOI: ceNewOI,
        signal: ceSignal,
      },

      pe: {
        oldPrice: peOldPrice,
        newPrice: peNewPrice,
        oldOI: peOldOI,
        newOI: peNewOI,
        signal: peSignal,
      },
    };
  });
}

function classify(oldPrice, newPrice, oldOI, newOI) {
  const priceUp = newPrice > oldPrice;
  const priceDown = newPrice < oldPrice;

  const oiUp = newOI > oldOI;
  const oiDown = newOI < oldOI;

  if (priceUp && oiUp) {
    return "Long Build-up";
  }

  if (priceDown && oiUp) {
    return "Short Build-up";
  }

  if (priceUp && oiDown) {
    return "Short Covering";
  }

  if (priceDown && oiDown) {
    return "Long Unwinding";
  }

  return "Neutral";
}