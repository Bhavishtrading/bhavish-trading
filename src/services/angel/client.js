import { cookies } from "next/headers";
import os from "os";

export function getLocalIP() {
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

export async function getAngelHeaders() {
  const cookieStore = await cookies();

  const jwtToken = cookieStore.get("jwtToken")?.value;

  if (!jwtToken) {
    throw new Error("JWT Cookie Missing");
  }

  const localIP = getLocalIP();

  return {
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
}