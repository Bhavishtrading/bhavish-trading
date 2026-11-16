
const DEFAULT_STATE = {
  lastPrice: null,
  lastActualTradePrice: null,

  lastBid: null,
  lastAsk: null,

  lastCumulativeVolume: null,
  lastTradeFingerprint: null,
  lastTradeTime: null,

  buyVolume: 0,
  sellVolume: 0,

  delta: 0,
  cvd: 0,

  classifiedVolume: 0,
  unclassifiedVolume: 0,

  lastClassification: "UNCLASSIFIED",
  lastClassificationMethod: "NONE",

  recentTicks: [],

  // Minute-wise aggregation
  currentMinuteBar: null,
  completedMinuteBars: [],
};

const MAX_RECENT_TICKS = 100;
const MAX_COMPLETED_MINUTE_BARS = 120;

// =====================================================
// VALIDATION
// =====================================================
function validNumber(value) {
  return (
    value !== null &&
    value !== undefined &&
    value !== "" &&
    Number.isFinite(Number(value))
  );
}

// =====================================================
// GET BEST BID / ASK PRICE
// =====================================================
function getBestPrice(levels) {
  if (!Array.isArray(levels) || !levels.length) {
    return null;
  }

  const price = Number(levels[0]?.price);

  return Number.isFinite(price) && price > 0
    ? price
    : null;
}

// =====================================================
// TIMESTAMP
// =====================================================
function getTimestamp(value) {
  if (!value) return null;

  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : null;
  }

  const parsed = new Date(value).getTime();

  return Number.isFinite(parsed) ? parsed : null;
}

// =====================================================
// TRADE CLASSIFICATION
// =====================================================
function classifyTrade(tick, state) {
  const price = Number(tick.last_price);

  const currentBid = getBestPrice(tick.depth?.buy);
  const currentAsk = getBestPrice(tick.depth?.sell);

  const previousTradePrice = state.lastActualTradePrice;

  const bid = currentBid ?? state.lastBid;
  const ask = currentAsk ?? state.lastAsk;

  let classification = "UNCLASSIFIED";
  let method = "NONE";

  const validSpread =
    bid !== null &&
    ask !== null &&
    ask > bid;

  if (validSpread) {
    if (price >= ask) {
      classification = "BUY";
      method = "ASK_HIT";
    } else if (price <= bid) {
      classification = "SELL";
      method = "BID_HIT";
    }
  }

  // Tick Rule fallback
  if (
    classification === "UNCLASSIFIED" &&
    previousTradePrice !== null
  ) {
    if (price > previousTradePrice) {
      classification = "BUY";
      method = "TICK_RULE_UP";
    } else if (price < previousTradePrice) {
      classification = "SELL";
      method = "TICK_RULE_DOWN";
    }
  }

  if (currentBid !== null) {
    state.lastBid = currentBid;
  }

  if (currentAsk !== null) {
    state.lastAsk = currentAsk;
  }

  return {
    classification,
    method,
  };
}

// =====================================================
// ABSORPTION DETECTION
// =====================================================
function detectAbsorption(state) {
  const recent = state.recentTicks;

  if (recent.length < 10) {
    return {
      detected: false,
      type: null,
      reason: "Insufficient tick history",
    };
  }

  const prices = recent.map((item) => item.price);

  const totalBuy = recent
    .filter((item) => item.classification === "BUY")
    .reduce((sum, item) => sum + item.quantity, 0);

  const totalSell = recent
    .filter((item) => item.classification === "SELL")
    .reduce((sum, item) => sum + item.quantity, 0);

  const totalVolume = totalBuy + totalSell;

  if (totalVolume <= 0) {
    return {
      detected: false,
      type: null,
      reason: "No classified volume",
    };
  }

  const priceRange =
    Math.max(...prices) - Math.min(...prices);

  const referencePrice = prices[prices.length - 1];

  const lowMovement =
    priceRange <= referencePrice * 0.0002;

  const buyRatio = totalBuy / totalVolume;
  const sellRatio = totalSell / totalVolume;

  if (!lowMovement) {
    return {
      detected: false,
      type: null,
      reason: "Price movement is not sufficiently limited",
    };
  }

  if (buyRatio >= 0.65) {
    return {
      detected: true,
      type: "POTENTIAL_SELLER_ABSORPTION",
      reason: "Estimated buying dominance with limited price movement",
      buyRatio: Number((buyRatio * 100).toFixed(2)),
      sellRatio: Number((sellRatio * 100).toFixed(2)),
    };
  }

  if (sellRatio >= 0.65) {
    return {
      detected: true,
      type: "POTENTIAL_BUYER_ABSORPTION",
      reason: "Estimated selling dominance with limited price movement",
      buyRatio: Number((buyRatio * 100).toFixed(2)),
      sellRatio: Number((sellRatio * 100).toFixed(2)),
    };
  }

  return {
    detected: false,
    type: null,
    reason: "No clear directional absorption",
  };
}

