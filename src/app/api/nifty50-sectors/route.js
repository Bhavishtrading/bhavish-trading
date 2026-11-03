import { NextResponse } from "next/server";
import { getKiteClient } from "@/services/zerodha/client";
import { getAccessToken } from "@/services/zerodha/session";
import { NIFTY50_STOCKS } from "@/services/zerodha/nifty50Sectors";

export async function GET() {
  try {
    // ==========================================
    // 1. GET ZERODHA ACCESS TOKEN
    // ==========================================

    const accessToken = await getAccessToken();

    if (!accessToken) {
      throw new Error("Access token not found");
    }

    // ==========================================
    // 2. KITE CLIENT
    // ==========================================

    const kite = getKiteClient();
    kite.setAccessToken(accessToken);

    // ==========================================
    // 3. LOAD NSE INSTRUMENTS
    // ==========================================

    console.log("Loading NSE instruments...");

    const instruments = await kite.getInstruments(["NSE"]);

    console.log(
      "Total NSE instruments:",
      instruments?.length || 0
    );

    // ==========================================
    // 4. ONLY NSE EQUITY
    // ==========================================

    const equityInstruments = instruments.filter(
      (item) =>
        item.exchange === "NSE" &&
        item.segment === "NSE"
    );

    console.log(
      "NSE equity instruments:",
      equityInstruments.length
    );

    // ==========================================
    // 5. CREATE SYMBOL MAP
    // ==========================================

    const instrumentMap = new Map();

    for (const instrument of equityInstruments) {
      instrumentMap.set(
        instrument.tradingsymbol.toUpperCase(),
        {
          tradingsymbol: instrument.tradingsymbol,
          instrumentToken: instrument.instrument_token,
          exchange: instrument.exchange,
          segment: instrument.segment,
          name: instrument.name,
        }
      );
    }

    // ==========================================
    // 6. VERIFY ALL 50 STOCKS
    // ==========================================

    const found = [];
    const missing = [];

    for (const stock of NIFTY50_STOCKS) {
      const symbol = stock.symbol.toUpperCase();

      const instrument = instrumentMap.get(symbol);

      if (instrument) {
        found.push({
          symbol: stock.symbol,
          name: stock.name,
          sector: stock.sector,
          subSector: stock.subSector,
          weight: stock.weight,
          zerodhaTradingsymbol: instrument.tradingsymbol,
          instrumentToken: instrument.instrumentToken,
        });
      } else {
        missing.push({
          symbol: stock.symbol,
          name: stock.name,
          sector: stock.sector,
          subSector: stock.subSector,
        });
      }
    }

    // ==========================================
    // 7. SUMMARY
    // ==========================================

    const summary = {
      configuredStocks: NIFTY50_STOCKS.length,
      foundInZerodha: found.length,
      missingInZerodha: missing.length,
      allFound:
        found.length === NIFTY50_STOCKS.length &&
        missing.length === 0,
    };

    // ==========================================
    // 8. RESPONSE
    // ==========================================

    return NextResponse.json({
      success: true,

      summary,

      found,

      missing,

      message: summary.allFound
        ? "All configured NIFTY 50 stocks found in Zerodha NSE instruments."
        : "Some NIFTY 50 stocks were not found in Zerodha NSE instruments.",
    });
  } catch (error) {
    console.error(
      "NIFTY 50 SECTOR TEST ERROR ================="
    );

    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: error.name || "Error",
        message: error.message || "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}