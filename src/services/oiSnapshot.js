import fs from "fs";
import path from "path";

const SNAPSHOT_FILE = path.join(
  process.cwd(),
  "data",
  "snapshot.json"
);

// ================================
// Save Snapshot
// ================================
export function saveSnapshot(chain) {
  try {
    fs.writeFileSync(
      SNAPSHOT_FILE,
      JSON.stringify(chain, null, 2),
      "utf8"
    );

    console.log("==================================");
    console.log("📸 Snapshot Saved");
    console.log("Rows :", chain.length);
    console.log("File :", SNAPSHOT_FILE);
    console.log("==================================");
  } catch (err) {
    console.error("❌ Snapshot Save Error");
    console.error(err);
  }
}

// ================================
// Read Snapshot
// ================================
export function getPreviousSnapshot() {
  try {
    if (!fs.existsSync(SNAPSHOT_FILE)) {
      return null;
    }

    const data = fs.readFileSync(
      SNAPSHOT_FILE,
      "utf8"
    );

    if (!data) return null;

    return JSON.parse(data);
  } catch (err) {
    console.error("❌ Snapshot Read Error");
    console.error(err);
    return null;
  }
}

// ================================
// Has Snapshot
// ================================
export function hasSnapshot() {
  try {
    if (!fs.existsSync(SNAPSHOT_FILE)) {
      return false;
    }

    const data = JSON.parse(
      fs.readFileSync(SNAPSHOT_FILE, "utf8")
    );

    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

// ================================
// Clear Snapshot
// ================================
export function clearSnapshot() {
  fs.writeFileSync(
    SNAPSHOT_FILE,
    "[]",
    "utf8"
  );
}