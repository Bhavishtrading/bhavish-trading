import { NextResponse } from "next/server";
import os from "os";
import { searchScrip } from "@/services/angel/market";

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

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        {
          success: false,
          message: "Authorization header missing",
        },
        { status: 401 }
      );
    }

    const jwtToken = authHeader.replace("Bearer ", "");

    const { exchange, searchscrip } = await request.json();

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
      exchange,
      searchscrip,
    };

    const data = await searchScrip(payload, headers);

    return NextResponse.json(data);

  } catch (error) {
    console.error(error.response?.data || error.message);

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