import { NextResponse } from "next/server";
import { getUser, isLoggedIn } from "@/services/zerodha/session";

export async function GET() {
  if (!isLoggedIn()) {
    return NextResponse.json(
      {
        success: false,
        message: "Not Logged In",
      },
      { status: 401 }
    );
  }

  const user = getUser();

  return NextResponse.json({
    success: true,
    profile: {
      userName: user.user_name,
      userId: user.user_id,
      email: user.email,
      broker: user.broker,
    },
  });
}