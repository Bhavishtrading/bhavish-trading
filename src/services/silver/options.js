import { getAllMCXInstruments } from "@/services/zerodha/instruments";

// =====================================================
// SILVERM OPTIONS
// Current active SilverM options expiry
// =====================================================

export async function getCurrentSilverMiniOptions() {
  try {
    const instruments =
      await getAllMCXInstruments();

    // -------------------------------------------------
    // GET ALL SILVERM OPTIONS
    // -------------------------------------------------

    const options =
      instruments.filter(
        (item) =>
          item.name === "SILVERM" &&
          item.segment === "MCX-OPT" &&
          (
            item.instrument_type === "CE" ||
            item.instrument_type === "PE"
          ) &&
          item.expiry
      );

    // -------------------------------------------------
    // FIND ACTIVE EXPIRY
    // -------------------------------------------------

    const today = new Date();

    const activeExpiries =
      Array.from(
        new Set(
          options.map(
            (item) =>
              new Date(item.expiry)
                .toISOString()
                .slice(0, 10)
          )
        )
      )
      .filter(
        (expiry) =>
          new Date(expiry) >=
          new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
          )
      )
      .sort(
        (a, b) =>
          new Date(a) -
          new Date(b)
      );

    if (!activeExpiries.length) {
      throw new Error(
        "No active SILVERM option expiry found"
      );
    }

    // -------------------------------------------------
    // NEAREST ACTIVE OPTION EXPIRY
    // -------------------------------------------------

    const selectedExpiry =
      activeExpiries[0];

    // -------------------------------------------------
    // FILTER SELECTED EXPIRY
    // -------------------------------------------------

    const selectedOptions =
      options
        .filter(
          (item) =>
            new Date(item.expiry)
              .toISOString()
              .slice(0, 10) ===
            selectedExpiry
        )
        .sort(
          (a, b) =>
            Number(a.strike) -
            Number(b.strike)
        );

    // -------------------------------------------------
    // SPLIT CE / PE
    // -------------------------------------------------

    const ceOptions =
      selectedOptions.filter(
        (item) =>
          item.instrument_type === "CE"
      );

    const peOptions =
      selectedOptions.filter(
        (item) =>
          item.instrument_type === "PE"
      );

    console.log(
      "======================================"
    );

    console.log(
      "SILVERM PCR OPTIONS"
    );

    console.log(
      "Selected Expiry:",
      selectedExpiry
    );

    console.log(
      "Total Options:",
      selectedOptions.length
    );

    console.log(
      "CE Count:",
      ceOptions.length
    );

    console.log(
      "PE Count:",
      peOptions.length
    );

    console.log(
      "======================================"
    );

    return {
      expiry:
        selectedExpiry,

      options:
        selectedOptions,

      ce:
        ceOptions,

      pe:
        peOptions,

      total:
        selectedOptions.length,
    };

  } catch (error) {

    console.error(
      "❌ SILVERM PCR OPTIONS ERROR"
    );

    console.error(error);

    throw error;
  }
}