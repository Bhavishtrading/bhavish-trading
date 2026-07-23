// src/services/oiHistory.js

const history = [];

export function addSnapshot(snapshot) {
  history.push({
    time: new Date().toLocaleTimeString("en-IN", {
      hour12: false,
    }),
    chain: structuredClone(snapshot),
  });

  // Keep last 100 snapshots
  if (history.length > 100) {
    history.shift();
  }
}

export function getHistory() {
  return history;
}

export function getLatestSnapshot() {
  if (history.length === 0) return null;
  return history[history.length - 1];
}

export function getPreviousSnapshot() {
  if (history.length < 2) return null;
  return history[history.length - 2];
}

export function clearHistory() {
  history.length = 0;
}

export function historySize() {
  return history.length;
}