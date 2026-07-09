export function analyzeOptionChain(optionChain) {

  return {
    atm: 0,
    maxPain: 0,

    highestCallOI: 0,
    highestPutOI: 0,

    longBuildUp: 0,
    shortBuildUp: 0,
    shortCovering: 0,
    longUnwinding: 0,
  };

}