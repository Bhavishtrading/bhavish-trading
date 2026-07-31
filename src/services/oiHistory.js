import fs from "fs";
import path from "path";

const HISTORY_FILE = path.join(
  process.cwd(),
  "data",
  "history.json"
);

const MAX_HISTORY = 10;

// ====================================
// Read History
// ====================================
function readHistory() {
  try {
    if (!fs.existsSync(HISTORY_FILE)) {
      return [];
    }

    const data = fs.readFileSync(
      HISTORY_FILE,
      "utf8"
    );

    if (!data) return [];

    return JSON.parse(data);
  } catch (err) {
    console.error("History Read Error", err);
    return [];
  }
}

// ====================================
// Write History
// ====================================
function writeHistory(history) {
  fs.writeFileSync(
    HISTORY_FILE,
    JSON.stringify(history, null, 2),
    "utf8"
  );
}

// ====================================
// Add Snapshot
// ====================================
export function addSnapshot(snapshot) {

  const history = readHistory();

  history.push(snapshot);

  while (history.length > MAX_HISTORY) {
    history.shift();
  }

  writeHistory(history);

  console.log("==================================");
  console.log("📚 History Updated");
  console.log("Snapshots :", history.length);
  console.log("==================================");
}

// ====================================
// Get History
// ====================================
export function getHistory() {
  return readHistory();
}

// ====================================
// History Size
// ====================================
export function historySize() {
  return readHistory().length;
}

// ====================================
// Clear History
// ====================================
export function clearHistory() {
  writeHistory([]);
}

// ====================================
// Analyze Trend
// ====================================
export function analyzeOITrend() {

  const history = readHistory();

  if (history.length < 2) {
    return [];
  }

  return history;
}