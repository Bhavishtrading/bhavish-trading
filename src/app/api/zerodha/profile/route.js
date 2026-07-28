import { NextResponse } from "next/server";
import { getUser, isLoggedIn } from "@/services/zerodha/session";

export async function GET() {
  const loggedIn = await isLoggedIn();

  if (!loggedIn) {
    return NextResponse.json(
      {
        success: false,
        message: "Not Logged In",
      },
      { status: 401 }
    );
  }

  const user = await getUser();

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