// =====================================================
// MINUTE BAR HELPERS
// =====================================================
function getMinuteStart(timestamp) {
  return Math.floor(timestamp / 60000) * 60000;
}

function createMinuteBar(price, timestamp, cvdStart) {
  const minuteStart = getMinuteStart(timestamp);

  return {
    minute: new Date(minuteStart).toISOString(),

    open: price,
    high: price,
    low: price,
    close: price,

    totalVolume: 0,

    estimatedBuyVolume: 0,
    estimatedSellVolume: 0,

    classifiedVolume: 0,
    unclassifiedVolume: 0,

    delta: 0,

    cvdStart,
    cvdEnd: cvdStart,
    cvdChange: 0,

    classificationCoverage: 0,

    tickCount: 0,
    classifiedTickCount: 0,
    unclassifiedTickCount: 0,
  };
}

// =====================================================
// UPDATE MINUTE BAR
// =====================================================
function updateMinuteBar(state, data) {
  const {
    price,
    timestamp,
    newTradeQuantity,
    classifiedTradeQuantity,
    unclassifiedTradeQuantity,
    classification,
    delta,
    cvd,
  } = data;

  const minuteStart = getMinuteStart(timestamp);

  let bar = state.currentMinuteBar;

  // First minute or a new minute has started
  if (!bar || getTimestamp(bar.minute) !== minuteStart) {
    if (bar) {
      state.completedMinuteBars.push({ ...bar });

      if (
        state.completedMinuteBars.length >
        MAX_COMPLETED_MINUTE_BARS
      ) {
        state.completedMinuteBars.shift();
      }
    }

    // Exclude current tick's delta from starting CVD
    const cvdStart = cvd - delta;

    bar = createMinuteBar(price, timestamp, cvdStart);
    state.currentMinuteBar = bar;
  }

  // Update OHLC using every valid market-price tick
  bar.high = Math.max(bar.high, price);
  bar.low = Math.min(bar.low, price);
  bar.close = price;

  bar.tickCount += 1;

  // Volume is counted only when cumulative volume increases
  if (newTradeQuantity > 0) {
    bar.totalVolume += newTradeQuantity;
  }

  if (classifiedTradeQuantity > 0) {
    bar.classifiedVolume += classifiedTradeQuantity;
    bar.classifiedTickCount += 1;

    if (classification === "BUY") {
      bar.estimatedBuyVolume += classifiedTradeQuantity;
    } else if (classification === "SELL") {
      bar.estimatedSellVolume += classifiedTradeQuantity;
    }
  }

  if (unclassifiedTradeQuantity > 0) {
    bar.unclassifiedVolume += unclassifiedTradeQuantity;
    bar.unclassifiedTickCount += 1;
  }

  bar.delta += delta;
  bar.cvdEnd = cvd;
  bar.cvdChange = bar.cvdEnd - bar.cvdStart;

  bar.classificationCoverage =
    bar.totalVolume > 0
      ? Number(
          ((bar.classifiedVolume / bar.totalVolume) * 100).toFixed(2)
        )
      : 0;

  return { ...bar };
}

// =====================================================
// CREATE INITIAL STATE
// =====================================================
export function createNiftyFutureVolumeState() {
  return {
    ...DEFAULT_STATE,
    recentTicks: [],
    completedMinuteBars: [],
    currentMinuteBar: null,
  };
}

