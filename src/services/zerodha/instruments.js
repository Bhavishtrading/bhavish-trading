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

  if (!accessToken) {
    throw new Error("Zerodha access token not found");
  }

  const kite = getKiteClient();

  kite.setAccessToken(accessToken);

  console.log("Downloading Zerodha NFO Instruments...");

  const instruments =
    await kite.getInstruments(["NFO"]);

  globalCache.nfoInstrumentCache.instruments =
    instruments;

  globalCache.nfoInstrumentCache.loadedAt =
    new Date();

  console.log(
    "Downloaded NFO:",
    instruments.length
  );

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

  if (!accessToken) {
    throw new Error("Zerodha access token not found");
  }

  const kite = getKiteClient();

  kite.setAccessToken(accessToken);

  console.log("Downloading Zerodha MCX Instruments...");

  const instruments =
    await kite.getInstruments(["MCX"]);

  globalCache.mcxInstrumentCache.instruments =
    instruments;

  globalCache.mcxInstrumentCache.loadedAt =
    new Date();

  console.log(
    "Downloaded MCX:",
    instruments.length
  );

  return instruments;
}

// =====================================================
// GET NIFTY OPTIONS
// =====================================================
export async function getNiftyOptions() {
  const instruments =
    await getAllNFOInstruments();

  const options =
    instruments.filter(
      (item) =>
        item.name === "NIFTY" &&
        item.segment === "NFO-OPT" &&
        (
          item.instrument_type === "CE" ||
          item.instrument_type === "PE"
        )
    );

  console.log(
    "NIFTY OPTION COUNT:",
    options.length
  );

  return options;
}

// =====================================================
// GET NIFTY FUTURES
// =====================================================
export async function getNiftyFutures() {
  const instruments =
    await getAllNFOInstruments();

  const futures =
    instruments.filter(
      (item) =>
        item.name === "NIFTY" &&
        item.segment === "NFO-FUT" &&
        item.instrument_type === "FUT"
    );

  console.log(
    "NIFTY FUTURES COUNT:",
    futures.length
  );

  return futures;
}

// =====================================================
// GET CURRENT NIFTY FUTURE
// =====================================================
export async function getCurrentNiftyFuture() {
  const futures =
    await getNiftyFutures();

  if (!futures.length) {
    throw new Error(
      "No NIFTY futures contracts found"
    );
  }

  const today =
    new Date();

  const todayDate =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

  const activeContracts =
    futures
      .filter((item) => {
        if (!item.expiry) {
          return false;
        }

        const expiry =
          new Date(item.expiry);

        const expiryDate =
          new Date(
            expiry.getFullYear(),
            expiry.getMonth(),
            expiry.getDate()
          );

        return expiryDate >= todayDate;
      })
      .sort((a, b) => {
        return (
          new Date(a.expiry) -
          new Date(b.expiry)
        );
      });

  if (!activeContracts.length) {
    throw new Error(
      "No active NIFTY futures contract found"
    );
  }

  const currentContract =
    activeContracts[0];

  console.log(
    "======================================"
  );

  console.log(
    "CURRENT NIFTY FUTURE"
  );

  console.log(
    "======================================"
  );

  console.log({
    tradingsymbol:
      currentContract.tradingsymbol,

    instrument_token:
      currentContract.instrument_token,

    expiry:
      currentContract.expiry,

    lot_size:
      currentContract.lot_size,

    segment:
      currentContract.segment,

    instrument_type:
      currentContract.instrument_type,
  });

  console.log(
    "======================================"
  );

  return currentContract;
}

// =====================================================
// GET CRUDE OIL FUTURES
// =====================================================
export async function getCrudeOilFutures() {
  const instruments =
    await getAllMCXInstruments();

  const crude =
    instruments.filter(
      (item) =>
        item.name === "CRUDEOIL" &&
        item.segment === "MCX-FUT"
    );

  console.log(
    "CRUDE FUTURES COUNT:",
    crude.length
  );

  return crude;
}

