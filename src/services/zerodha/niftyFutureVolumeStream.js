
import { KiteTicker } from "kiteconnect";

import { getOIBotAccessToken } from "../oi-bot/tokenStore.js";
import { getCurrentNiftyFuture } from "./instruments.js";

import {
  createNiftyFutureVolumeState,
  processNiftyFutureTick,
} from "./niftyFutureVolumeEngine.js";

const GLOBAL_KEY = "__BHAVISH_NIFTY_FUTURE_VOLUME_STREAM__";

function getStreamState() {
  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = {
      ticker: null,
      connected: false,
      connecting: false,
      started: false,
      error: null,
      instrument: null,
      latest: null,
      lastTickAt: null,
      volumeState: createNiftyFutureVolumeState(),
    };
  }

  return globalThis[GLOBAL_KEY];
}

// =====================================================
// START NIFTY FUTURES STREAM
// =====================================================
export async function startNiftyFutureVolumeStream() {
  const state = getStreamState();

  if (state.connected || state.connecting) {
    return getNiftyFutureVolumeStreamStatus();
  }

  state.connecting = true;
  state.error = null;

  try {
    const accessToken = await getOIBotAccessToken();

    if (!accessToken) {
      throw new Error(
        "Zerodha access token not found in Redis. Please login again."
      );
    }

    const instrument = await getCurrentNiftyFuture(accessToken);

    if (!instrument?.instrument_token) {
      throw new Error("NIFTY Futures instrument token not found");
    }

    const instrumentToken = Number(instrument.instrument_token);

    if (!Number.isSafeInteger(instrumentToken) || instrumentToken <= 0) {
      throw new Error("Invalid NIFTY Futures instrument token");
    }

    state.instrument = instrument;
    state.volumeState = createNiftyFutureVolumeState();
    state.latest = null;
    state.lastTickAt = null;

    console.log("========================================");
    console.log("NIFTY FUTURES STREAM CONFIGURATION");
    console.log("========================================");
    console.log("SYMBOL:", instrument.tradingsymbol);
    console.log("INSTRUMENT TOKEN:", instrumentToken);
    console.log("TOKEN TYPE:", typeof instrumentToken);

    const ticker = new KiteTicker({
      api_key: process.env.KITE_API_KEY,
      access_token: accessToken,
    });

    state.ticker = ticker;
    state.started = true;

    // =================================================
    // WEBSOCKET CONNECT
    // =================================================
    ticker.on("connect", () => {
      console.log("NIFTY FUTURES WEBSOCKET CONNECTED");

      state.connected = true;
      state.connecting = false;
      state.error = null;

      ticker.subscribe([instrumentToken]);
      ticker.setMode(ticker.modeFull, [instrumentToken]);

      console.log("SUBSCRIBED:", instrument.tradingsymbol);
      console.log("SUBSCRIPTION MODE:", ticker.modeFull);
    });

    // =================================================
    // LIVE ZERODHA TICKS
    // =================================================
    ticker.on("ticks", (ticks) => {
      if (!Array.isArray(ticks)) return;

      for (const tick of ticks) {
        if (Number(tick.instrument_token) !== instrumentToken) {
          continue;
        }

        // Engine signature is (tick, state).
        const processed = processNiftyFutureTick(
          tick,
          state.volumeState
        );

        if (!processed) continue;

        const bestBid = tick.depth?.buy?.[0]?.price ?? null;
        const bestAsk = tick.depth?.sell?.[0]?.price ?? null;

        const bestBidQuantity =
          tick.depth?.buy?.[0]?.quantity ?? null;

        const bestAskQuantity =
          tick.depth?.sell?.[0]?.quantity ?? null;

        state.latest = {
          ...processed,
          instrument: instrument.tradingsymbol,
          lastPrice: tick.last_price,
          volumeTraded: tick.volume_traded,
          lastTradeQuantity: tick.last_traded_quantity,
          oi: tick.oi,
          exchangeTimestamp: tick.exchange_timestamp,

          bestBid,
          bestAsk,
          bestBidQuantity,
          bestAskQuantity,

          totalBuyQuantity: tick.total_buy_quantity,
          totalSellQuantity: tick.total_sell_quantity,
          lastTradeTime: tick.last_trade_time,
        };

        state.lastTickAt = new Date().toISOString();

        console.log("========================================");
        console.log("NIFTY FUTURES LIVE VOLUME ANALYSIS");
        console.log("========================================");

        // =================================================
        // LIVE VOLUME + BID/ASK CLASSIFICATION LOG
        // =================================================
        console.log({
          symbol: instrument.tradingsymbol,

          // Price and volume
          ltp: state.latest.lastPrice,
          volumeTraded: state.latest.volumeTraded,
          lastTradeQuantity: state.latest.lastTradeQuantity,
          newTradeQuantity: state.latest.newTradeQuantity,

          // BEST BID / ASK
          bestBid: state.latest.bestBid,
          bestAsk: state.latest.bestAsk,
          bestBidQuantity: state.latest.bestBidQuantity,
          bestAskQuantity: state.latest.bestAskQuantity,

          // TOTAL MARKET DEPTH QUANTITY
          totalBuyQuantity: state.latest.totalBuyQuantity,
          totalSellQuantity: state.latest.totalSellQuantity,

          // TRADE TIMESTAMPS
          lastTradeTime: state.latest.lastTradeTime,
          exchangeTimestamp: state.latest.exchangeTimestamp,

          // Classified and unclassified quantity
          classifiedTradeQuantity:
            state.latest.classifiedTradeQuantity,

          unclassifiedTradeQuantity:
            state.latest.unclassifiedTradeQuantity,

          // Estimated buy/sell volume
          estimatedBuyVolume: state.latest.estimatedBuyVolume,
          estimatedSellVolume: state.latest.estimatedSellVolume,

          buyPercentage: state.latest.buyPercentage,
          sellPercentage: state.latest.sellPercentage,

          // Total classified/unclassified volume
          classifiedVolume: state.latest.classifiedVolume,
          unclassifiedVolume: state.latest.unclassifiedVolume,

          // Delta and CVD
          delta: state.latest.delta,
          cvd: state.latest.cvd,

          // Classification details
          classification: state.latest.classification,
          classificationMethod: state.latest.classificationMethod,
          classificationCoverage:
            state.latest.classificationCoverage,

          // Absorption
          absorption: state.latest.absorption?.type,

          baselineOnly: state.latest.baselineOnly,
          // =================================================
// MINUTE-WISE VOLUME DELTA ANALYSIS
// =================================================
minuteBar: state.latest.minuteBar
  ? {
      minute: state.latest.minuteBar.minute,

      open: state.latest.minuteBar.open,
      high: state.latest.minuteBar.high,
      low: state.latest.minuteBar.low,
      close: state.latest.minuteBar.close,

      totalVolume: state.latest.minuteBar.totalVolume,

      estimatedBuyVolume:
        state.latest.minuteBar.estimatedBuyVolume,

      estimatedSellVolume:
        state.latest.minuteBar.estimatedSellVolume,

      classifiedVolume:
        state.latest.minuteBar.classifiedVolume,

      unclassifiedVolume:
        state.latest.minuteBar.unclassifiedVolume,

      delta: state.latest.minuteBar.delta,

      cvdStart: state.latest.minuteBar.cvdStart,
      cvdEnd: state.latest.minuteBar.cvdEnd,
      cvdChange: state.latest.minuteBar.cvdChange,

      classificationCoverage:
        state.latest.minuteBar.classificationCoverage,
    }
  : null,

completedMinuteBars:
  state.latest.completedMinuteBars,
        });
      }
    });

    // =================================================
    // ERROR
    // =================================================
    ticker.on("error", (error) => {
      state.error = error?.message || String(error);

      console.error(
        "NIFTY FUTURES STREAM ERROR:",
        state.error
      );
    });

    // =================================================
    // CLOSE
    // =================================================
    ticker.on("close", (reason) => {
      state.connected = false;
      state.connecting = false;

      console.log("NIFTY FUTURES STREAM CLOSED:", reason);
    });

    // =================================================
    // RECONNECT
    // =================================================
    ticker.on("reconnect", (attempt, delay) => {
      console.log("NIFTY FUTURES RECONNECTING:", {
        attempt,
        delay,
      });
    });

    ticker.on("noreconnect", () => {
      state.connected = false;
      state.connecting = false;
      state.error =
        "Maximum WebSocket reconnection attempts reached";

      console.error(state.error);
    });

    ticker.connect();

    return {
      success: true,
      message: "NIFTY Futures stream starting",
      instrument: {
        tradingsymbol: instrument.tradingsymbol,
        instrument_token: instrumentToken,
        expiry: instrument.expiry,
      },
    };
  } catch (error) {
    state.connecting = false;
    state.connected = false;
    state.error = error?.message || String(error);

    console.error(
      "NIFTY FUTURES STREAM START ERROR:",
      state.error
    );

    throw error;
  }
}

// =====================================================
// GET STREAM STATUS
// =====================================================
export function getNiftyFutureVolumeStreamStatus() {
  const state = getStreamState();

  return {
    success: !state.error,
    connected: state.connected,
    connecting: state.connecting,
    started: state.started,
    error: state.error,

    instrument: state.instrument
      ? {
          tradingsymbol: state.instrument.tradingsymbol,
          instrument_token: Number(
            state.instrument.instrument_token
          ),
          expiry: state.instrument.expiry,
        }
      : null,

    lastTickAt: state.lastTickAt,
    latest: state.latest,
  };
}

// =====================================================
// STOP STREAM
// =====================================================
export function stopNiftyFutureVolumeStream() {
  const state = getStreamState();

  if (state.ticker) {
    state.ticker.disconnect();
  }

  state.ticker = null;
  state.connected = false;
  state.connecting = false;
  state.started = false;
  state.latest = null;
  state.lastTickAt = null;

  console.log("NIFTY FUTURES VOLUME STREAM STOPPED");

  return {
    success: true,
    message: "NIFTY Futures stream stopped",
  };
}
