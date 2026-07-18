export const marketModel = {
  // Live Market
  nifty: 0,
  bankNifty: 0,
  vix: 0,
  close: 0,

  // Market Status
  status: "",

  // Put Call Ratio
  pcr: 0,

  // Overall Market Strength
  strength: 0,

  // Open Interest Analysis
  oi: {
    longBuildUp: 0,
    shortBuildUp: 0,
    shortCovering: 0,
    longUnwinding: 0,
  },

  // Option Chain
  optionChain: {
    atm: 0,
    maxPain: 0,
    highestCallOI: 0,
    highestPutOI: 0,
  },

  // AI Trading Signal
  ai: {
    signal: "",
    confidence: 0,
    risk: "",
    score: 0,

    entry: 0,
    stopLoss: 0,
    target: 0,

    reasons: [],
  },

  // Market Momentum
  momentum: {
    buying: 0,
    selling: 0,
    trend: "",
    status: "",
  },

  // RSI
  rsi: 0,

  // MACD
  macd: {
    macd: 0,
    signal: 0,
    histogram: 0,
    trend: "",
  },
  adx: {
  adx: 0,
  plusDI: 0,
  minusDI: 0,
  trend: "",
},
atr: {
  atr: 0,
  volatility: "",
},

  // EMA
  ema: {
    ema9: 0,
    ema20: 0,
    ema50: 0,
    trend: "",
  },
};