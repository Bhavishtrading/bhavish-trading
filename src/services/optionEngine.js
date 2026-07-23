import { getNiftyOptions } from "./zerodha/instruments";

export async function getOptionChain(spotPrice, range = 2) {
  const options = await getNiftyOptions();

  if (!options.length) {
    throw new Error("No NIFTY option contracts found.");
  }

  // ATM Strike
  const atmStrike = Math.round(spotPrice / 50) * 50;

  // Nearest Expiry
  const expiries = [
    ...new Set(options.map((o) => new Date(o.expiry).getTime())),
  ].sort((a, b) => a - b);

  const nearestExpiry = expiries[0];

  const expiryOptions = options.filter(
    (o) => new Date(o.expiry).getTime() === nearestExpiry
  );

  const strikes = [];

  for (let i = -range; i <= range; i++) {
    strikes.push(atmStrike + i * 50);
  }

  const chain = strikes.map((strike) => {
    const ce = expiryOptions.find(
      (o) =>
        o.strike === strike &&
        o.instrument_type === "CE"
    );

    const pe = expiryOptions.find(
      (o) =>
        o.strike === strike &&
        o.instrument_type === "PE"
    );

    return {
      strike,
      ce,
      pe,
    };
  });

  console.log("==================================");
  console.log("Nearest Expiry:", new Date(nearestExpiry));
  console.log("ATM:", atmStrike);
  console.table(
    chain.map((x) => ({
      Strike: x.strike,
      CE: x.ce?.tradingsymbol,
      PE: x.pe?.tradingsymbol,
    }))
  );
  console.log("==================================");

  return {
    atm: atmStrike,
    expiry: new Date(nearestExpiry),
    chain,
  };
}

// Backward Compatibility
export async function getATMOptions(spotPrice) {
  const data = await getOptionChain(spotPrice, 0);

  return {
    atm: data.atm,
    expiry: data.expiry,
    ce: data.chain[0].ce,
    pe: data.chain[0].pe,
  };
}