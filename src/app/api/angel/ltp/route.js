import { NextResponse } from "next/server";
import os from "os";
import { getLTP } from "@/services/angel/market";

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

export async function GET(request) {
  try {
   const jwtToken = request.cookies.get("jwtToken")?.value;

if (!jwtToken) {
  return NextResponse.json(
    {
      success: false,
      message: "JWT Cookie Missing",
    },
    { status: 401 }
  );
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

    const payload = {
      exchange: "NSE",
      tradingsymbol: "NIFTY",
      symboltoken: "26000",
    };

    const data = await getLTP(payload, headers);

    return NextResponse.json(data);

  } catch (error) {
    console.error("LTP Error:", error.response?.data || error.message);

    return NextResponse.json(
      error.response?.data || {
        success: false,
        message: error.message,
      },
      {
        status: error.response?.status || 500,
      }
    );
  }
}