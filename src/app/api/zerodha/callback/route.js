import { NextResponse } from "next/server";
import { generateSession } from "@/services/zerodha/auth";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const requestToken = searchParams.get("request_token");

    if (!requestToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Request Token Missing",
        },
        { status: 400 }
      );
    }

    const session = await generateSession(requestToken);

    const response = NextResponse.redirect(
      new URL("/", request.url)
    );

    response.cookies.set("zerodha_access_token", session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}