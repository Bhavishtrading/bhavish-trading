import { NextResponse } from "next/server";
import os from "os";
import { getProfile } from "@/services/angel/api";

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
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        {
          success: false,
          message: "Authorization token is missing",
        },
        { status: 401 }
      );
    }

    const jwtToken = authHeader.replace("Bearer ", "");

    const localIP = getLocalIP();

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-PrivateKey": process.env.ANGEL_API_KEY,
      "X-UserType": "USER",
      "X-SourceID": "WEB",
      "X-ClientLocalIP": localIP,
      "X-ClientPublicIP": localIP,
      "X-MACAddress": "14-AC-60-4C-7C-8B",
    };

    const data = await getProfile(jwtToken, headers);

    return NextResponse.json(data);

  } catch (error) {

    console.error(
      "Profile Error:",
      error.response?.data || error.message
    );

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