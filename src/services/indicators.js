import {
  EMA,
  RSI,
  MACD,
  ATR,
  ADX,
} from "technicalindicators";

export function calculateIndicators(quotes) {
  console.log("========== INDICATOR DEBUG ==========");

  console.log("Total Candles:", quotes.length);

  console.log("First Candle:");
  console.log(quotes[0]);

  console.log("Last Candle:");
  console.log(quotes[quotes.length - 1]);

  console.log("====================================");

  // ----------------------------------------
  // Remove Invalid Candles
  // ----------------------------------------
  const validQuotes = quotes.filter(
    (q) =>
      q &&
      Number.isFinite(Number(q.close)) &&
      Number.isFinite(Number(q.high)) &&
      Number.isFinite(Number(q.low)) &&
      Number(q.close) > 0 &&
      Number(q.high) > 0 &&
      Number(q.low) > 0
  );

  console.log("Valid Candles:", validQuotes.length);

  if (validQuotes.length < 50) {
    console.warn("Not enough valid candles to calculate indicators.");

    return {
      ema9: null,
      ema20: null,
      ema50: null,
      rsi: null,
      macd: {
        macd: null,
        signal: null,
        histogram: null,
        trend: "Sideways",
      },
      atr: {
        atr: null,
        volatility: "Unknown",
      },
      adx: {
        adx: null,
        plusDI: null,
        minusDI: null,
        trend: "Sideways",
      },
    };
  }

  const closes = validQuotes.map((q) => Number(q.close));
  const highs = validQuotes.map((q) => Number(q.high));
  const lows = validQuotes.map((q) => Number(q.low));

  console.log("Last 10 Close Prices");

  console.table(
    closes.slice(-10).map((price, index) => ({
      index,
      price,
    }))
  );

  // ----------------------------------------
  // EMA
  // ----------------------------------------

  const ema9 = EMA.calculate({
    period: 9,
    values: closes,
  });

  const ema20 = EMA.calculate({
    period: 20,
    values: closes,
  });

  const ema50 = EMA.calculate({
    period: 50,
    values: closes,
  });

  // ----------------------------------------
  // RSI
  // ----------------------------------------

  const rsi = RSI.calculate({
    values: closes,
    period: 14,
  });

  // ----------------------------------------
  // MACD
  // ----------------------------------------

  const macd = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  // ----------------------------------------
  // ATR
  // ----------------------------------------

  const atr = ATR.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: 14,
  });

  // ----------------------------------------
  // ADX
  // ----------------------------------------

  const adx = ADX.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: 14,
  });

  const lastMacd = macd.at(-1);
  const lastAdx = adx.at(-1);

  return {
    ema9: ema9.at(-1) ?? null,
    ema20: ema20.at(-1) ?? null,
    ema50: ema50.at(-1) ?? null,

    rsi: rsi.at(-1) ?? null,

    macd: {
      macd: lastMacd?.MACD ?? null,
      signal: lastMacd?.signal ?? null,
      histogram: lastMacd?.histogram ?? null,
      trend:
        (lastMacd?.MACD ?? 0) >
        (lastMacd?.signal ?? 0)
          ? "Bullish"
          : "Bearish",
    },

    atr: {
      atr: atr.at(-1) ?? null,
      volatility:
        (atr.at(-1) ?? 0) > 30
          ? "High"
          : "Low",
    },

    adx: {
      adx: lastAdx?.adx ?? null,
      plusDI: lastAdx?.pdi ?? null,
      minusDI: lastAdx?.mdi ?? null,
      trend:
        (lastAdx?.adx ?? 0) > 25
          ? "Strong Trend"
          : "Sideways",
    },
  };
}