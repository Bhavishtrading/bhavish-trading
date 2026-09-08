import { getKiteClient } from "./client";
import { getAccessToken } from "./session";

const BATCH_SIZE = 100;

export async function getQuotes(symbols) {
  if (!symbols || symbols.length === 0) {
    return {};
  }

  const accessToken = await getAccessToken();

  const kite = getKiteClient();
  kite.setAccessToken(accessToken);

  console.log("==================================");
  console.log("📡 Fetching Quotes");
  console.log("Total Symbols:", symbols.length);

  const allQuotes = {};

  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);

    console.log(
      `Batch ${Math.floor(i / BATCH_SIZE) + 1} : ${batch.length} Symbols`
    );

    try {
      const quotes = await kite.getQuote(batch);

      Object.assign(allQuotes, quotes);

      console.log(
        `Received : ${Object.keys(quotes).length} Quotes`
      );
    } catch (err) {
      console.error(
        `Batch ${Math.floor(i / BATCH_SIZE) + 1} Failed`
      );
      console.error(err.message);
    }
  }

  console.log("==================================");
  console.log("Total Quotes:", Object.keys(allQuotes).length);
  console.log("==================================");

  return allQuotes;
}