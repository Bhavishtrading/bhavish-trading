// src/services/zerodha/nifty50Sectors.js

// ======================================================
// NIFTY 50 SECTOR MASTER
// Current constituent structure
// Effective: 30-Sep-2026
//
// IMPORTANT:
// - One stock = ONE primary sector
// - No thematic/index overlap
// - Weight must come from the same NIFTY snapshot
// - Do NOT mix different dates
// ======================================================

export const NIFTY50_STOCKS = [
  // =========================
  // FINANCIAL SERVICES
  // =========================
  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Financial Services", subSector: "Private Bank", weight: null },
  { symbol: "ICICIBANK", name: "ICICI Bank", sector: "Financial Services", subSector: "Private Bank", weight: null },
  { symbol: "SBIN", name: "State Bank of India", sector: "Financial Services", subSector: "PSU Bank", weight: null },
  { symbol: "AXISBANK", name: "Axis Bank", sector: "Financial Services", subSector: "Private Bank", weight: null },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", sector: "Financial Services", subSector: "Private Bank", weight: null },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", sector: "Financial Services", subSector: "NBFC", weight: null },
  { symbol: "SHRIRAMFIN", name: "Shriram Finance", sector: "Financial Services", subSector: "NBFC", weight: null },
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv", sector: "Financial Services", subSector: "Other Financial Services", weight: null },
  { symbol: "JIOFIN", name: "Jio Financial Services", sector: "Financial Services", subSector: "Other Financial Services", weight: null },
  { symbol: "SBILIFE", name: "SBI Life Insurance", sector: "Financial Services", subSector: "Insurance", weight: null },
  { symbol: "HDFCLIFE", name: "HDFC Life Insurance", sector: "Financial Services", subSector: "Insurance", weight: null },

  // =========================
  // OIL / GAS
  // =========================
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Oil, Gas & Consumable Fuels", subSector: "Oil & Gas", weight: null },
  { symbol: "ONGC", name: "ONGC", sector: "Oil, Gas & Consumable Fuels", subSector: "Oil & Gas", weight: null },
  { symbol: "COALINDIA", name: "Coal India", sector: "Oil, Gas & Consumable Fuels", subSector: "Coal", weight: null },
  { symbol: "ADANIENT", name: "Adani Enterprises", sector: "Oil, Gas & Consumable Fuels", subSector: "Diversified Energy", weight: null },

  // =========================
  // INFORMATION TECHNOLOGY
  // =========================
  { symbol: "INFY", name: "Infosys", sector: "Information Technology", subSector: "IT Services", weight: null },
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "Information Technology", subSector: "IT Services", weight: null },
  { symbol: "HCLTECH", name: "HCL Technologies", sector: "Information Technology", subSector: "IT Services", weight: null },
  { symbol: "TECHM", name: "Tech Mahindra", sector: "Information Technology", subSector: "IT Services", weight: null },

  // =========================
  // AUTO
  // =========================
  { symbol: "M&M", name: "Mahindra & Mahindra", sector: "Automobile & Auto Components", subSector: "Automobile", weight: null },
  { symbol: "MARUTI", name: "Maruti Suzuki", sector: "Automobile & Auto Components", subSector: "Automobile", weight: null },
  { symbol: "BAJAJ-AUTO", name: "Bajaj Auto", sector: "Automobile & Auto Components", subSector: "Automobile", weight: null },
  { symbol: "EICHERMOT", name: "Eicher Motors", sector: "Automobile & Auto Components", subSector: "Automobile", weight: null },
  { symbol: "TMPV", name: "Tata Motors Passenger Vehicles", sector: "Automobile & Auto Components", subSector: "Automobile", weight: null },

  // =========================
  // FMCG
  // =========================
  { symbol: "ITC", name: "ITC", sector: "Fast Moving Consumer Goods", subSector: "FMCG", weight: null },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", sector: "Fast Moving Consumer Goods", subSector: "FMCG", weight: null },
  { symbol: "NESTLEIND", name: "Nestle India", sector: "Fast Moving Consumer Goods", subSector: "FMCG", weight: null },
  { symbol: "TATACONSUM", name: "Tata Consumer Products", sector: "Fast Moving Consumer Goods", subSector: "FMCG", weight: null },

  // =========================
  // TELECOMMUNICATION
  // =========================
  { symbol: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecommunication", subSector: "Telecom", weight: null },

  // =========================
  // METALS & MINING
  // =========================
  { symbol: "TATASTEEL", name: "Tata Steel", sector: "Metals & Mining", subSector: "Steel", weight: null },
  { symbol: "HINDALCO", name: "Hindalco Industries", sector: "Metals & Mining", subSector: "Aluminium", weight: null },
  { symbol: "JSWSTEEL", name: "JSW Steel", sector: "Metals & Mining", subSector: "Steel", weight: null },

  // =========================
  // HEALTHCARE
  // =========================
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical", sector: "Healthcare", subSector: "Pharma", weight: null },
  { symbol: "CIPLA", name: "Cipla", sector: "Healthcare", subSector: "Pharma", weight: null },
  { symbol: "DRREDDY", name: "Dr Reddy's Laboratories", sector: "Healthcare", subSector: "Pharma", weight: null },
  { symbol: "APOLLOHOSP", name: "Apollo Hospitals", sector: "Healthcare", subSector: "Healthcare Services", weight: null },
  { symbol: "MAXHEALTH", name: "Max Healthcare", sector: "Healthcare", subSector: "Healthcare Services", weight: null },

  // =========================
  // CONSTRUCTION
  // =========================
  { symbol: "LT", name: "Larsen & Toubro", sector: "Construction", subSector: "Construction", weight: null },

  // =========================
  // POWER
  // =========================
  { symbol: "NTPC", name: "NTPC", sector: "Power", subSector: "Power Generation", weight: null },
  { symbol: "POWERGRID", name: "Power Grid Corporation", sector: "Power", subSector: "Power Transmission", weight: null },

  // =========================
  // CONSUMER DURABLES
  // =========================
  { symbol: "TITAN", name: "Titan Company", sector: "Consumer Durables", subSector: "Consumer Durables", weight: null },
  { symbol: "ASIANPAINT", name: "Asian Paints", sector: "Consumer Durables", subSector: "Consumer Durables", weight: null },

  // =========================
  // CONSUMER SERVICES
  // =========================
  { symbol: "ETERNAL", name: "Eternal", sector: "Consumer Services", subSector: "Consumer Services", weight: null },
  { symbol: "TRENT", name: "Trent", sector: "Consumer Services", subSector: "Retail", weight: null },

  // =========================
  // CONSTRUCTION MATERIALS
  // =========================
  { symbol: "ULTRACEMCO", name: "UltraTech Cement", sector: "Construction Materials", subSector: "Cement", weight: null },
  { symbol: "GRASIM", name: "Grasim Industries", sector: "Construction Materials", subSector: "Cement", weight: null },

  // =========================
  // SERVICES
  // =========================
  { symbol: "ADANIPORTS", name: "Adani Ports", sector: "Services", subSector: "Transport & Logistics", weight: null },
  { symbol: "INDIGO", name: "InterGlobe Aviation", sector: "Services", subSector: "Air Transport", weight: null },

  // =========================
  // CAPITAL GOODS
  // =========================
  { symbol: "BEL", name: "Bharat Electronics", sector: "Capital Goods", subSector: "Defence Electronics", weight: null },

  // =========================
  // FINANCIAL SERVICES
  // BSE entered NIFTY 50 on 30-Sep-2026
  // =========================
  { symbol: "BSE", name: "BSE Ltd", sector: "Financial Services", subSector: "Capital Markets", weight: null },
];

