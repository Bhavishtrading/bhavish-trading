import {
  getCrudeOilFutures,
  getCrudeOilOptions,
} from "./src/services/zerodha/instruments.js";


// =====================================================
// CRUDE OIL FUTURES TEST
// =====================================================

try {

  const crude =
    await getCrudeOilFutures();

  console.log(
    "\n===== CRUDE OIL FUTURES ====="
  );

  crude.forEach((item) => {

    console.log({

      tradingsymbol:
        item.tradingsymbol,

      instrument_token:
        item.instrument_token,

      expiry:
        item.expiry,

      exchange:
        item.exchange,

      segment:
        item.segment,

      lot_size:
        item.lot_size,

    });

  });

  console.log(
    "============================\n"
  );

} catch (error) {

  console.error(
    "MCX FUTURES TEST ERROR:",
    error.message
  );

}


// =====================================================
// CRUDE OIL OPTIONS TEST
// =====================================================

try {

  const crudeOptions =
    await getCrudeOilOptions();

  console.log(
    "\n===== CRUDE OIL OPTIONS ====="
  );

  console.log(
    "TOTAL OPTIONS:",
    crudeOptions.length
  );

  crudeOptions
    .slice(0, 20)
    .forEach((item) => {

      console.log({

        tradingsymbol:
          item.tradingsymbol,

        instrument_token:
          item.instrument_token,

        expiry:
          item.expiry,

        strike:
          item.strike,

        instrument_type:
          item.instrument_type,

        exchange:
          item.exchange,

        segment:
          item.segment,

        lot_size:
          item.lot_size,

      });

    });

  console.log(
    "============================\n"
  );

} catch (error) {

  console.error(
    "CRUDE OPTIONS TEST ERROR:",
    error.message
  );

}