
import { NextResponse } from "next/server";
import { generateSession } from "@/services/zerodha/auth";
import { saveOIBotAccessToken } from "@/services/oi-bot/tokenStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const requestToken = searchParams.get("request_token");
    const redirect = searchParams.get("redirect") || "/";

    if (!requestToken) {
      return NextResponse.json(
        { success: false, message: "Request Token Missing" },
        { status: 400 }
      );
    }

    // Generate Zerodha session
    const session = await generateSession(requestToken);

    if (!session?.access_token) {
      throw new Error("Zerodha access token generation failed");
    }

    // Save token separately for OI BOT
    let oiBotTokenSaved = false;

    try {
      await saveOIBotAccessToken(session.access_token);
      oiBotTokenSaved = true;
      console.log("OI BOT Zerodha Token Stored Successfully");
    } catch (error) {
      console.error("OI BOT TOKEN STORAGE ERROR:", error.message);
    }

    // Allow only internal dashboard routes
    const allowedRedirects = ["/", "/crude", "/silver", "/oi-bot"];

    const finalRedirect = allowedRedirects.includes(redirect)
      ? redirect
      : "/";

    const response = NextResponse.redirect(
      new URL(finalRedirect, request.url)
    );

    // Preserve existing dashboard authentication
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

    console.log("Zerodha Login Successful");
    console.log("OI BOT Token Saved:", oiBotTokenSaved);
    console.log("Redirecting To:", finalRedirect);

    return response;

  } catch (error) {
    console.error("ZERODHA CALLBACK ERROR:", error.message);

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
