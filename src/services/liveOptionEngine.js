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

  // ======================================
// Build Symbols (FULL EXPIRY)
// ======================================

const symbols = [];

// Full expiry contains one instrument per row (CE or PE)
optionData.fullChain.forEach((contract) => {
  symbols.push(`NFO:${contract.tradingsymbol}`);
});

console.log("==================================");
console.log("FULL EXPIRY CONTRACTS :", optionData.fullChain.length);
console.log("QUOTE SYMBOLS :", symbols.length);
console.log("==================================");

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

// ======================================
// Build Full Expiry Chain (Grouped)
// ======================================

const strikeMap = new Map();

for (const contract of optionData.fullChain) {
  const strike = Number(contract.strike);

  if (!strikeMap.has(strike)) {
    strikeMap.set(strike, {
      strike,
      ce: null,
      pe: null,
    });
  }

  const row = strikeMap.get(strike);

  const quoteKey = `NFO:${contract.tradingsymbol}`;
  const quote = quotes[quoteKey];

  const option = {
    symbol: contract.tradingsymbol,
    token: contract.instrument_token,
    ltp: quote?.last_price ?? 0,
    oi: quote?.oi ?? 0,
    volume: quote?.volume ?? 0,
    oiChange: 0,
  };

  if (contract.instrument_type === "CE") {
    row.ce = option;
  } else if (contract.instrument_type === "PE") {
    row.pe = option;
  }
}

const fullChain = [...strikeMap.values()].sort(
  (a, b) => a.strike - b.strike
);

console.log("==================================");
console.log("FULL CHAIN BUILT");
console.log("Total Strikes :", fullChain.length);

console.table(
  fullChain.slice(0, 10).map((x) => ({
    Strike: x.strike,
    CE: !!x.ce,
    PE: !!x.pe,
    CE_OI: x.ce?.oi,
    PE_OI: x.pe?.oi,
  }))
);

console.log("==================================");
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

  // Dashboard
  chain,

  // Full Expiry (Analysis)
  fullChain,
};
}