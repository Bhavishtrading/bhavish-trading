import { getKiteClient } from "./client";

export async function generateSession(requestToken) {
  const kite = getKiteClient();

  const session = await kite.generateSession(
    requestToken,
    process.env.KITE_API_SECRET
  );

  kite.setAccessToken(session.access_token);

  return session;
}