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

  // OI Trend Summary
  oiTrend: {
    bullish: 0,
    bearish: 0,
    neutral: 0,
  },
    // OI Leaders
  oiLeaders: {
    callWriting: null,
    putWriting: null,
    callUnwinding: null,
    putUnwinding: null,
  },

  // Market Structure
  marketStructure: {
    trend: "",
    support: 0,
    resistance: 0,
  },

  // Market Bias
  marketBias: {
    signal: "",
    confidence: 0,
    reasons: [],
  },

  // Option Chain
  optionChain: {
    atm: 0,
    expiry: "",
    maxPain: 0,
    highestCallOI: 0,
    highestPutOI: 0,
    chain: [],
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

  // ADX
  adx: {
    adx: 0,
    plusDI: 0,
    minusDI: 0,
    trend: "",
  },

  // ATR
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