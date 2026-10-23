// ======================================================
// NIFTY 50 SECTOR ENGINE
// ======================================================
//
// Flow:
//
// NIFTY 50 STOCKS
//      ↓
// Zerodha live quotes
//      ↓
// Stock OHLC + LTP
//      ↓
// Stock % Change
//      ↓
// Weighted Contribution
//      ↓
// Primary Sector aggregation
//      ↓
// Sector Performance
//      ↓
// Weight-Based Sector Score
//
// ======================================================

import { getKiteClient } from "./client";
import { getAccessToken } from "./session";

import {
  NIFTY50_STOCKS,
} from "./nifty50Sectors";

import {
  NIFTY50_WEIGHTS,
} from "./nifty50Weights";


// ======================================================
// SCORE SETTINGS
// ======================================================
//
// A sector reaching +2% gets full positive score.
// A sector reaching -2% gets full negative score.
//
// Example:
//
// IT Weight = 7.76
//
// +0.50% → +1.94
// +1.00% → +3.88
// +2.00% → +7.76
// +3.00% → +7.76  (capped)
//
// ======================================================

const FULL_SCORE_PERFORMANCE = 2;


// ======================================================
// TOTAL NIFTY 50 WEIGHT
// ======================================================

const NIFTY_INDEX_WEIGHT_TOTAL =
  Object.values(NIFTY50_WEIGHTS).reduce(
    (sum, weight) =>
      sum + Number(weight || 0),
    0
  );


// ======================================================
// GET ZERODHA QUOTES
// ======================================================

async function getNifty50Quotes() {

  const accessToken =
    await getAccessToken();

  if (!accessToken) {
    throw new Error(
      "Access token not found"
    );
  }

  const kite =
    getKiteClient();

  kite.setAccessToken(
    accessToken
  );


  // ----------------------------------------------------
  // Build NSE symbols
  // ----------------------------------------------------

  const instruments =
    NIFTY50_STOCKS.map(
      (stock) =>
        `NSE:${stock.symbol}`
    );


  // ----------------------------------------------------
  // Zerodha quote request
  // ----------------------------------------------------

  const quotes = {};

  const batchSize = 50;


  for (
    let i = 0;
    i < instruments.length;
    i += batchSize
  ) {

    const batch =
      instruments.slice(
        i,
        i + batchSize
      );


    const response =
      await kite.getQuote(
        batch
      );


    Object.assign(
      quotes,
      response
    );
  }


  return quotes;
}


// ======================================================
// CALCULATE STOCK DATA
// ======================================================

function calculateStockData(
  stock,
  quote
) {

  // ----------------------------------------------------
  // NIFTY WEIGHT
  // ----------------------------------------------------

  const weight =
    Number(
      NIFTY50_WEIGHTS[
        stock.symbol
      ] || 0
    );


  // ----------------------------------------------------
  // LIVE PRICE
  // ----------------------------------------------------

  const ltp =
    Number(
      quote?.last_price || 0
    );


  // ----------------------------------------------------
  // TODAY OPEN
  // ----------------------------------------------------

  const open =
    Number(
      quote?.ohlc?.open || 0
    );


  // ----------------------------------------------------
  // TODAY HIGH
  // ----------------------------------------------------

  const high =
    Number(
      quote?.ohlc?.high || 0
    );


  // ----------------------------------------------------
  // TODAY LOW
  // ----------------------------------------------------

  const low =
    Number(
      quote?.ohlc?.low || 0
    );


  // ----------------------------------------------------
  // PREVIOUS CLOSE
  // ----------------------------------------------------

  const previousClose =
    Number(
      quote?.ohlc?.close || 0
    );


  // ====================================================
  // PRICE CHANGE
  // ====================================================

  let change = 0;

  let changePercent = 0;


  if (
    previousClose > 0 &&
    ltp > 0
  ) {

    change =
      ltp -
      previousClose;


    changePercent =
      (
        change /
        previousClose
      ) * 100;
  }


  // ====================================================
  // WEIGHTED CONTRIBUTION
  // ====================================================
  //
  // Example:
  //
  // Stock Weight = 10%
  // Stock Change = +2%
  //
  // Contribution =
  //
  // 10 × 2 / 100
  //
  // = +0.20
  //
  // ====================================================

  const weightedContribution =
    (
      weight *
      changePercent
    ) / 100;


  // ====================================================
  // STOCK DATA
  // ====================================================

  return {

    // --------------------------------------------------
    // BASIC INFORMATION
    // --------------------------------------------------

    symbol:
      stock.symbol,

    name:
      stock.name,

    sector:
      stock.sector,

    subSector:
      stock.subSector,

    weight:


      Number(
        weight.toFixed(4)
      ),


    // --------------------------------------------------
    // TODAY PRICE DATA
    // --------------------------------------------------

    open:
      Number(
        open.toFixed(2)
      ),

    high:
      Number(
        high.toFixed(2)
      ),

    low:
      Number(
        low.toFixed(2)
      ),

    ltp:
      Number(
        ltp.toFixed(2)
      ),


    // --------------------------------------------------
    // PREVIOUS CLOSE
    // --------------------------------------------------

    previousClose:
      Number(
        previousClose.toFixed(2)
      ),


    // --------------------------------------------------
    // PRICE CHANGE
    // --------------------------------------------------

    change:
      Number(
        change.toFixed(2)
      ),

    changePercent:
      Number(
        changePercent.toFixed(4)
      ),


    // --------------------------------------------------
    // NIFTY CONTRIBUTION
    // --------------------------------------------------

    weightedContribution:
      Number(
        weightedContribution.toFixed(4)
      ),
  };
}