// =====================================================
// PROCESS LIVE NIFTY FUTURES TICK
// =====================================================
export function processNiftyFutureTick(tick, state) {
  if (
    !tick ||
    !validNumber(tick.last_price) ||
    Number(tick.last_price) <= 0
  ) {
    return null;
  }

  const price = Number(tick.last_price);

  const cumulativeVolume = validNumber(tick.volume_traded)
    ? Number(tick.volume_traded)
    : null;

  const quantity = validNumber(tick.last_traded_quantity)
    ? Math.max(0, Number(tick.last_traded_quantity))
    : 0;

  const tradeTime =
    getTimestamp(tick.last_trade_time) ??
    getTimestamp(tick.exchange_timestamp);

  const marketTimestamp =
    getTimestamp(tick.exchange_timestamp) ??
    tradeTime ??
    Date.now();

  let newTradeQuantity = 0;
  let baselineOnly = false;

  // ===================================================
  // 1. CUMULATIVE VOLUME RECONCILIATION
  // ===================================================
  if (cumulativeVolume !== null) {
    if (state.lastCumulativeVolume === null) {
      state.lastCumulativeVolume = cumulativeVolume;
      baselineOnly = true;
    } else {
      const difference =
        cumulativeVolume - state.lastCumulativeVolume;

      if (difference > 0) {
        newTradeQuantity = difference;
      } else if (difference < 0) {
        baselineOnly = true;
      }

      state.lastCumulativeVolume = cumulativeVolume;
    }
  } else {
    // Fallback when cumulative volume is unavailable
    const fingerprint = [
      tradeTime,
      price,
      quantity,
    ].join(":");

    if (
      quantity > 0 &&
      fingerprint !== state.lastTradeFingerprint
    ) {
      newTradeQuantity = quantity;
      state.lastTradeFingerprint = fingerprint;
    }
  }

  // ===================================================
  // 2. RESET CURRENT TICK DELTA
  // ===================================================
  state.delta = 0;

  let classification = "UNCLASSIFIED";
  let classificationMethod = "NO_NEW_VOLUME";

  let classifiedTradeQuantity = 0;
  let unclassifiedTradeQuantity = 0;

  // ===================================================
  // 3. PROCESS ONLY NEW VOLUME
  // ===================================================
  if (newTradeQuantity > 0 && !baselineOnly) {
    if (quantity <= 0) {
      classificationMethod = "NO_LAST_TRADE_QUANTITY";
      unclassifiedTradeQuantity = newTradeQuantity;
    } else {
      const result = classifyTrade(tick, state);

      classification = result.classification;
      classificationMethod = result.method;

      if (
        classification === "BUY" ||
        classification === "SELL"
      ) {
        classifiedTradeQuantity = Math.min(
          quantity,
          newTradeQuantity
        );

        unclassifiedTradeQuantity =
          newTradeQuantity - classifiedTradeQuantity;

        if (classification === "BUY") {
          state.buyVolume += classifiedTradeQuantity;
          state.delta = classifiedTradeQuantity;
          state.cvd += classifiedTradeQuantity;
        } else {
          state.sellVolume += classifiedTradeQuantity;
          state.delta = -classifiedTradeQuantity;
          state.cvd -= classifiedTradeQuantity;
        }

        state.classifiedVolume += classifiedTradeQuantity;
      } else {
        unclassifiedTradeQuantity = newTradeQuantity;
      }
    }

    if (unclassifiedTradeQuantity > 0) {
      state.unclassifiedVolume += unclassifiedTradeQuantity;
    }

    // Update actual trade price only for a new-volume event
    if (quantity > 0) {
      state.lastActualTradePrice = price;
      state.lastTradeTime = tradeTime;
    }

    // Recent classified ticks for absorption
    if (classifiedTradeQuantity > 0) {
      state.recentTicks.push({
        price,
        quantity: classifiedTradeQuantity,
        classification,
        classificationMethod,
        timestamp: tradeTime,
      });

      if (state.recentTicks.length > MAX_RECENT_TICKS) {
        state.recentTicks.shift();
      }
    }
  }

  // ===================================================
  // 4. UPDATE LAST MARKET PRICE
  // ===================================================
  state.lastPrice = price;

  state.lastClassification = classification;
  state.lastClassificationMethod = classificationMethod;

  // ===================================================
  // 5. CLASSIFICATION COVERAGE
  // ===================================================
  const totalProcessed =
    state.classifiedVolume + state.unclassifiedVolume;

  const classificationCoverage =
    totalProcessed > 0
      ? (state.classifiedVolume / totalProcessed) * 100
      : 0;

  // ===================================================
  // 6. BUY / SELL PERCENTAGES
  // ===================================================
  const totalEstimatedVolume =
    state.buyVolume + state.sellVolume;

  const buyPercentage =
    totalEstimatedVolume > 0
      ? (state.buyVolume / totalEstimatedVolume) * 100
      : 0;

  const sellPercentage =
    totalEstimatedVolume > 0
      ? (state.sellVolume / totalEstimatedVolume) * 100
      : 0;

  // ===================================================
  // 7. MINUTE-WISE AGGREGATION
  // ===================================================
  const minuteBar = updateMinuteBar(state, {
    price,
    timestamp: marketTimestamp,
    newTradeQuantity,
    classifiedTradeQuantity,
    unclassifiedTradeQuantity,
    classification,
    delta: state.delta,
    cvd: state.cvd,
  });

  // ===================================================
  // 8. RETURN LIVE ANALYSIS
  // ===================================================
  return {
    lastPrice: price,
    lastTradedQuantity: quantity,

    newTradeQuantity,
    classifiedTradeQuantity,
    unclassifiedTradeQuantity,

    cumulativeVolume,

    estimatedBuyVolume: state.buyVolume,
    estimatedSellVolume: state.sellVolume,

    buyPercentage: Number(buyPercentage.toFixed(2)),
    sellPercentage: Number(sellPercentage.toFixed(2)),

    delta: state.delta,
    cvd: state.cvd,

    classifiedVolume: state.classifiedVolume,
    unclassifiedVolume: state.unclassifiedVolume,

    classificationCoverage: Number(
      classificationCoverage.toFixed(2)
    ),

    classification,
    classificationMethod,

    absorption: detectAbsorption(state),

    // Minute-wise analysis
    minuteBar,
    completedMinuteBars: state.completedMinuteBars.slice(-10),

    oi: Number(tick.oi) || 0,

    totalBuyQuantity:
      Number(tick.total_buy_quantity) || 0,

    totalSellQuantity:
      Number(tick.total_sell_quantity) || 0,

    exchangeTimestamp: tick.exchange_timestamp ?? null,

    baselineOnly,

    dataType: "ESTIMATED_TRADE_CLASSIFICATION",
  };
}
