import { getNSEClient, initializeNSE, resetNSESession } from "./nseClient";

const API_BASE = "https://www.nseindia.com/api";

async function request(url) {
  const client = getNSEClient();

  await initializeNSE();

  let response = await client.get(url, {
    headers: {
      Accept: "application/json,text/plain,*/*",
      Referer: "https://www.nseindia.com/option-chain",
    },
  });

  if (response.status === 401 || response.status === 403) {
    console.log("Refreshing NSE Session...");

    resetNSESession();

    await initializeNSE();

    response = await client.get(url, {
      headers: {
        Accept: "application/json,text/plain,*/*",
        Referer: "https://www.nseindia.com/option-chain",
      },
    });
  }

  if (response.status !== 200) {
    throw new Error(`NSE Error ${response.status}`);
  }

  return response.data;
}

export async function getOptionChain(symbol = "NIFTY") {
  return request(
    `${API_BASE}/option-chain-indices?symbol=${encodeURIComponent(symbol)}`
  );
}

export async function getMarketStatus() {
  return request(`${API_BASE}/marketStatus`);
}