import { cookies } from "next/headers";
import os from "os";

import {
  getLTP,
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

export async function getLiveMarketData() {
  try {
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