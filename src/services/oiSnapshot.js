// ==========================================
// OI Snapshot Engine
// Bhavish Trading V2
// ==========================================

let previousSnapshot = null;

/**
 * Save current option chain snapshot.
 * Deep clone is used so future updates
 * won't modify previous snapshot.
 */
export function saveSnapshot(chain) {
  if (!Array.isArray(chain)) return;

  previousSnapshot = structuredClone(chain);

  console.log("==================================");
  console.log("📸 Snapshot Saved");
  console.log(`Rows : ${previousSnapshot.length}`);
}

/**
 * Returns previous snapshot.
 */
export function getPreviousSnapshot() {
  return previousSnapshot;
}

/**
 * True if snapshot exists.
 */
export function hasSnapshot() {
  return previousSnapshot !== null;
}

/**
 * Clear snapshot.
 * Useful while restarting engine.
 */
export function clearSnapshot() {
  previousSnapshot = null;

  console.log("==================================");
  console.log("🗑 Snapshot Cleared");
}

/**
 * Returns age information.
 */
export function snapshotInfo() {
  return {
    exists: previousSnapshot !== null,
    rows: previousSnapshot?.length ?? 0,
  };
}