import axios from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";

const BASE_URL = "https://www.nseindia.com";

const jar = new CookieJar();

const client = wrapper(
  axios.create({
    jar,
    timeout: 30000,
    withCredentials: true,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: BASE_URL,
      Origin: BASE_URL,
      Connection: "keep-alive",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    validateStatus: () => true,
  })
);

let initialized = false;

export async function initializeNSE() {
  if (initialized) return;

  console.log("Initializing NSE Session...");

  await client.get(BASE_URL);
  await client.get(`${BASE_URL}/option-chain`);

  initialized = true;

  console.log("NSE Session Ready");
}

export function getNSEClient() {
  return client;
}

export function resetNSESession() {
  initialized = false;
}