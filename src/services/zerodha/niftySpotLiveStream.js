
import { KiteTicker } from "kiteconnect";
import { getAccessToken } from "./session";

const NIFTY_SPOT_TOKEN = 256265;
const GLOBAL_KEY = "__BHAVISH_NIFTY_SPOT_LIVE_STREAM__";

function getStreamState() {
  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = {
      ticker: null,
      connected: false,
      connecting: false,
      lastTick: null,
      currentCandle: null,
      candles: [],
      error: null,
      lastUpdate: null,
    };
  }

  return globalThis[GLOBAL_KEY];
}

function getValidTickTime(tick) {
  const rawTime =
    tick.last_trade_time ||
    tick.exchange_timestamp ||
    new Date();

  const date = new Date(rawTime);

  if (!Number.isFinite(date.getTime())) {
    return new Date();
  }

  return date;
}

function getMinuteBucket(date) {
  return Math.floor(date.getTime() / 60000) * 60;
}

export async function startNiftySpotLiveStream() {
  const state = getStreamState();

  if (state.connected || state.connecting) {
    return getNiftySpotLiveStreamStatus();
  }

  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("Zerodha access token not found");
  }

  state.connecting = true;
  state.error = null;

  try {
    const ticker = new KiteTicker({
      api_key: process.env.KITE_API_KEY,
      access_token: accessToken,
      reconnect: true,
      reconnect_max_tries: 50,
      reconnect_max_delay: 60,
    });

    state.ticker = ticker;

    ticker.on("connect", () => {
      console.log("NIFTY SPOT WEBSOCKET CONNECTED");

      state.connected = true;
      state.connecting = false;
      state.error = null;

      ticker.subscribe([NIFTY_SPOT_TOKEN]);
      ticker.setMode(ticker.modeLTP, [NIFTY_SPOT_TOKEN]);
    });

    ticker.on("ticks", (ticks) => {
      for (const tick of ticks) {
        if (tick.instrument_token !== NIFTY_SPOT_TOKEN) {
          continue;
        }

        const price = Number(tick.last_price);

        if (!Number.isFinite(price) || price <= 0) {
          continue;
        }

        // Use one timestamp consistently for both
        // lastTick and currentCandle.
        const tickTime = getValidTickTime(tick);
        const candleTime = getMinuteBucket(tickTime);

        const current = state.currentCandle;

        // Ignore out-of-order ticks.
        if (current && candleTime < current.time) {
          continue;
        }

        if (!current || candleTime > current.time) {
          if (current) {
            state.candles.push(current);

            if (state.candles.length > 500) {
              state.candles.shift();
            }
          }

          state.currentCandle = {
            time: candleTime,
            open: price,
            high: price,
            low: price,
            close: price,
            volume: 0,
          };
        } else {
          current.high = Math.max(current.high, price);
          current.low = Math.min(current.low, price);
          current.close = price;
        }

        state.lastTick = {
          instrumentToken: NIFTY_SPOT_TOKEN,
          ltp: price,
          timestamp: tickTime.toISOString(),
          candleTime,
        };

        state.lastUpdate = new Date().toISOString();
      }
    });

    ticker.on("error", (error) => {
      console.error("NIFTY SPOT WEBSOCKET ERROR:", error);

      state.error = error?.message || "WebSocket error";
      state.connected = false;
      state.connecting = false;
    });

    ticker.on("close", () => {
      console.log("NIFTY SPOT WEBSOCKET CLOSED");

      state.connected = false;
      state.connecting = false;
    });

    ticker.on("disconnect", () => {
      console.log("NIFTY SPOT WEBSOCKET DISCONNECTED");

      state.connected = false;
      state.connecting = false;
    });

    ticker.on("reconnect", (attempt, delay) => {
      console.log(
        "NIFTY SPOT RECONNECTING:",
        attempt,
        "Delay:",
        delay
      );

      state.connecting = true;
    });

    ticker.on("noreconnect", () => {
      console.error("NIFTY SPOT RECONNECT FAILED");

      state.connected = false;
      state.connecting = false;
      state.error = "WebSocket reconnection failed";
    });

    ticker.connect();

    return {
      success: true,
      message: "NIFTY Spot WebSocket starting",
      instrumentToken: NIFTY_SPOT_TOKEN,
    };
  } catch (error) {
    state.connecting = false;
    state.connected = false;
    state.error = error?.message || "Unable to start WebSocket";

    throw error;
  }
}

export function getNiftySpotLiveStreamStatus() {
  const state = getStreamState();

  return {
    instrument: "NSE:NIFTY 50",
    instrumentToken: NIFTY_SPOT_TOKEN,
    connected: state.connected,
    connecting: state.connecting,
    lastTick: state.lastTick,
    currentCandle: state.currentCandle,
    candles: state.candles,
    lastUpdate: state.lastUpdate,
    error: state.error,
  };
}

export function stopNiftySpotLiveStream() {
  const state = getStreamState();

  if (state.ticker) {
    state.ticker.disconnect();
  }

  state.ticker = null;
  state.connected = false;
  state.connecting = false;
  state.currentCandle = null;
  state.candles = [];
  state.lastTick = null;
  state.error = null;

  return {
    success: true,
    message: "NIFTY Spot WebSocket stopped",
  };
}
