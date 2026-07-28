// ==========================================
// OI Change Engine
// Bhavish Trading V2
// ==========================================

export function calculateOIChange(previousChain, currentChain) {
  if (!previousChain || !currentChain) {
    return [];
  }

  const result = [];

  const oldAtm = previousChain.find((x) => x.strike === 23900);
const newAtm = currentChain.find((x) => x.strike === 23900);

console.log("========== OI DEBUG ==========");
console.log({
  oldCE: oldAtm?.ce?.oi,
  newCE: newAtm?.ce?.oi,
  oldPE: oldAtm?.pe?.oi,
  newPE: newAtm?.pe?.oi,
});

  for (const current of currentChain) {
    const previous = previousChain.find(
      (x) => x.strike === current.strike
    );

    if (!previous) continue;

    const ceOld = previous.ce?.oi ?? 0;
    const ceNew = current.ce?.oi ?? 0;

    const peOld = previous.pe?.oi ?? 0;
    const peNew = current.pe?.oi ?? 0;

    const ceDiff = ceNew - ceOld;
    const peDiff = peNew - peOld;

    result.push({
      strike: current.strike,

      ce: {
        oldOI: ceOld,
        newOI: ceNew,
        oiDiff: ceDiff,
        oiChangePct:
          ceOld === 0
            ? 0
            : Number(((ceDiff / ceOld) * 100).toFixed(2)),
      },

      pe: {
        oldOI: peOld,
        newOI: peNew,
        oiDiff: peDiff,
        oiChangePct:
          peOld === 0
            ? 0
            : Number(((peDiff / peOld) * 100).toFixed(2)),
      },
    });
  }

  console.log("==================================");
  console.log("📊 OI CHANGE ENGINE");

  console.table(
    result.map((row) => ({
      Strike: row.strike,
      CE_Diff: row.ce.oiDiff,
      PE_Diff: row.pe.oiDiff,
      CE_Pct: row.ce.oiChangePct + "%",
      PE_Pct: row.pe.oiChangePct + "%",
    }))
  );

  return result;
}