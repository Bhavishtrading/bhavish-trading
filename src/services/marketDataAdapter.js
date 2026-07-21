import { cookies } from "next/headers";
import os from "os";

import {
  getLTP,
  getFullQuote,
  getCandleData,
  searchScrip,
} from "./angel/market";

function getLocalIP() {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }

  return "127.0.0.1";
}

console.log("MARKET DATA ADAPTER LOADED");
export async function getLiveMarketData() {
  
  console.log("############################################");
  console.log("NEW MARKET DATA ADAPTER VERSION");
  console.log(new Date().toISOString());
  console.log("############################################");
  try {
    console.log("***** MARKET ADAPTER FILE EXECUTED *****");
    const cookieStore = await cookies();
    const jwtToken = cookieStore.get("jwtToken")?.value;

    if (!jwtToken) {
      throw new Error("JWT Cookie Missing");
    }

    const localIP = getLocalIP();

    const headers = {
      Authorization: `Bearer ${jwtToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-PrivateKey": process.env.ANGEL_API_KEY,
      "X-UserType": "USER",
      "X-SourceID": "WEB",
      "X-ClientLocalIP": localIP,
      "X-ClientPublicIP": localIP,
      "X-MACAddress": "14-AC-60-4C-7C-8B",
    };

    // Search NIFTY
    const searchResult = await searchScrip(
      {
        exchange: "NSE",
        searchscrip: "NIFTY",
      },
      headers
    );
    console.log("===== SEARCH RESULT START =====");
console.log(JSON.stringify(searchResult, null, 2));
console.log("===== SEARCH RESULT END =====");

// ఇక్కడే return వేయి
console.log("TOTAL RECORDS:", searchResult.data.length);

searchResult.data.slice(0, 10).forEach((item, index) => {
  console.log("================================");
  console.log("INDEX:", index);
  console.log(JSON.stringify(item, null, 2));
});
    console.log("Search Result Status:", searchResult.status);
console.log("Search Result Keys:", Object.keys(searchResult));

console.log("Search Result Data Type:", typeof searchResult.data);
console.log("Is Array:", Array.isArray(searchResult.data));
console.log("Data Length:", searchResult.data?.length);

if (searchResult.data?.length > 0) {
  console.log("First Record:");
  console.log(searchResult.data[0]);
}

 console.log("========== OPTION SEARCH ==========");
const options = searchResult.data.filter(
  item =>
    item.tradingsymbol.includes("CE") ||
    item.tradingsymbol.includes("PE")
);

console.log("Total Options:", options.length);

console.log("========== FIRST 10 OPTIONS ==========");

options.slice(0, 10).forEach((item, index) => {
  console.log(index + 1, {
    tradingsymbol: item.tradingsymbol,
    symboltoken: item.symboltoken,
    exchange: item.exchange,
  });
});

console.log("======================================");
console.log("==================================");   
    console.log("================================");
    console.log("SEARCH RESULT");
    console.log(JSON.stringify(searchResult, null, 2));
    console.log("================================");

    // Live LTP
const ltpData = await getLTP(
  {
    exchange: "NSE",
    tradingsymbol: "NIFTY",
    symboltoken: "26000",
  },
  headers
);

console.log("Calling Full Quote...");

const fullQuote = await getFullQuote(
  {
    mode: "FULL",
    exchangeTokens: {
      NSE: ["26000"],
    },
  },
  headers
);

console.log("Full Quote Success");
console.log("========== FULL QUOTE ==========");
console.log(JSON.stringify(fullQuote, null, 2));
console.log("================================");

console.log("========== LTP RESPONSE ==========");
const quote = fullQuote.data?.fetched?.[0];

console.log({
  ltp: quote?.ltp,
  openInterest: quote?.openInterest,
  tradeVolume: quote?.tradeVolume,
  totalBuyQuantity: quote?.totalBuyQuantity,
  totalSellQuantity: quote?.totalSellQuantity,
});
console.log("==================================");

    // Historical
    const candleData = await getCandleData(
      {
        exchange: "NSE",
        symboltoken: "26000",
        interval: "FIVE_MINUTE",
        fromdate: "2026-07-16 09:15",
        todate: "2026-07-16 15:30",
      },
      headers
    );

    console.log("================================");
    console.log("LTP");
    console.log(ltpData);

    console.log("================================");
    console.log("CANDLE");
    console.log(candleData);
    console.log("================================");

    return {
      nifty: ltpData.data?.ltp ?? null,
      bankNifty: null,
      vix: null,
      close: ltpData.data?.close ?? null,
      candles: candleData.data ?? [],
      source: "Angel One",
    };
  } catch (error) {
    console.log("================================");
    console.log(error.response?.data || error.message);
    console.log("================================");

    return {
      nifty: null,
      bankNifty: null,
      vix: null,
      close: null,
      candles: [],
      source: "Error",
    };
  }
}