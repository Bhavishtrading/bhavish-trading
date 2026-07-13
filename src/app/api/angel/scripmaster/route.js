import { NextResponse } from "next/server";
import { findInstrument } from "@/services/angel/scripMaster";

export async function GET() {
  try {
    const data = await findInstrument((item) => {
      return (
        item.exch_seg === "NSE" &&
        item.symbol &&
        item.symbol.toUpperCase() === "NIFTY"
      );
    });

    return NextResponse.json({
      success: true,
      count: data.length,
      data,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}