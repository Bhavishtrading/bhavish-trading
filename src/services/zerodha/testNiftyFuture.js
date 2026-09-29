import { getCurrentNiftyFuture } from "./instruments";

export async function testNiftyFuture() {
  try {
    console.log("=================================");
    console.log("TESTING NIFTY FUTURE");
    console.log("=================================");

    const future = await getCurrentNiftyFuture();

    console.log("NIFTY FUTURE FOUND");

    console.log({
      tradingsymbol: future.tradingsymbol,
      instrument_token: future.instrument_token,
      expiry: future.expiry,
      lot_size: future.lot_size,
      segment: future.segment,
      instrument_type: future.instrument_type,
    });

    return future;
  } catch (error) {
    console.error("NIFTY FUTURE TEST ERROR");
    console.error(error);
    throw error;
  }
}