import { NextResponse } from "next/server";
import { getLiveCrudeQuote } from "@/services/zerodha/market";

export async function GET() {
  try {
    const crude = await getLiveCrudeQuote();

    return NextResponse.json({
      success: true,
      data: crude,
    });
  } catch (error) {
    console.error("CRUDE QUOTE TEST ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}