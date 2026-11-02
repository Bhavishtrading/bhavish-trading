
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const TOKEN_KEY = "bhavish:oi-bot:zerodha:access-token";

// Store token securely in Redis for a maximum of 24 hours
export async function saveOIBotAccessToken(accessToken) {
  if (!accessToken || typeof accessToken !== "string") {
    throw new Error("Invalid Zerodha access token");
  }

  await redis.set(TOKEN_KEY, accessToken, {
    ex: 60 * 60 * 24,
  });

  return { success: true };
}

// Read token for server-side OI BOT capture
export async function getOIBotAccessToken() {
  const token = await redis.get(TOKEN_KEY);
  return token || null;
}

// Remove expired or invalid token
export async function clearOIBotAccessToken() {
  await redis.del(TOKEN_KEY);
  return { success: true };
}
