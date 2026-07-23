import { cookies } from "next/headers";

const COOKIE_NAME = "zerodha_access_token";

export async function getAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value || null;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}