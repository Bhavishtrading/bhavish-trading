export function getOIChangeSummary(changes = []) {
  if (!changes.length) {
    return {
      topCEIncrease: [],
      topPEIncrease: [],
      topCEDecrease: [],
      topPEDecrease: [],
    };
  }

  const valid = changes.filter(Boolean);

  return {
    topCEIncrease: [...valid]
      .sort((a, b) => b.ce.oiDiff - a.ce.oiDiff)
      .slice(0, 5),

    topPEIncrease: [...valid]
      .sort((a, b) => b.pe.oiDiff - a.pe.oiDiff)
      .slice(0, 5),

    topCEDecrease: [...valid]
      .sort((a, b) => a.ce.oiDiff - b.ce.oiDiff)
      .slice(0, 5),

    topPEDecrease: [...valid]
      .sort((a, b) => a.pe.oiDiff - b.pe.oiDiff)
      .slice(0, 5),
  };
}