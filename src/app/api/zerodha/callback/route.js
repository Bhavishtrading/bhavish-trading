import { NextResponse } from "next/server";
import { generateSession } from "@/services/zerodha/auth";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const requestToken = searchParams.get("request_token");

    console.log("=================================");
    console.log("ZERODHA CALLBACK HIT");
    console.log("Request Token Exists:", !!requestToken);
    console.log("=================================");

    if (!requestToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Request Token Missing",
        },
        { status: 400 }
      );
    }

    console.log("Generating Zerodha Session...");

    const session = await generateSession(requestToken);

    console.log("Session Generated:", !!session);
    console.log("Access Token Exists:", !!session?.access_token);

    const response = NextResponse.redirect(
      new URL("/", request.url)
    );

    response.cookies.set(
      "zerodha_access_token",
      session.access_token,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      }
    );

    console.log("Zerodha Access Token Cookie Set");

    return response;

  } catch (error) {
    console.error("=================================");
    console.error("ZERODHA CALLBACK ERROR");
    console.error(error);
    console.error("Message:", error?.message);
    console.error("=================================");

    return NextResponse.json(
      {
        success: false,
        error: error?.name || "Error",
        message: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}