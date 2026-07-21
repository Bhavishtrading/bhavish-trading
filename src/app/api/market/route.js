import { NextResponse } from "next/server";
import { getMarketData } from "../../../services/dataProvider";

export async function GET() {
  try {
    console.log("==================================");
    console.log("🚀 API /market HIT");

    const data = await getMarketData();

    console.log("✅ Market Data Generated");
    console.log(JSON.stringify(data, null, 2));

    console.log("==================================");

    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ API MARKET ERROR");
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