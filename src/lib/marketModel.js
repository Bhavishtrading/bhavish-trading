export const marketModel = {
  nifty: 0,
  bankNifty: 0,
  vix: 0,
  close: 0,

  status: "",

  pcr: 0,

  strength: 0,

  oi: {
    longBuildUp: 0,
    shortBuildUp: 0,
    shortCovering: 0,
    longUnwinding: 0,
  },

  optionChain: {
    atm: 0,
    maxPain: 0,
    highestCallOI: 0,
    highestPutOI: 0,
  },

  ai: {
    signal: "",
    confidence: 0,
    risk: "",
    score: 0,
    reasons: [],
  },

  momentum: {
    buying: 0,
    selling: 0,
    trend: "",
    status: "",
  },
};