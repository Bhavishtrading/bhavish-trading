// src/services/institutionalEngine.js

export function analyzeInstitutionalActivity(optionChain = []) {
  const result = {
    longBuildUp: [],
    shortBuildUp: [],
    shortCovering: [],
    longUnwinding: [],
    strongestCallWriting: null,
    strongestPutWriting: null,
  };

  for (const row of optionChain) {
    if (row.ce) {
      const oi = row.ce.oiChange ?? 0;
      const price =
        (row.ce.ltp ?? 0) - (row.ce.previousLtp ?? row.ce.ltp ?? 0);

      if (oi > 0 && price > 0)
        result.longBuildUp.push({
          strike: row.strike,
          side: "CE",
          oiChange: oi,
        });

      if (oi > 0 && price < 0)
        result.shortBuildUp.push({
          strike: row.strike,
          side: "CE",
          oiChange: oi,
        });

      if (oi < 0 && price > 0)
        result.shortCovering.push({
          strike: row.strike,
          side: "CE",
          oiChange: oi,
        });

      if (oi < 0 && price < 0)
        result.longUnwinding.push({
          strike: row.strike,
          side: "CE",
          oiChange: oi,
        });
    }

    if (row.pe) {
      const oi = row.pe.oiChange ?? 0;
      const price =
        (row.pe.ltp ?? 0) - (row.pe.previousLtp ?? row.pe.ltp ?? 0);

      if (oi > 0 && price > 0)
        result.longBuildUp.push({
          strike: row.strike,
          side: "PE",
          oiChange: oi,
        });

      if (oi > 0 && price < 0)
        result.shortBuildUp.push({
          strike: row.strike,
          side: "PE",
          oiChange: oi,
        });

      if (oi < 0 && price > 0)
        result.shortCovering.push({
          strike: row.strike,
          side: "PE",
          oiChange: oi,
        });

      if (oi < 0 && price < 0)
        result.longUnwinding.push({
          strike: row.strike,
          side: "PE",
          oiChange: oi,
        });
    }
  }

  if (result.shortBuildUp.length) {
    result.strongestCallWriting = [...result.shortBuildUp].sort(
      (a, b) => b.oiChange - a.oiChange
    )[0];
  }

  if (result.longBuildUp.length) {
    result.strongestPutWriting = [...result.longBuildUp].sort(
      (a, b) => b.oiChange - a.oiChange
    )[0];
  }

  console.log("==================================");
  console.log("INSTITUTIONAL ACTIVITY");

  console.table({
    LongBuildUp: result.longBuildUp.length,
    ShortBuildUp: result.shortBuildUp.length,
    ShortCovering: result.shortCovering.length,
    LongUnwinding: result.longUnwinding.length,
  });

  console.log("Strongest Call Writing");
  console.log(result.strongestCallWriting);

  console.log("Strongest Put Writing");
  console.log(result.strongestPutWriting);

  console.log("==================================");

  return result;
}