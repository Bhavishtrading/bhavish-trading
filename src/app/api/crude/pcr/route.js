import { NextResponse } from "next/server";

import { getCrudePCR } from "@/services/crude/options";

export async function GET() {
  try {
    console.log("======================================");
    console.log("CRUDE PCR API");
    console.log("======================================");

    const pcrData = await getCrudePCR();

    return NextResponse.json({
      success: true,

      data: {
        expiry: pcrData.expiry,

        ceOI: pcrData.ceOI,

        peOI: pcrData.peOI,

        pcr: Number(pcrData.pcr.toFixed(2)),

        ceCount: pcrData.ceCount,

        peCount: pcrData.peCount,
      },
    });

  } catch (error) {
    console.error(
      "CRUDE PCR API ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to calculate Crude PCR",
      },
      {
        status: 500,
      }
    );
  }
}