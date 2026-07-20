export function analyzeOptionChain(optionChain = {}) {
  const calls = optionChain.calls || [];
  const puts = optionChain.puts || [];

  // Highest Call OI
  let highestCallOI = {
    strike: 0,
    oi: 0,
  };

  // Highest Put OI
  let highestPutOI = {
    strike: 0,
    oi: 0,
  };

  // Find Highest Call OI
  for (const call of calls) {
    if ((call.oi || 0) > highestCallOI.oi) {
      highestCallOI = {
        strike: call.strikePrice,
        oi: call.oi,
      };
    }
  }

  // Find Highest Put OI
  for (const put of puts) {
    if ((put.oi || 0) > highestPutOI.oi) {
      highestPutOI = {
        strike: put.strikePrice,
        oi: put.oi,
      };
    }
  }

  return {
    atm: optionChain.atm || 0,
    maxPain: optionChain.maxPain || 0,

    highestCallOI: highestCallOI.strike,
    highestPutOI: highestPutOI.strike,

    longBuildUp: 0,
    shortBuildUp: 0,
    shortCovering: 0,
    longUnwinding: 0,
  };
}