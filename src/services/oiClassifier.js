export function classifyOIChanges(oiChanges) {
  const OI_THRESHOLD = 0.2;      // Ignore tiny OI changes
  const PRICE_THRESHOLD = 0.1;   // Ignore tiny price changes

  return oiChanges.map((item) => {
    return {
      strike: item.strike,
      ce: classifySide(item.ce),
      pe: classifySide(item.pe),
    };
  });

  function classifySide(side) {
    const oiPct = side.oiChangePct;
    const price = side.priceDiff;

    if (
      Math.abs(oiPct) < OI_THRESHOLD ||
      Math.abs(price) < PRICE_THRESHOLD
    ) {
      return {
        signal: "Neutral",
        oiChangePct: oiPct,
        priceDiff: price,
      };
    }

    if (oiPct > 0 && price > 0) {
      return {
        signal: "Long Build-up",
        oiChangePct: oiPct,
        priceDiff: price,
      };
    }

    if (oiPct > 0 && price < 0) {
      return {
        signal: "Short Build-up",
        oiChangePct: oiPct,
        priceDiff: price,
      };
    }

    if (oiPct < 0 && price > 0) {
      return {
        signal: "Short Covering",
        oiChangePct: oiPct,
        priceDiff: price,
      };
    }

    if (oiPct < 0 && price < 0) {
      return {
        signal: "Long Unwinding",
        oiChangePct: oiPct,
        priceDiff: price,
      };
    }

    return {
      signal: "Neutral",
      oiChangePct: oiPct,
      priceDiff: price,
    };
  }
}