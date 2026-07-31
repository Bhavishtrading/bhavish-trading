import { getOptionChain } from "./optionEngine";
import { getQuotes } from "./zerodha/quotes";

// =============================
// Get Live Option Data
// =============================
export async function getLiveOptionData(niftyLTP) {
  if (!niftyLTP) {
    throw new Error("Invalid NIFTY LTP");
  }

  // Get ATM ±10 Strikes
  const optionData = await getOptionChain(niftyLTP, 10);

  // Build Symbols
  const symbols = [];

  optionData.chain.forEach((item) => {
    if (item.ce) symbols.push(`NFO:${item.ce.tradingsymbol}`);
    if (item.pe) symbols.push(`NFO:${item.pe.tradingsymbol}`);
  });

  console.log("==================================");
  console.log("Fetching Option Quotes...");
  console.log(symbols);

  // Fetch Quotes
  const quotes = await getQuotes(symbols);

  console.log("==================================");
  console.log("Quote Count:", Object.keys(quotes).length);

  const firstKey = Object.keys(quotes)[0];

  console.log("========== RAW QUOTE ==========");
  console.log("FIRST KEY :", firstKey);
  console.dir(quotes[firstKey], { depth: null });

  console.log("Timestamp :", quotes[firstKey]?.timestamp);
  console.log("OI        :", quotes[firstKey]?.oi);
  console.log("Volume    :", quotes[firstKey]?.volume);
  console.log("LTP       :", quotes[firstKey]?.last_price);
  console.log("==================================");

  // ATM Debug
  const atmCE = optionData.chain.find(
    (x) => x.strike === optionData.atm
  )?.ce;

  if (atmCE) {
    const atmKey = `NFO:${atmCE.tradingsymbol}`;

    console.log("========== ATM RAW QUOTE ==========");
    console.dir(quotes[atmKey], { depth: null });

    console.log("Timestamp :", quotes[atmKey]?.timestamp);
    console.log("OI        :", quotes[atmKey]?.oi);
    console.log("Volume    :", quotes[atmKey]?.volume);
    console.log("LTP       :", quotes[atmKey]?.last_price);
    console.log("==================================");
  }
// ======================================
// Build Full Expiry Chain
// ======================================

const fullChain = optionData.fullChain.map((item) => {
  const ceKey = item.ce ? `NFO:${item.ce.tradingsymbol}` : null;
  const peKey = item.pe ? `NFO:${item.pe.tradingsymbol}` : null;

  return {
    strike: item.strike,

    ce: item.ce
      ? {
          symbol: item.ce.tradingsymbol,
          token: item.ce.instrument_token,
          ltp: quotes[ceKey]?.last_price ?? 0,
          oi: quotes[ceKey]?.oi ?? 0,
          volume: quotes[ceKey]?.volume ?? 0,
          oiChange: 0,
        }
      : null,

    pe: item.pe
      ? {
          symbol: item.pe.tradingsymbol,
          token: item.pe.instrument_token,
          ltp: quotes[peKey]?.last_price ?? 0,
          oi: quotes[peKey]?.oi ?? 0,
          volume: quotes[peKey]?.volume ?? 0,
          oiChange: 0,
        }
      : null,
  };
});
  // Build Chain
  const chain = optionData.chain.map((item) => {
    const ceKey = item.ce ? `NFO:${item.ce.tradingsymbol}` : null;
    const peKey = item.pe ? `NFO:${item.pe.tradingsymbol}` : null;

    return {
      strike: item.strike,

      ce: item.ce
        ? {
            symbol: item.ce.tradingsymbol,
            token: item.ce.instrument_token,
            ltp: quotes[ceKey]?.last_price ?? 0,
            oi: quotes[ceKey]?.oi ?? 0,
            volume: quotes[ceKey]?.volume ?? 0,
            oiChange: 0,
          }
        : null,

      pe: item.pe
        ? {
            symbol: item.pe.tradingsymbol,
            token: item.pe.instrument_token,
            ltp: quotes[peKey]?.last_price ?? 0,
            oi: quotes[peKey]?.oi ?? 0,
            volume: quotes[peKey]?.volume ?? 0,
            oiChange: 0,
          }
        : null,
    };
  });

  console.log("==================================");
  console.log("LIVE OPTION CHAIN");

  console.table(
    chain.map((x) => ({
      Strike: x.strike,
      CE_LTP: x.ce?.ltp,
      CE_OI: x.ce?.oi,
      PE_LTP: x.pe?.ltp,
      PE_OI: x.pe?.oi,
    }))
  );

  const atmRow = chain.find((x) => x.strike === optionData.atm);

  console.log("========== LIVE ATM OI ==========");

  console.table({
    Time: new Date().toLocaleTimeString(),
    Strike: atmRow?.strike,
    CE_OI: atmRow?.ce?.oi,
    PE_OI: atmRow?.pe?.oi,
    CE_LTP: atmRow?.ce?.ltp,
    PE_LTP: atmRow?.pe?.ltp,
  });

  console.log("==================================");

  return {
  atm: optionData.atm,
  expiry: optionData.expiry,

  fullChain,

  chain,
};
}