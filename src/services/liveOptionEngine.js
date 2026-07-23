import { getOptionChain } from "./optionEngine";
import { getKiteClient } from "./zerodha/client";
import { getAccessToken } from "./zerodha/session";

// =============================
// Previous OI Cache
// =============================
const previousOI = {};

// =============================
// Get Live Option Data
// =============================
export async function getLiveOptionData(niftyLTP) {
  if (!niftyLTP) {
    throw new Error("Invalid NIFTY LTP");
  }

  const optionData = await getOptionChain(niftyLTP, 2);

  const accessToken = await getAccessToken();

  const kite = getKiteClient();
  kite.setAccessToken(accessToken);

  // Build Quote Symbols
  const symbols = [];

  optionData.chain.forEach((item) => {
    if (item.ce) symbols.push(`NFO:${item.ce.tradingsymbol}`);
    if (item.pe) symbols.push(`NFO:${item.pe.tradingsymbol}`);
  });

  console.log("==================================");
  console.log("Fetching Option Quotes...");
  console.log(symbols);

  const quotes = await kite.getQuote(symbols);

  console.log("========== RAW QUOTE ==========");

  const firstKey = Object.keys(quotes)[0];

  console.log(firstKey);
  console.dir(quotes[firstKey], { depth: null });

  console.log("===============================");

  console.log("Quote Count:", Object.keys(quotes).length);
  console.log("==================================");

  const chain = optionData.chain.map((item) => {
    const ceKey = item.ce ? `NFO:${item.ce.tradingsymbol}` : null;
    const peKey = item.pe ? `NFO:${item.pe.tradingsymbol}` : null;

    // =============================
    // CE
    // =============================
    let ce = null;

    if (item.ce) {
      const currentOI = quotes[ceKey]?.oi ?? 0;

      const oldOI =
        previousOI[item.ce.tradingsymbol] ?? currentOI;

      const oiChange = currentOI - oldOI;

      previousOI[item.ce.tradingsymbol] = currentOI;

      ce = {
        symbol: item.ce.tradingsymbol,
        token: item.ce.instrument_token,
        ltp: quotes[ceKey]?.last_price ?? null,
        oi: currentOI,
        oiChange,
        volume: quotes[ceKey]?.volume ?? null,
      };
    }

    // =============================
    // PE
    // =============================
    let pe = null;

    if (item.pe) {
      const currentOI = quotes[peKey]?.oi ?? 0;

      const oldOI =
        previousOI[item.pe.tradingsymbol] ?? currentOI;

      const oiChange = currentOI - oldOI;

      previousOI[item.pe.tradingsymbol] = currentOI;

      pe = {
        symbol: item.pe.tradingsymbol,
        token: item.pe.instrument_token,
        ltp: quotes[peKey]?.last_price ?? null,
        oi: currentOI,
        oiChange,
        volume: quotes[peKey]?.volume ?? null,
      };
    }

    return {
      strike: item.strike,
      ce,
      pe,
    };
  });

  console.log("==================================");
  console.log("LIVE OPTION CHAIN");

  console.table(
    chain.map((x) => ({
      Strike: x.strike,
      CE_LTP: x.ce?.ltp,
      CE_OI: x.ce?.oi,
      CE_DeltaOI: x.ce?.oiChange,
      PE_LTP: x.pe?.ltp,
      PE_OI: x.pe?.oi,
      PE_DeltaOI: x.pe?.oiChange,
    }))
  );

  console.log("==================================");

  return {
    atm: optionData.atm,
    expiry: optionData.expiry,
    chain,
  };
}