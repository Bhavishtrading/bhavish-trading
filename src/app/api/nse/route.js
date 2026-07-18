import { NextResponse } from "next/server";
import { loadOptionChain } from "@/services/nse/optionChain";

export async function GET() {
  try {
    const data = await loadOptionChain("NIFTY");
    return NextResponse.json(data);
  } catch (error) {
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