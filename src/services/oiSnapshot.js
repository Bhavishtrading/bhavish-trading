import { Redis } from "@upstash/redis";

// ======================================================
// UPSTASH REDIS
// ======================================================

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// ======================================================
// REDIS KEY
// ======================================================

const SNAPSHOT_KEY = "bhavish:oi:previous_snapshot";

// ======================================================
// Save Snapshot
// ======================================================

export async function saveSnapshot(chain) {
  try {
    if (!Array.isArray(chain)) {
      throw new Error("Invalid snapshot chain");
    }

    await redis.set(
      SNAPSHOT_KEY,
      JSON.stringify(chain)
    );

    console.log("==================================");
    console.log("📸 Redis Snapshot Saved");
    console.log("Rows :", chain.length);
    console.log("Key  :", SNAPSHOT_KEY);
    console.log("==================================");

    return true;
  } catch (err) {
    console.error("❌ Redis Snapshot Save Error");
    console.error(err);

    return false;
  }
}

// ======================================================
// Read Previous Snapshot
// ======================================================

export async function getPreviousSnapshot() {
  try {
    const data = await redis.get(SNAPSHOT_KEY);

    console.log("==================================");
    console.log("🔍 REDIS SNAPSHOT READ");
    console.log("Exists:", !!data);

    let rows = 0;

    if (Array.isArray(data)) {
      rows = data.length;
    } else if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);

        if (Array.isArray(parsed)) {
          rows = parsed.length;
        }
      } catch {
        rows = 0;
      }
    }

    console.log("Rows:", rows);
    console.log("==================================");

    if (!data) {
      return null;
    }

    if (Array.isArray(data)) {
      return data;
    }

    if (typeof data === "string") {
      return JSON.parse(data);
    }

    return data;
  } catch (err) {
    console.error("❌ Redis Snapshot Read Error");
    console.error(err);

    return null;
  }
}

// ======================================================
// Has Snapshot
// ======================================================

export async function hasSnapshot() {
  try {
    const data = await redis.get(SNAPSHOT_KEY);

    if (!data) {
      console.log("📭 Redis Snapshot Does Not Exist");
      return false;
    }

    if (Array.isArray(data)) {
      return data.length > 0;
    }

    if (typeof data === "string") {
      const parsed = JSON.parse(data);

      return Array.isArray(parsed) && parsed.length > 0;
    }

    return false;
  } catch (err) {
    console.error("❌ Redis Snapshot Check Error");
    console.error(err);

    return false;
  }
}

// ======================================================
// Clear Snapshot
// ======================================================

export async function clearSnapshot() {
  try {
    await redis.del(SNAPSHOT_KEY);

    console.log("🗑️ Redis Snapshot Cleared");

    return true;
  } catch (err) {
    console.error("❌ Redis Snapshot Clear Error");
    console.error(err);

    return false;
  }
}