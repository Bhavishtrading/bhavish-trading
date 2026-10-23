import { NextResponse } from "next/server";

import {
  getNifty50SectorData,
} from "@/services/zerodha/nifty50SectorEngine";


// ======================================================
// NIFTY 50 LIVE STOCKS API
// ======================================================

export async function GET() {

  try {

    // --------------------------------------------------
    // Get existing NIFTY 50 live data
    // --------------------------------------------------

    const data =
      await getNifty50SectorData();


    // --------------------------------------------------
    // Make sure stocks are available
    // --------------------------------------------------

    const stocks =
      Array.isArray(data?.stocks)
        ? data.stocks
        : [];


    // --------------------------------------------------
    // Return stock table data
    // --------------------------------------------------

    return NextResponse.json({

      success:
        true,

      count:
        stocks.length,

      stocks,

    });

  } catch (error) {

    console.error(
      "NIFTY 50 STOCKS API ERROR ================="
    );

    console.error(error);


    return NextResponse.json(

      {
        success:
          false,

        error:
          error.name ||
          "Error",

        message:
          error.message ||
          "Unable to fetch NIFTY 50 stock data",

      },

      {
        status:
          500,
      }

    );
  }
}