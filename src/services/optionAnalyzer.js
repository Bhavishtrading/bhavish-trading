export function analyzeOptionChain(chain) {
  let totalCallOI = 0;
  let totalPutOI = 0;

  let highestCallOI = 0;
  let highestPutOI = 0;

  let callResistance = null;
  let putSupport = null;

  for (const row of chain) {
    const ceOI = row.ce?.oi ?? 0;
    const peOI = row.pe?.oi ?? 0;

    totalCallOI += ceOI;
    totalPutOI += peOI;

    if (ceOI > highestCallOI) {
      highestCallOI = ceOI;
      callResistance = row.strike;
    }

    if (peOI > highestPutOI) {
      highestPutOI = peOI;
      putSupport = row.strike;
    }
  }

  const pcr =
    totalCallOI === 0
      ? 0
      : Number((totalPutOI / totalCallOI).toFixed(2));

  return {
    totalCallOI,
    totalPutOI,
    pcr,

    highestCallOI,
    highestPutOI,

    resistance: callResistance,
    support: putSupport,
  };
}