// ======================================================
// BUILD SECTOR DATA
// ======================================================

function buildSectorData(
  stocks
) {

  const sectorMap = {};


  // ====================================================
  // GROUP STOCKS BY SECTOR
  // ====================================================

  for (
    const stock of stocks
  ) {

    const sector =
      stock.sector;


    if (
      !sectorMap[sector]
    ) {

      sectorMap[sector] = {

        sector,

        sectorWeight:
          0,

        contribution:
          0,

        stocks:
          [],
      };
    }


    // --------------------------------------------------
    // Add sector weight
    // --------------------------------------------------

    sectorMap[
      sector
    ].sectorWeight +=
      stock.weight;


    // --------------------------------------------------
    // Add weighted contribution
    // --------------------------------------------------

    sectorMap[
      sector
    ].contribution +=
      stock.weightedContribution;


    // --------------------------------------------------
    // Add stock
    // --------------------------------------------------

    sectorMap[
      sector
    ].stocks.push(
      stock
    );
  }


  // ====================================================
  // CALCULATE SECTOR DATA
  // ====================================================

  const sectors =
    Object.values(
      sectorMap
    ).map(
      (sector) => {


        // ==============================================
        // SECTOR PERFORMANCE
        // ==============================================

        const sectorPerformance =
          sector.sectorWeight > 0
            ? (
                sector.contribution /
                sector.sectorWeight
              ) * 100
            : 0;


        // ==============================================
        // SECTOR SCORE
        // ==============================================
        //
        // +2% performance
        // = full positive score
        //
        // -2% performance
        // = full negative score
        //
        // ==============================================

        const rawScore =
          (
            sectorPerformance /
            FULL_SCORE_PERFORMANCE
          ) *
          sector.sectorWeight;


        // ==============================================
        // CAP SCORE
        // ==============================================

        const score =
          Math.max(
            -sector.sectorWeight,

            Math.min(
              sector.sectorWeight,
              rawScore
            )
          );


        // ==============================================
        // DIRECTION
        // ==============================================

        let direction =
          "Neutral";


        if (
          sectorPerformance >= 2
        ) {

          direction =
            "Bullish";

        } else if (
          sectorPerformance > 0.5
        ) {

          direction =
            "Positive";

        } else if (
          sectorPerformance <= -2
        ) {

          direction =
            "Bearish";

        } else if (
          sectorPerformance < -0.5
        ) {

          direction =
            "Negative";
        }


        // ==============================================
        // RETURN SECTOR
        // ==============================================

        return {

          sector:
            sector.sector,


          sectorWeight:
            Number(
              sector.sectorWeight.toFixed(
                4
              )
            ),


          performance:
            Number(
              sectorPerformance.toFixed(
                4
              )
            ),


          contribution:
            Number(
              sector.contribution.toFixed(
                4
              )
            ),


          score:
            Number(
              score.toFixed(2)
            ),


          direction,


          stockCount:
            sector.stocks.length,


          // IMPORTANT
          // All NIFTY 50 stocks
          // belonging to this sector

          stocks:
            sector.stocks,
        };
      }
    );


  // ====================================================
  // SORT STRONGEST → WEAKEST
  // ====================================================

  sectors.sort(
    (a, b) =>
      b.score -
      a.score
  );


  return sectors;
}


