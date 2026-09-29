import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.KITE_API_KEY;
  const redirectUrl = process.env.KITE_REDIRECT_URL;

  console.log("===== ZERODHA LOGIN =====");
  console.log("API KEY EXISTS:", !!apiKey);
  console.log("REDIRECT URL:", redirectUrl);
  console.log("=========================");

  const loginUrl =
    `https://kite.zerodha.com/connect/login` +
    `?api_key=${apiKey}` +
    `&v=3` +
    `&redirect_uri=${encodeURIComponent(redirectUrl)}`;

  console.log("LOGIN URL:", loginUrl);

  return NextResponse.redirect(loginUrl);
}