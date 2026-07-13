import { NextResponse } from "next/server";

export async function GET(request) {
  const jwtToken = request.cookies.get("jwtToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;

  return NextResponse.json({
    jwtExists: !!jwtToken,
    refreshExists: !!refreshToken,
  });
}