// =====================================================
// GET CURRENT CRUDE OIL FUTURE
// =====================================================
export async function getCurrentCrudeFuture() {
  const crude =
    await getCrudeOilFutures();

  if (!crude.length) {
    throw new Error(
      "No CRUDEOIL futures contracts found"
    );
  }

  const today =
    new Date();

  const todayDate =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

  const activeContracts =
    crude
      .filter((item) => {
        if (!item.expiry) {
          return false;
        }

        const expiry =
          new Date(item.expiry);

        const expiryDate =
          new Date(
            expiry.getFullYear(),
            expiry.getMonth(),
            expiry.getDate()
          );

        return expiryDate >= todayDate;
      })
      .sort((a, b) => {
        return (
          new Date(a.expiry) -
          new Date(b.expiry)
        );
      });

  if (!activeContracts.length) {
    throw new Error(
      "No active CRUDEOIL futures contract found"
    );
  }

  const currentContract =
    activeContracts[0];

  console.log(
    "======================================"
  );

  console.log(
    "CURRENT CRUDE CONTRACT"
  );

  console.log(
    "======================================"
  );

  console.log({
    tradingsymbol:
      currentContract.tradingsymbol,

    instrument_token:
      currentContract.instrument_token,

    expiry:
      currentContract.expiry,
  });

  console.log(
    "======================================"
  );

  return currentContract;
}

// =====================================================
// GET SILVER MINI FUTURES
// =====================================================
export async function getSilverFutures() {
  const instruments =
    await getAllMCXInstruments();

  const silverMini =
    instruments.filter(
      (item) =>
        item.name === "SILVERM" &&
        item.segment === "MCX-FUT" &&
        item.instrument_type === "FUT"
    );

  console.log(
    "======================================"
  );

  console.log(
    "SILVER MINI FUTURES COUNT:",
    silverMini.length
  );

  console.log(
    "SILVER MINI CONTRACTS:"
  );

  console.log(
    silverMini.map((item) => ({
      tradingsymbol:
        item.tradingsymbol,

      expiry:
        item.expiry,

      instrument_token:
        item.instrument_token,

      lot_size:
        item.lot_size,

      segment:
        item.segment,

      instrument_type:
        item.instrument_type,
    }))
  );

  console.log(
    "======================================"
  );

  return silverMini;
}

// =====================================================
// GET CURRENT SILVER MINI FUTURE
// =====================================================
export async function getCurrentSilverFuture() {
  const silverMini =
    await getSilverFutures();

  if (!silverMini.length) {
    throw new Error(
      "No SILVERM futures contracts found"
    );
  }

  const today =
    new Date();

  const todayDate =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

  const activeContracts =
    silverMini
      .filter((item) => {
        if (!item.expiry) {
          return false;
        }

        const expiry =
          new Date(item.expiry);

        const expiryDate =
          new Date(
            expiry.getFullYear(),
            expiry.getMonth(),
            expiry.getDate()
          );

        return expiryDate >= todayDate;
      })
      .sort((a, b) => {
        return (
          new Date(a.expiry) -
          new Date(b.expiry)
        );
      });

  if (!activeContracts.length) {
    throw new Error(
      "No active SILVERM futures contract found"
    );
  }

  const currentContract =
    activeContracts[0];

  console.log(
    "======================================"
  );

  console.log(
    "CURRENT SILVER MINI CONTRACT"
  );

  console.log(
    "======================================"
  );

  console.log({
    tradingsymbol:
      currentContract.tradingsymbol,

    instrument_token:
      currentContract.instrument_token,

    expiry:
      currentContract.expiry,

    lot_size:
      currentContract.lot_size,

    segment:
      currentContract.segment,

    instrument_type:
      currentContract.instrument_type,
  });

  console.log(
    "======================================"
  );

  return currentContract;
}

// =====================================================
// CLEAR INSTRUMENT CACHE
// =====================================================
export function clearInstrumentCache() {
  globalCache.nfoInstrumentCache.instruments =
    null;

  globalCache.nfoInstrumentCache.loadedAt =
    null;

  globalCache.mcxInstrumentCache.instruments =
    null;

  globalCache.mcxInstrumentCache.loadedAt =
    null;
}