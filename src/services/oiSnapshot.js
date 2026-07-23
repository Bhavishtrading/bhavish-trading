let previousSnapshot = null;

export function saveSnapshot(chain) {
  previousSnapshot = chain.map((row) => ({
    strike: row.strike,
    ce: {
      oi: row.ce?.oi ?? 0,
      ltp: row.ce?.ltp ?? 0,
    },
    pe: {
      oi: row.pe?.oi ?? 0,
      ltp: row.pe?.ltp ?? 0,
    },
  }));
}

export function getPreviousSnapshot() {
  return previousSnapshot;
}

export function hasSnapshot() {
  return previousSnapshot !== null;
}