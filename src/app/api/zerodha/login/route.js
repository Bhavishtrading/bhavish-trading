import { NextResponse } from "next/server";

export async function GET(request) {
  const apiKey = process.env.KITE_API_KEY;
  const redirectUrl = process.env.KITE_REDIRECT_URL;

  const { searchParams } = new URL(request.url);

  // Requested dashboard
  const destination = searchParams.get("redirect") || "/";

  console.log("===== ZERODHA LOGIN =====");
  console.log("API KEY EXISTS:", !!apiKey);
  console.log("REDIRECT URL:", redirectUrl);
  console.log("DESTINATION:", destination);
  console.log("=========================");

  const loginUrl =
    `https://kite.zerodha.com/connect/login` +
    `?api_key=${apiKey}` +
    `&v=3` +
    `&redirect_uri=${encodeURIComponent(
      `${redirectUrl}?redirect=${encodeURIComponent(destination)}`
    )}`;

  console.log("LOGIN URL:", loginUrl);

  return NextResponse.redirect(loginUrl);
}