import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.KITE_API_KEY;
  const redirectUrl = process.env.KITE_REDIRECT_URL;

  const loginUrl =
    `https://kite.zerodha.com/connect/login` +
    `?api_key=${apiKey}` +
    `&v=3` +
    `&redirect_uri=${encodeURIComponent(redirectUrl)}`;

  return NextResponse.redirect(loginUrl);
}