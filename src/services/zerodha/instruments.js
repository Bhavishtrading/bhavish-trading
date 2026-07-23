import { getKiteClient } from "./client";
import { getAccessToken } from "./session";

const globalCache = globalThis;

if (!globalCache.nfoInstrumentCache) {
  globalCache.nfoInstrumentCache = {
    instruments: null,
    loadedAt: null,
  };
}

export async function getAllNFOInstruments() {
  if (globalCache.nfoInstrumentCache.instruments) {
    console.log(
      "Using Cached Instruments:",
      globalCache.nfoInstrumentCache.instruments.length
    );

    return globalCache.nfoInstrumentCache.instruments;
  }

  const accessToken = await getAccessToken();

  const kite = getKiteClient();
  kite.setAccessToken(accessToken);

  console.log("Downloading Zerodha Instruments...");

  const instruments = await kite.getInstruments(["NFO"]);

  globalCache.nfoInstrumentCache.instruments = instruments;
  globalCache.nfoInstrumentCache.loadedAt = new Date();

  console.log("Downloaded:", instruments.length);

  return instruments;
}

export async function getNiftyOptions() {
  const instruments = await getAllNFOInstruments();

  const options = instruments.filter(
    (item) =>
      item.name === "NIFTY" &&
      item.segment === "NFO-OPT" &&
      (item.instrument_type === "CE" ||
        item.instrument_type === "PE")
  );

  console.log("NIFTY OPTION COUNT:", options.length);

  return options;
}

export function clearInstrumentCache() {
  globalCache.nfoInstrumentCache.instruments = null;
  globalCache.nfoInstrumentCache.loadedAt = null;
}