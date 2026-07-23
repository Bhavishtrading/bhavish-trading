export function analyzeMarketStructure(optionChain) {
  if (!optionChain || optionChain.length === 0) {
    return null;
  }

  let highestCall = optionChain[0];
  let highestPut = optionChain[0];

  for (const strike of optionChain) {
    if (strike.ce.oi > highestCall.ce.oi) {
      highestCall = strike;
    }

    if (strike.pe.oi > highestPut.pe.oi) {
      highestPut = strike;
    }
  }

  return {
    support: highestPut.strike,
    resistance: highestCall.strike,

    supportOI: highestPut.pe.oi,
    resistanceOI: highestCall.ce.oi,

    supportStrength:
      highestPut.pe.oi > 10000000 ? "Strong" : "Normal",

    resistanceStrength:
      highestCall.ce.oi > 10000000 ? "Strong" : "Normal",
  };
}