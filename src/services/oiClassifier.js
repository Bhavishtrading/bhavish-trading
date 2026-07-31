// =======================================
// OI Classifier Engine
// =======================================

export function classifyOIChanges(previousChain, currentChain) {
  if (!previousChain || !currentChain) {
    return [];
  }

  const result = [];

  for (const current of currentChain) {
    const previous = previousChain.find(
      (x) => x.strike === current.strike
    );

    if (!previous) continue;

    // ---------- CE ----------
    const ceOldOI = previous.ce?.oi ?? 0;
    const ceNewOI = current.ce?.oi ?? 0;

    const ceOldPrice = previous.ce?.ltp ?? 0;
    const ceNewPrice = current.ce?.ltp ?? 0;

    const ceSignal = getSignal(
      ceNewPrice - ceOldPrice,
      ceNewOI - ceOldOI
    );

    // ---------- PE ----------
    const peOldOI = previous.pe?.oi ?? 0;
    const peNewOI = current.pe?.oi ?? 0;

    const peOldPrice = previous.pe?.ltp ?? 0;
    const peNewPrice = current.pe?.ltp ?? 0;

    const peSignal = getSignal(
      peNewPrice - peOldPrice,
      peNewOI - peOldOI
    );

    result.push({
      strike: current.strike,

      ce: {
        signal: ceSignal,
      },

      pe: {
        signal: peSignal,
      },
    });
  }

  return result;
}

function getSignal(priceDiff, oiDiff) {
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