import { NextResponse } from "next/server";
import { getLiveCrudeQuote } from "@/services/zerodha/market";

export async function GET() {
  try {
    const crude = await getLiveCrudeQuote();

    const ltp = crude.ltp;
    const close = crude.close;

    const change =
      ltp !== null && close !== null
        ? Number((ltp - close).toFixed(2))
        : null;

    const changePercent =
      ltp !== null && close !== null && close !== 0
        ? Number((((ltp - close) / close) * 100).toFixed(2))
        : null;

    return NextResponse.json({
      success: true,
      data: {
        ...crude,
        change,
        changePercent,
      },
    });
  } catch (error) {
    console.error("CRUDE API ERROR =================");
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