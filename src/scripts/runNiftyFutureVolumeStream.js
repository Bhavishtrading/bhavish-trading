
import {
  startNiftyFutureVolumeStream,
  getNiftyFutureVolumeStreamStatus,
  stopNiftyFutureVolumeStream,
} from "../services/zerodha/niftyFutureVolumeStream.js";

let shuttingDown = false;

async function start() {
  console.log("========================================");
  console.log("BHAVISH NIFTY FUTURES VOLUME STREAM");
  console.log("========================================");

  try {
    const result = await startNiftyFutureVolumeStream();

    console.log("INITIAL STREAM STATUS:");
    console.log(JSON.stringify(result, null, 2));

    console.log("Waiting for Zerodha WebSocket connection...");
  } catch (error) {
    console.error("STREAM START FAILED:", error.message);
    process.exitCode = 1;
    return;
  }

  const statusInterval = setInterval(() => {
    const status = getNiftyFutureVolumeStreamStatus();

    console.log("\n========== LIVE STREAM STATUS ==========");
    console.log("Connected:", status.connected);
    console.log("Connecting:", status.connecting);
    console.log("Instrument:", status.instrument?.tradingsymbol);
    console.log("Last Tick:", status.lastTickAt);
    console.log("Error:", status.error);

    if (status.latest) {
      console.log("LTP:", status.latest.lastPrice);
      console.log("Estimated Buy Volume:", status.latest.estimatedBuyVolume);
      console.log("Estimated Sell Volume:", status.latest.estimatedSellVolume);
      console.log("Delta:", status.latest.delta);
      console.log("CVD:", status.latest.cvd);
      console.log("Classification:", status.latest.classification);
      console.log("Absorption:", status.latest.absorption?.type);
    } else {
      console.log("Waiting for first live tick...");
    }

    console.log("========================================");
  }, 10000);

  async function shutdown(signal) {
    if (shuttingDown) return;

    shuttingDown = true;
    console.log(`\nReceived ${signal}. Stopping stream...`);

    clearInterval(statusInterval);

    try {
      stopNiftyFutureVolumeStream();
      console.log("NIFTY Futures stream stopped.");
    } catch (error) {
      console.error("STREAM STOP ERROR:", error.message);
    }

    process.exit(0);
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start();
