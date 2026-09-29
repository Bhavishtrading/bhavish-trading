import { getCurrentSilverMiniOptions } from "./options";
import { getKiteClient } from "@/services/zerodha/client";

// =====================================================
// SILVERM PCR ENGINE
// Live CE / PE OI from Zerodha
// =====================================================

export async function getSilverMiniPCR() {
  try {
    // -------------------------------------------------
    // GET CURRENT SILVERM OPTIONS
    // -------------------------------------------------

    const optionData =
      await getCurrentSilverMiniOptions();

    const {
      expiry,
      ce,
      pe,
    } = optionData;

    // -------------------------------------------------
    // GET KITE CLIENT
    // -------------------------------------------------

    const kite =
      getKiteClient();

    // -------------------------------------------------
    // CREATE INSTRUMENT TOKENS
    // -------------------------------------------------

    const allOptions = [
      ...ce,
      ...pe,
    ];

    if (!allOptions.length) {
      throw new Error(
        "No SILVERM options found"
      );
    }

    // -------------------------------------------------
    // ZERODHA QUOTE SYMBOLS
    // -------------------------------------------------

    const symbols =
      allOptions.map(
        (item) =>
          `MCX:${item.tradingsymbol}`
      );

    console.log(
      "======================================"
    );

    console.log(
      "SILVERM PCR LIVE OI"
    );

    console.log(
      "Expiry:",
      expiry
    );

    console.log(
      "Total Options:",
      allOptions.length
    );

    console.log(
      "Fetching Zerodha OI..."
    );

    // -------------------------------------------------
    // FETCH LIVE QUOTES
    // -------------------------------------------------

    const quotes =
      await kite.getQuote(symbols);

    // -------------------------------------------------
    // CALCULATE TOTAL CE / PE OI
    // -------------------------------------------------

    let ceOI = 0;
    let peOI = 0;

    let ceCount = 0;
    let peCount = 0;

    // -------------------------------------------------
    // CE OI
    // -------------------------------------------------

    for (const option of ce) {

      const symbol =
        `MCX:${option.tradingsymbol}`;

      const quote =
        quotes[symbol];

      if (
        quote &&
        quote.oi !== undefined &&
        quote.oi !== null
      ) {
        ceOI += Number(
          quote.oi
        );

        ceCount++;
      }
    }

    // -------------------------------------------------
    // PE OI
    // -------------------------------------------------

    for (const option of pe) {

      const symbol =
        `MCX:${option.tradingsymbol}`;

      const quote =
        quotes[symbol];

      if (
        quote &&
        quote.oi !== undefined &&
        quote.oi !== null
      ) {
        peOI += Number(
          quote.oi
        );

        peCount++;
      }
    }

    // -------------------------------------------------
    // PCR CALCULATION
    // -------------------------------------------------

    const pcr =
      ceOI > 0
        ? peOI / ceOI
        : 0;

    // -------------------------------------------------
    // ROUND PCR
    // -------------------------------------------------

    const roundedPCR =
      Number(
        pcr.toFixed(2)
      );

    console.log(
      "--------------------------------------"
    );

    console.log(
      "CE OI:",
      ceOI
    );

    console.log(
      "PE OI:",
      peOI
    );

    console.log(
      "CE OI Count:",
      ceCount
    );

    console.log(
      "PE OI Count:",
      peCount
    );

    console.log(
      "PCR:",
      roundedPCR
    );

    console.log(
      "======================================"
    );

    // -------------------------------------------------
    // RETURN
    // -------------------------------------------------

    return {
      success: true,

      expiry,

      ceOI,

      peOI,

      pcr:
        roundedPCR,

      ceCount,

      peCount,

      totalOptions:
        allOptions.length,
    };

  } catch (error) {

    console.error(
      "❌ SILVERM PCR ERROR"
    );

    console.error(error);

    throw error;
  }
}