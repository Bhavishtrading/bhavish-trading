export function analyzeOILeaders(chain = []) {
  if (!chain.length) {
    return {
      callWriting: null,
      putWriting: null,
    };
  }

  let callWriting = null;
  let putWriting = null;

  for (const row of chain) {
    if (
      row.ce &&
      (!callWriting || row.ce.oi > callWriting.oi)
    ) {
      callWriting = {
        strike: row.strike,
        oi: row.ce.oi,
        volume: row.ce.volume,
      };
    }

    if (
      row.pe &&
      (!putWriting || row.pe.oi > putWriting.oi)
    ) {
      putWriting = {
        strike: row.strike,
        oi: row.pe.oi,
        volume: row.pe.volume,
      };
    }
  }

  return {
    callWriting,
    putWriting,
  };
}