export function analyzeOptionChain(chain) {
  let totalCallOI = 0;
  let totalPutOI = 0;

  let highestCallOI = 0;
  let highestPutOI = 0;

  let callResistance = null;
  let putSupport = null;

  // -----------------------------
  // PCR + Highest OI
  // -----------------------------
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

  // -----------------------------
  // REAL MAX PAIN
  // -----------------------------

  let maxPain = null;
  let minimumPain = Number.MAX_SAFE_INTEGER;

  for (const target of chain) {
    let totalPain = 0;

    for (const option of chain) {
      const strike = option.strike;

      const ceOI = option.ce?.oi ?? 0;
      const peOI = option.pe?.oi ?? 0;

      // Call writers loss
      if (strike < target.strike) {
        totalPain += (target.strike - strike) * ceOI;
      }

      // Put writers loss
      if (strike > target.strike) {
        totalPain += (strike - target.strike) * peOI;
      }
    }

    if (totalPain < minimumPain) {
      minimumPain = totalPain;
      maxPain = target.strike;
    }
  }

  console.log("==================================");
  console.log("OPTION ANALYZER");

  console.table({
    PCR: pcr,
    Support: putSupport,
    Resistance: callResistance,
    MaxPain: maxPain,
  });

  return {
    totalCallOI,
    totalPutOI,

    pcr,

    highestCallOI,
    highestPutOI,

    resistance: callResistance,
    support: putSupport,

    maxPain,
  };
}