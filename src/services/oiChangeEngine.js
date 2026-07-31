// =======================================
// OI Change Engine
// =======================================

export function calculateOIChange(previousChain, currentChain) {
  if (!previousChain || !currentChain) {
    return [];
  }

  const result = [];

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
        oi: ceNew,
        previousOI: ceOld,
        oiDiff: ceDiff,
        oiChangePct:
          ceOld > 0
            ? Number(((ceDiff / ceOld) * 100).toFixed(2))
            : 0,
      },

      pe: {
        oi: peNew,
        previousOI: peOld,
        oiDiff: peDiff,
        oiChangePct:
          peOld > 0
            ? Number(((peDiff / peOld) * 100).toFixed(2))
            : 0,
      },
    });
  }

  return result;
}