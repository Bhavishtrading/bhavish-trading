import { getKiteClient } from "./client";
import { getAccessToken } from "./session";

export async function getQuotes(symbols) {
  if (!symbols || symbols.length === 0) {
    return {};
  }

  const accessToken = await getAccessToken();

  const kite = getKiteClient();
  kite.setAccessToken(accessToken);

  console.log("==================================");
  console.log("📡 Fetching Quotes");
  console.log("Symbols:", symbols.length);

  const quotes = await kite.getQuote(symbols);

  console.log("Quotes Received:", Object.keys(quotes).length);
  console.log("==================================");

  return quotes;
}