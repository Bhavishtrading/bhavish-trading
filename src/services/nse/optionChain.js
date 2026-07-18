import { getOptionChain as fetchOptionChain } from "./nseService";

export async function loadOptionChain(symbol = "NIFTY") {
  try {
    const json = await fetchOptionChain(symbol);

    if (!json.records || !json.filtered) {
      throw new Error("Invalid NSE Response");
    }

    return {
      success: true,
      symbol,
      underlying: json.records.underlyingValue,
      timestamp: json.records.timestamp,
      expiryDates: json.records.expiryDates,
      strikes: json.records.strikePrices,
      records: json.records.data,
      filtered: json.filtered,
    };
  } catch (error) {
    console.error("Option Chain Error:", error.message);

    return {
      success: false,
      message: error.message,
      records: [],
    };
  }
}