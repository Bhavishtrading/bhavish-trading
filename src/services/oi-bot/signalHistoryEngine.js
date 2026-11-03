
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const HISTORY_KEY = "bhavish:oi-bot:signal-history";
const CURRENT_SIGNAL_KEY = "bhavish:oi-bot:current-signal";

const MAX_HISTORY = 100;
const HISTORY_TTL = 7 * 24 * 60 * 60;

function parseItem(item) {
  if (!item) return null;

  try {
    return typeof item === "string"
      ? JSON.parse(item)
      : item;
  } catch {
    return null;
  }
}

export async function recordOIBotSignal({
  earlySignal,
  decision,
  marketConfirmation,
}) {
  try {
    if (!earlySignal || !earlySignal.status) {
      throw new Error("Early signal is missing");
    }

    const now = new Date().toISOString();

    const current = {
      status: earlySignal.status,
      direction: earlySignal.direction ?? "NEUTRAL",
      earlySignal: earlySignal.earlySignal === true,
      confirmed: earlySignal.confirmed === true,
      reason: earlySignal.reason ?? "",
      price: marketConfirmation?.price ?? null,
      volumeRatio:
        marketConfirmation?.volume?.volumeRatio ?? null,
      structure:
        marketConfirmation?.structure?.structure ?? null,
      decision: decision?.signal ?? "WAIT",
      capturedAt: now,
    };

    const previousRaw = await redis.get(CURRENT_SIGNAL_KEY);
    const previous = parseItem(previousRaw);

    // Avoid duplicate event when signal has not changed.
    const hasChanged =
      !previous ||
      previous.status !== current.status ||
      previous.direction !== current.direction ||
      previous.confirmed !== current.confirmed;

    if (!hasChanged) {
      return {
        success: true,
        recorded: false,
        reason: "Signal unchanged. Duplicate event skipped.",
        current,
      };
    }

    const event = {
      ...current,
      eventType: !previous
        ? "INITIAL_SIGNAL"
        : current.status === "WAIT"
          ? "SIGNAL_CANCELLED"
          : current.confirmed
            ? "SIGNAL_CONFIRMED"
            : "SIGNAL_CHANGED",
    };

    await redis
      .multi()
      .lpush(HISTORY_KEY, JSON.stringify(event))
      .ltrim(HISTORY_KEY, 0, MAX_HISTORY - 1)
      .expire(HISTORY_KEY, HISTORY_TTL)
      .set(CURRENT_SIGNAL_KEY, JSON.stringify(current), {
        ex: HISTORY_TTL,
      })
      .exec();

    return {
      success: true,
      recorded: true,
      event,
    };
  } catch (error) {
    console.error(
      "OI BOT SIGNAL HISTORY ERROR:",
      error.message
    );

    return {
      success: false,
      recorded: false,
      reason: error.message,
    };
  }
}

export async function getOIBotSignalHistory(limit = 50) {
  try {
    const safeLimit = Math.max(
      1,
      Math.min(Number(limit) || 50, MAX_HISTORY)
    );

    const rawHistory = await redis.lrange(
      HISTORY_KEY,
      0,
      safeLimit - 1
    );

    return {
      success: true,
      count: rawHistory.length,
      history: rawHistory
        .map(parseItem)
        .filter(Boolean),
    };
  } catch (error) {
    console.error(
      "OI BOT SIGNAL HISTORY READ ERROR:",
      error.message
    );

    return {
      success: false,
      count: 0,
      history: [],
      reason: error.message,
    };
  }
}
