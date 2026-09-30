import { getCrudeOilOptions } from "@/services/zerodha/instruments";
import { getQuotes } from "@/services/zerodha/quotes";

// =====================================================
// GET ACTIVE CRUDE OPTION EXPIRY
// =====================================================

function getActiveCrudeOptions(options) {
  if (!options || options.length === 0) {
    return {
      expiry: null,
      options: [],
    };
  }

  const today = new Date();

  const todayDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  // Get all future expiries
  const expiries = [
    ...new Set(
      options
        .filter((item) => item.expiry)
        .map((item) => {
          const expiry = new Date(item.expiry);

          return new Date(
            expiry.getFullYear(),
            expiry.getMonth(),
            expiry.getDate()
          ).getTime();
        })
    ),
  ]
    .filter((timestamp) => timestamp >= todayDate.getTime())
    .sort((a, b) => a - b);

  if (!expiries.length) {
    return {
      expiry: null,
      options: [],
    };
  }

  // Nearest active expiry
  const activeExpiryTimestamp = expiries[0];

  const activeOptions = options.filter((item) => {
    if (!item.expiry) {
      return false;
    }

    const expiry = new Date(item.expiry);

    const expiryDate = new Date(
      expiry.getFullYear(),
      expiry.getMonth(),
      expiry.getDate()
    );

    return expiryDate.getTime() === activeExpiryTimestamp;
  });

  return {
    expiry: new Date(activeExpiryTimestamp),
    options: activeOptions,
  };
}


// =====================================================
// GET CRUDE PCR
// =====================================================

export async function getCrudePCR() {
  console.log("======================================");
  console.log("CRUDE PCR CALCULATION");
  console.log("======================================");

  // Get all Crude option contracts
  const allOptions = await getCrudeOilOptions();

  console.log(
    "TOTAL CRUDE OPTIONS:",
    allOptions.length
  );

  // Find nearest active expiry
  const {
    expiry,
    options,
  } = getActiveCrudeOptions(allOptions);

  if (!expiry || !options.length) {
    throw new Error(
      "No active CRUDEOIL options found"
    );
  }

  console.log(
    "ACTIVE CRUDE OPTION EXPIRY:",
    expiry
  );

  console.log(
    "ACTIVE EXPIRY OPTIONS:",
    options.length
  );

  // ===================================================
  // Separate CE / PE
  // ===================================================

  const ceOptions = options.filter(
    (item) =>
      item.instrument_type === "CE"
  );

  const peOptions = options.filter(
    (item) =>
      item.instrument_type === "PE"
  );

  console.log(
    "CE OPTIONS:",
    ceOptions.length
  );

  console.log(
    "PE OPTIONS:",
    peOptions.length
  );

  // ===================================================
  // Create Zerodha quote symbols
  // ===================================================

  const symbols = options.map(
    (item) =>
      `MCX:${item.tradingsymbol}`
  );

  // ===================================================
  // Fetch live OI
  // ===================================================

  const quotes = await getQuotes(symbols);

  // ===================================================
  // Calculate total CE OI
  // ===================================================

  let totalCEOI = 0;

  ceOptions.forEach((option) => {
    const symbol =
      `MCX:${option.tradingsymbol}`;

    const quote = quotes[symbol];

    totalCEOI += Number(
      quote?.oi || 0
    );
  });

  // ===================================================
  // Calculate total PE OI
  // ===================================================

  let totalPEOI = 0;

  peOptions.forEach((option) => {
    const symbol =
      `MCX:${option.tradingsymbol}`;

    const quote = quotes[symbol];

    totalPEOI += Number(
      quote?.oi || 0
    );
  });

  // ===================================================
  // PCR
  // ===================================================

  const pcr =
    totalCEOI > 0
      ? totalPEOI / totalCEOI
      : 0;

  console.log(
    "======================================"
  );

  console.log({
    expiry,
    ceOptions: ceOptions.length,
    peOptions: peOptions.length,
    totalCEOI,
    totalPEOI,
    pcr,
  });

  console.log(
    "======================================"
  );

  return {
    expiry,
    ceOI: totalCEOI,
    peOI: totalPEOI,
    pcr,
    ceCount: ceOptions.length,
    peCount: peOptions.length,
  };
}