import { NextResponse } from "next/server";
import os from "os";
import { angelLogin } from "@/services/angel/api";

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
    const { totp } = await request.json();

    if (!totp || totp.length !== 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid 6-digit TOTP",
        },
        { status: 400 }
      );
    }

    const payload = {
      clientcode: process.env.ANGEL_CLIENT_CODE,
      password: process.env.ANGEL_PIN,
      totp,
    };

    const localIP = getLocalIP();

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-PrivateKey": process.env.ANGEL_API_KEY,
      "X-UserType": "USER",
      "X-SourceID": "WEB",
      "X-ClientLocalIP": localIP,
      "X-ClientPublicIP": localIP,
      "X-MACAddress": "00:00:00:00:00:00",
    };
console.log("BASE_URL:", process.env.ANGEL_BASE_URL);
console.log("API_KEY Exists:", !!process.env.ANGEL_API_KEY);


    const data = await angelLogin(payload, headers);

const response = NextResponse.json(data);

if (data.status === true) {
    console.log("JWT:", data.data.jwtToken);
    
  response.cookies.set("jwtToken", data.data.jwtToken, {
    httpOnly: true,
    secure: false, // localhost కోసం
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 day
  });

  response.cookies.set("refreshToken", data.data.refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

return response;

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