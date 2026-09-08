import { getCrudeOilFutures } from "./src/services/zerodha/instruments.js";

try {
  const crude = await getCrudeOilFutures();

  console.log("\n===== CRUDE OIL FUTURES =====");

  crude.forEach((item) => {
    console.log({
      tradingsymbol: item.tradingsymbol,
      instrument_token: item.instrument_token,
      expiry: item.expiry,
      exchange: item.exchange,
      segment: item.segment,
      lot_size: item.lot_size,
    });
  });

  console.log("============================\n");
} catch (error) {
  console.error("MCX TEST ERROR:", error.message);
}