// ======================================================
// GET NIFTY 50 SECTOR DATA
// ======================================================

export async function getNifty50SectorData() {

  // ====================================================
  // GET LIVE QUOTES
  // ====================================================

  const quotes =
    await getNifty50Quotes();


  // ====================================================
  // CALCULATE EACH STOCK
  // ====================================================

  const stocks =
    NIFTY50_STOCKS.map(
      (stock) => {

        const quoteKey =
          `NSE:${stock.symbol}`;


        const quote =
          quotes[
            quoteKey
          ];


        return calculateStockData(
          stock,
          quote
        );
      }
    );


  // ====================================================
  // BUILD SECTORS
  // ====================================================

  const sectors =
    buildSectorData(
      stocks
    );


  // ====================================================
  // TOTAL CONTRIBUTION
  // ====================================================

  const totalContribution =
    stocks.reduce(
      (sum, stock) =>
        sum +
        stock.weightedContribution,
      0
    );


  // ====================================================
  // WEIGHT COVERED
  // ====================================================

  const weightTotal =
    stocks.reduce(
      (sum, stock) =>
        sum +
        stock.weight,
      0
    );


  // ====================================================
  // OVERALL SECTOR SCORE
  // ====================================================
  //
  // Total contribution itself represents
  // NIFTY weighted market movement.
  //
  // Example:
  //
  // +0.80 contribution
  // = approximately +0.80% weighted effect
  //
  // ====================================================

  const overallSectorScore =
    Number(
      totalContribution.toFixed(2)
    );


  // ====================================================
  // OVERALL PERFORMANCE
  // ====================================================

  const overallPerformance =
    weightTotal > 0
      ? (
          totalContribution /
          weightTotal
        ) * 100
      : 0;


  // ====================================================
  // STRONGEST SECTOR
  // ====================================================

  const strongestSector =
    sectors.length > 0
      ? sectors[0]
      : null;


  // ====================================================
  // WEAKEST SECTOR
  // ====================================================

  const weakestSector =
    sectors.length > 0
      ? sectors[
          sectors.length - 1
        ]
      : null;


  // ====================================================
  // DEBUG
  // ====================================================

  console.log(
    "=========================================="
  );

  console.log(
    "NIFTY 50 SECTOR ENGINE"
  );

  console.log(
    "=========================================="
  );

  console.log(
    "Stocks:",
    stocks.length
  );

  console.log(
    "Weight:",
    weightTotal
  );

  console.log(
    "Contribution:",
    totalContribution
  );

  console.log(
    "Overall Score:",
    overallSectorScore
  );

  console.log(
    "Strongest:",
    strongestSector?.sector
  );

  console.log(
    "Weakest:",
    weakestSector?.sector
  );

  console.log(
    "=========================================="
  );


  // ====================================================
  // RETURN
  // ====================================================

  return {

    success:
      true,


    // --------------------------------------------------
    // NIFTY TOTALS
    // --------------------------------------------------

    overallSectorScore,

    totalContribution:
      Number(
        totalContribution.toFixed(4)
      ),

    weightTotal:
      Number(
        weightTotal.toFixed(4)
      ),

    overallPerformance:
      Number(
        overallPerformance.toFixed(4)
      ),


    niftyWeightTotal:
      Number(
        NIFTY_INDEX_WEIGHT_TOTAL.toFixed(
          4
        )
      ),


    // --------------------------------------------------
    // STRONGEST / WEAKEST
    // --------------------------------------------------

    strongestSector,

    weakestSector,


    // --------------------------------------------------
    // SECTOR DATA
    // --------------------------------------------------

    sectors,


    // --------------------------------------------------
    // ALL NIFTY 50 STOCKS
    //
    // THIS IS WHAT OUR NEW TABLE WILL USE
    // --------------------------------------------------

    stocks,
  };
}