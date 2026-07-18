import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();

  return NextResponse.json({
    jwtExists: !!cookieStore.get("jwtToken"),
    refreshExists: !!cookieStore.get("refreshToken"),
  });
}