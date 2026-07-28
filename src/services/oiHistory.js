// ==========================================
// OI History Engine
// Bhavish Trading V2
// ==========================================

const MAX_HISTORY = 20;

const history = [];

/**
 * Add current option chain snapshot
 */
export function addSnapshot(chain) {
  if (!Array.isArray(chain)) return;

  history.push(structuredClone(chain));

  while (history.length > MAX_HISTORY) {
    history.shift();
  }

  console.log("==================================");
  console.log("📚 History Updated");
  console.log(`Snapshots : ${history.length}`);
}

/**
 * Returns latest snapshot
 */
export function getLatestSnapshot() {
  if (history.length === 0) return null;

  return history[history.length - 1];
}

/**
 * Returns previous snapshot
 */
export function getPreviousHistory() {
  if (history.length < 2) return null;

  return history[history.length - 2];
}

/**
 * Returns all snapshots
 */
export function getHistory() {
  return history;
}

/**
 * Returns history size
 */
export function historySize() {
  return history.length;
}

/**
 * Clear history
 */
export function clearHistory() {
  history.length = 0;

  console.log("==================================");
  console.log("🗑 History Cleared");
}