import { cookies } from "next/headers";

const COOKIE_NAME = "zerodha_access_token";

// Get Access Token
export async function getAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value || null;
}

// Check Login Status
export async function isLoggedIn() {
  const token = await getAccessToken();
  return !!token;
}

// Get User
export async function getUser() {
  const token = await getAccessToken();

  if (!token) {
    return null;
  }

  return {
    user_name: "Zerodha User",
    user_id: "ZERODHA",
    email: "",
    broker: "Zerodha",
  };
}

// Clear Session
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}