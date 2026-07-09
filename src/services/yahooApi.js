// import yahooFinance from "yahoo-finance2";

// export async function getNiftyPrice() {
//   try {
//     const result = await yahooFinance.quote("^NSEI");

//     console.log("Yahoo Result:", result);

//     return {
//       price: result.regularMarketPrice,
//       change: result.regularMarketChange,
//       changePercent: result.regularMarketChangePercent,
//     };
//   } catch (error) {
//     console.error("Yahoo Finance Error:");
//     console.error(error);

//     return {
//       price: null,
//       change: null,
//       changePercent: null,
//     };
//   }
// }