let cache = null;
let lastFetch = 0;

const SCRIP_MASTER_URL =
  "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json";

export async function getScripMaster() {
  const now = Date.now();

  // Cache for 1 hour
  if (cache && now - lastFetch < 60 * 60 * 1000) {
    return cache;
  }

  const response = await fetch(SCRIP_MASTER_URL);

  if (!response.ok) {
    throw new Error("Unable to download Scrip Master");
  }

  const data = await response.json();

  cache = data;
  lastFetch = now;

  return data;
}

export async function findInstrument(filterFn) {
  const instruments = await getScripMaster();

  return instruments.filter(filterFn);
}