// ======================================================
// PRIMARY SECTORS
// ======================================================

export const NIFTY50_SECTORS = [
  "Financial Services",
  "Oil, Gas & Consumable Fuels",
  "Information Technology",
  "Automobile & Auto Components",
  "Fast Moving Consumer Goods",
  "Telecommunication",
  "Metals & Mining",
  "Healthcare",
  "Construction",
  "Power",
  "Consumer Durables",
  "Consumer Services",
  "Construction Materials",
  "Services",
  "Capital Goods",
];

// ======================================================
// VALIDATION
// ======================================================

export function validateNifty50Stocks(stocks = NIFTY50_STOCKS) {
  const symbols = stocks.map((stock) => stock.symbol);

  const duplicates = symbols.filter(
    (symbol, index) => symbols.indexOf(symbol) !== index
  );

  const missingWeights = stocks.filter(
    (stock) => stock.weight === null || stock.weight === undefined
  );

  const invalidSectors = stocks.filter(
    (stock) => !NIFTY50_SECTORS.includes(stock.sector)
  );

  const totalWeight = stocks.reduce(
    (total, stock) => total + Number(stock.weight || 0),
    0
  );

  return {
    stockCount: stocks.length,
    duplicateSymbols: [...new Set(duplicates)],
    missingWeightCount: missingWeights.length,
    invalidSectorCount: invalidSectors.length,
    totalWeight: Number(totalWeight.toFixed(4)),
    isComplete:
      stocks.length === 50 &&
      duplicates.length === 0 &&
      missingWeights.length === 0 &&
      invalidSectors.length === 0 &&
      Math.abs(totalWeight - 100) < 0.05,
  };
}

// ======================================================
// SECTOR AGGREGATION
// ======================================================

export function getSectorWeights(stocks = NIFTY50_STOCKS) {
  const result = {};

  for (const sector of NIFTY50_SECTORS) {
    result[sector] = {
      sector,
      weight: 0,
      stocks: [],
    };
  }

  for (const stock of stocks) {
    if (!result[stock.sector]) continue;

    result[stock.sector].weight += Number(stock.weight || 0);

    result[stock.sector].stocks.push({
      symbol: stock.symbol,
      name: stock.name,
      weight: stock.weight,
      subSector: stock.subSector,
    });
  }

  for (const sector of Object.values(result)) {
    sector.weight = Number(sector.weight.toFixed(4));
  }

  return result;
}

// ======================================================
// TOTAL WEIGHT
// ======================================================

export function getTotalWeight(stocks = NIFTY50_STOCKS) {
  return Number(
    stocks
      .reduce((total, stock) => total + Number(stock.weight || 0), 0)
      .toFixed(4)
  );
}