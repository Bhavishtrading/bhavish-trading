import { NextResponse } from "next/server";
import { getMarketData } from "../../../services/dataProvider";

export async function GET() {
  try {

    const data = await getMarketData();

    return NextResponse.json(data);

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Market Data Error",
      },
      {
        status: 500,
      }
    );

  }
}