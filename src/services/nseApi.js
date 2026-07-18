import axios from "axios";
export async function fetchOptionChain() {

  try {

    console.log("🚀 NSE Data Service Started");
    const url =
  "https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY";
  const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36",
  Accept: "application/json",
  Referer: "https://www.nseindia.com/",
};
const { data } = await axios.get(url, { headers });

console.log(data);

    return {
      success: false,
      message: "NSE API not connected yet",
      data: null,
    };

  } catch (error) {

    console.error(error);

    return {
      success: false,
      message: error.message,
      data: null,
    };

  }

}