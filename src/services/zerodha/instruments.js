import { getKiteClient } from "./client";
import { getAccessToken } from "./session";

const globalCache = globalThis;

// =====================================================
// NFO CACHE
// =====================================================
if (!globalCache.nfoInstrumentCache) {
  globalCache.nfoInstrumentCache = {
    instruments: null,
    loadedAt: null,
  };
}

// =====================================================
// MCX CACHE
// =====================================================
if (!globalCache.mcxInstrumentCache) {
  globalCache.mcxInstrumentCache = {
    instruments: null,
    loadedAt: null,
  };
}

// =====================================================
// GET ALL NFO INSTRUMENTS
// =====================================================
export async function getAllNFOInstruments() {
  if (globalCache.nfoInstrumentCache.instruments) {
    console.log(
      "Using Cached NFO Instruments:",
      globalCache.nfoInstrumentCache.instruments.length
    );

    return globalCache.nfoInstrumentCache.instruments;
  }

  const accessToken = await getAccessToken();

  const kite = getKiteClient();
  kite.setAccessToken(accessToken);

  console.log("Downloading Zerodha NFO Instruments...");

  const instruments = await kite.getInstruments(["NFO"]);

  globalCache.nfoInstrumentCache.instruments = instruments;
  globalCache.nfoInstrumentCache.loadedAt = new Date();

  console.log("Downloaded NFO:", instruments.length);

  return instruments;
}

// =====================================================
// GET ALL MCX INSTRUMENTS
// =====================================================
export async function getAllMCXInstruments() {
  if (globalCache.mcxInstrumentCache.instruments) {
    console.log(
      "Using Cached MCX Instruments:",
      globalCache.mcxInstrumentCache.instruments.length
    );

    return globalCache.mcxInstrumentCache.instruments;
  }

  const accessToken = await getAccessToken();

  const kite = getKiteClient();
  kite.setAccessToken(accessToken);

  console.log("Downloading Zerodha MCX Instruments...");

  const instruments = await kite.getInstruments(["MCX"]);

  globalCache.mcxInstrumentCache.instruments = instruments;
  globalCache.mcxInstrumentCache.loadedAt = new Date();

  console.log("Downloaded MCX:", instruments.length);

  return instruments;
}

// =====================================================
// GET NIFTY OPTIONS
// =====================================================
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

// =====================================================
// GET CRUDE OIL FUTURES
// =====================================================
export async function getCrudeOilFutures() {
  const instruments = await getAllMCXInstruments();

  const crude = instruments.filter(
    (item) =>
      item.name === "CRUDEOIL" &&
      item.segment === "MCX-FUT"
  );

  console.log("CRUDE FUTURES COUNT:", crude.length);

  return crude;
}
// =====================================================
// GET CURRENT CRUDE OIL FUTURE
// =====================================================
export async function getCurrentCrudeFuture() {
  const crude = await getCrudeOilFutures();

  const today = new Date();

  const activeContracts = crude
    .filter((item) => {
      if (!item.expiry) return false;

      const expiryDate = new Date(item.expiry);

      return expiryDate >= today;
    })
    .sort((a, b) => {
      return new Date(a.expiry) - new Date(b.expiry);
    });

  if (activeContracts.length === 0) {
    throw new Error("No active CRUDEOIL futures contract found");
  }

  const currentContract = activeContracts[0];

  console.log("CURRENT CRUDE CONTRACT:", {
    tradingsymbol: currentContract.tradingsymbol,
    instrument_token: currentContract.instrument_token,
    expiry: currentContract.expiry,
  });

  return currentContract;
}

// =====================================================
// CLEAR INSTRUMENT CACHE
// =====================================================
export function clearInstrumentCache() {
  globalCache.nfoInstrumentCache.instruments = null;
  globalCache.nfoInstrumentCache.loadedAt = null;

  globalCache.mcxInstrumentCache.instruments = null;
  globalCache.mcxInstrumentCache.loadedAt = null;
}