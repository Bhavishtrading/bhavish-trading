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
// NEW SCORE MODEL:
//
// Sector Weight = Maximum Score
// +2% performance = Full Positive Score
// -2% performance = Full Negative Score
//
// Example:
//
// IT weight = 7.76
//
// +0.10% → +0.388
// +0.50% → +1.940
// +1.00% → +3.880
// +1.50% → +5.820
// +2.00% → +7.760
// +3.00% → +7.760  (capped)
//
// Same logic for negative side.
//
// UI is NOT touched here.
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
// A sector reaching ±2% gets its full NIFTY weight
// as its maximum score.
//
// Example:
//
// IT weight = 7.76
// +2% = +7.76
// -2% = -7.76
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

  const instruments =
    NIFTY50_STOCKS.map(
      (stock) =>
        `NSE:${stock.symbol}`
    );

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
  const weight =
    Number(
      NIFTY50_WEIGHTS[
        stock.symbol
      ] || 0
    );

  const ltp =
    Number(
      quote?.last_price || 0
    );

  const previousClose =
    Number(
      quote?.ohlc?.close || 0
    );

  let changePercent = 0;

  if (
    previousClose > 0 &&
    ltp > 0
  ) {
    changePercent =
      (
        (ltp - previousClose) /
        previousClose
      ) * 100;
  }


  // ----------------------------------------------------
  // Weighted contribution
  //
  // Example:
  //
  // Weight = 10%
  // Stock change = +2%
  //
  // Contribution =
  // 10 × 2 / 100
  // = +0.20
  // ----------------------------------------------------

  const weightedContribution =
    (
      weight *
      changePercent
    ) / 100;


  return {
    symbol:
      stock.symbol,

    name:
      stock.name,

    sector:
      stock.sector,

    subSector:
      stock.subSector,

    weight,

    ltp,

    previousClose,

    change:
      Number(
        (
          ltp -
          previousClose
        ).toFixed(2)
      ),

    changePercent:
      Number(
        changePercent.toFixed(4)
      ),

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


  // ----------------------------------------------------
  // Group stocks by primary sector
  // ----------------------------------------------------

  for (
    const stock of stocks
  ) {
    const sector =
      stock.sector;

    if (!sectorMap[sector]) {
      sectorMap[sector] = {
        sector,

        sectorWeight: 0,

        contribution: 0,

        stocks: [],
      };
    }

    sectorMap[
      sector
    ].sectorWeight +=
      stock.weight;

    sectorMap[
      sector
    ].contribution +=
      stock.weightedContribution;

    sectorMap[
      sector
    ].stocks.push(
      stock
    );
  }


  // ----------------------------------------------------
  // Calculate sector performance
  // + weight-based sector score
  // ----------------------------------------------------

  const sectors =
    Object.values(
      sectorMap
    ).map(
      (sector) => {

        // ----------------------------------------------
        // Sector Performance
        //
        // Weighted sector contribution /
        // sector total weight
        //
        // Example:
        //
        // contribution = 0.1881
        // weight       = 7.76
        //
        // performance =
        // 0.1881 / 7.76 × 100
        // = +2.424%
        // ----------------------------------------------

        const sectorPerformance =
          sector.sectorWeight > 0
            ? (
                sector.contribution /
                sector.sectorWeight
              ) * 100
            : 0;


        // ----------------------------------------------
        // NEW SECTOR SCORE
        //
        // Sector weight = maximum score
        //
        // Formula:
        //
        // performance / 2 × sector weight
        //
        // Then cap between:
        //
        // -sectorWeight
        // +
        // sectorWeight
        //
        // ----------------------------------------------

        const rawScore =
          (
            sectorPerformance /
            FULL_SCORE_PERFORMANCE
          ) *
          sector.sectorWeight;


        const score =
          Math.max(
            -sector.sectorWeight,
            Math.min(
              sector.sectorWeight,
              rawScore
            )
          );


        // ----------------------------------------------
        // Direction
        //
        // IMPORTANT:
        // Direction is now based on performance,
        // not old +100 score.
        // ----------------------------------------------

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

          stocks:
            sector.stocks,
        };
      }
    );


  // ----------------------------------------------------
  // Sort strongest → weakest
  // ----------------------------------------------------

  sectors.sort(
    (a, b) =>
      b.score -
      a.score
  );


  return sectors;
}


// ======================================================
// MAIN ENGINE
// ======================================================

export async function getNifty50SectorData() {

  // ----------------------------------------------------
  // Get live Zerodha quotes
  // ----------------------------------------------------

  const quotes =
    await getNifty50Quotes();


  // ----------------------------------------------------
  // Calculate individual stock data
  // ----------------------------------------------------

  const stockData = [];

  for (
    const stock of NIFTY50_STOCKS
  ) {

    const quote =
      quotes[
        `NSE:${stock.symbol}`
      ];

    if (!quote) {

      console.warn(
        `NIFTY 50 quote missing: ${stock.symbol}`
      );

      continue;
    }

    const data =
      calculateStockData(
        stock,
        quote
      );

    stockData.push(
      data
    );
  }


  // ----------------------------------------------------
  // Build sector aggregation
  // ----------------------------------------------------

  const sectors =
    buildSectorData(
      stockData
    );


  // ----------------------------------------------------
  // Total NIFTY contribution
  // ----------------------------------------------------

  const totalContribution =
    stockData.reduce(
      (sum, stock) =>
        sum +
        stock.weightedContribution,
      0
    );


  // ----------------------------------------------------
  // Calculate overall sector score
  //
  // IMPORTANT:
  //
  // We now SUM the 15 sector scores.
  //
  // Because every sector's maximum score is its
  // NIFTY weight, total maximum is approximately
  // 100.
  //
  // Example:
  //
  // IT max       = 7.76
  // Auto max     = 6.43
  // Financial    = 37.76
  // ...
  //
  // Total ≈ 99.98
  //
  // Therefore:
  //
  // Overall Score ≈ -100 to +100
  //
  // ----------------------------------------------------

  const overallSectorScore =
    sectors.reduce(
      (sum, sector) =>
        sum +
        Number(
          sector.score || 0
        ),
      0
    );


  // ----------------------------------------------------
  // Count positive / negative stocks
  // ----------------------------------------------------

  const advancingStocks =
    stockData.filter(
      (stock) =>
        stock.changePercent > 0
    ).length;

  const decliningStocks =
    stockData.filter(
      (stock) =>
        stock.changePercent < 0
    ).length;

  const unchangedStocks =
    stockData.filter(
      (stock) =>
        stock.changePercent === 0
    ).length;


  // ----------------------------------------------------
  // Return final response
  // ----------------------------------------------------

  return {

    success: true,

    timestamp:
      new Date().toISOString(),

    stockCount:
      stockData.length,

    configuredStockCount:
      NIFTY50_STOCKS.length,

    weightTotal:
      Number(
        NIFTY_INDEX_WEIGHT_TOTAL.toFixed(
          4
        )
      ),

    totalContribution:
      Number(
        totalContribution.toFixed(
          4
        )
      ),

    overallSectorScore:
      Number(
        overallSectorScore.toFixed(
          2
        )
      ),

    advancingStocks,

    decliningStocks,

    unchangedStocks,

    stocks:
      stockData,

    sectors,
  };
}