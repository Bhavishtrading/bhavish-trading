import { NextResponse } from "next/server";
import { getMarketData } from "../../../services/dataProvider";

export async function GET() {
  try {
    console.log("==================================");
    console.log("🚀 API /market HIT");

    const data = await getMarketData();

    console.log("==================================");
    console.log("✅ Market Data Generated");
    console.log(JSON.stringify(data, null, 2));
    console.log("==================================");

    return NextResponse.json(data);
  } catch (error) {
    console.error("==================================");
    console.error("❌ API MARKET ERROR");
    console.error("Name:", error?.name);
    console.error("Message:", error?.message);
    console.error("Stack:");
    console.error(error?.stack);
    console.error("Full Error:");
    console.dir(error, { depth: null });
    console.error("==================================");

    return NextResponse.json(
      {
        success: false,
        error: error?.name || "UnknownError",
        message: error?.message || "Unknown Error",
      },
      {
        status: 500,
      }
    );
  }
}