import fs from "node:fs";
import path from "node:path";

// ======================================================
// CONFIGURATION
// ======================================================

const INPUT_FILE = path.resolve(
  "data/nifty-history/NIFTY_SPOT_5MIN_2YEARS.csv"
);

const OUTPUT_DIR = path.resolve("data/nifty-history");

const CONFIG = {
  leftBars: 2,
  rightBars: 2,
  retestWindow: 5,
  atrPeriod: 14,
  atrBufferMultiplier: 0.05,
  riskReward: 2,
  squareOffAtSessionEnd: true,

  // MARKET STRUCTURE FILTER
  useMarketStructureFilter: true,
};

// ======================================================
// CSV LOADER
// ======================================================

function parseCSVLine(line) {
  return line
    .split(",")
    .map((value) => value.trim().replace(/^"|"$/g, ""));
}

function loadCandles(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const lines = fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean);

  const headers = parseCSVLine(lines[0]);

  const required = ["date", "open", "high", "low", "close"];

  for (const field of required) {
    if (!headers.includes(field)) {
      throw new Error(`Missing CSV column: ${field}`);
    }
  }

  const candles = lines.slice(1).map((line) => {
    const values = parseCSVLine(line);

    const row = Object.fromEntries(
      headers.map((header, index) => [
        header,
        values[index],
      ])
    );

    return {
      date: row.date,
      time: new Date(row.date).getTime(),
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: Number(row.volume || 0),
    };
  });

  return candles
    .filter((candle) =>
      Number.isFinite(candle.time) &&
      [candle.open, candle.high, candle.low, candle.close]
        .every(Number.isFinite) &&
      candle.high >= Math.max(candle.open, candle.close) &&
      candle.low <= Math.min(candle.open, candle.close)
    )
    .sort((a, b) => a.time - b.time);
}

// ======================================================
// IST SESSION HELPERS
// ======================================================

function getISTSessionDate(candle) {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

  return new Date(
    candle.time + IST_OFFSET_MS
  ).toISOString().slice(0, 10);
}

function isLastCandleOfSession(candles, index) {
  if (index === candles.length - 1) {
    return true;
  }

  return (
    getISTSessionDate(candles[index]) !==
    getISTSessionDate(candles[index + 1])
  );
}

// ======================================================
// ATR
// ======================================================

function calculateTrueRange(candle, previous) {
  if (!previous) {
    return candle.high - candle.low;
  }

  return Math.max(
    candle.high - candle.low,
    Math.abs(candle.high - previous.close),
    Math.abs(candle.low - previous.close)
  );
}

function calculateATR(candles, index, period) {
  if (index < period) {
    return null;
  }

  let total = 0;

  for (let i = index - period + 1; i <= index; i++) {
    total += calculateTrueRange(
      candles[i],
      candles[i - 1]
    );
  }

  return total / period;
}

// ======================================================
// SWING HIGH / SWING LOW
// ======================================================

function isSwingHigh(candles, index) {
  const current = candles[index];

  for (
    let i = index - CONFIG.leftBars;
    i < index;
    i++
  ) {
    if (current.high <= candles[i].high) {
      return false;
    }
  }

  for (
    let i = index + 1;
    i <= index + CONFIG.rightBars;
    i++
  ) {
    if (current.high <= candles[i].high) {
      return false;
    }
  }

  return true;
}

function isSwingLow(candles, index) {
  const current = candles[index];

  for (
    let i = index - CONFIG.leftBars;
    i < index;
    i++
  ) {
    if (current.low >= candles[i].low) {
      return false;
    }
  }

  for (
    let i = index + 1;
    i <= index + CONFIG.rightBars;
    i++
  ) {
    if (current.low >= candles[i].low) {
      return false;
    }
  }

  return true;
}

// ======================================================
// CANDLE REJECTION
// ======================================================

function candleBody(candle) {
  return Math.abs(candle.close - candle.open);
}

function lowerWick(candle) {
  return (
    Math.min(candle.open, candle.close) -
    candle.low
  );
}

function upperWick(candle) {
  return (
    candle.high -
    Math.max(candle.open, candle.close)
  );
}

// ======================================================
// TRADE STATISTICS
// ======================================================

function calculateMaxDrawdown(trades) {
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;

  for (const trade of trades) {
    equity += trade.netPoints;
    peak = Math.max(peak, equity);

    maxDrawdown = Math.max(
      maxDrawdown,
      peak - equity
    );
  }

  return Number(maxDrawdown.toFixed(2));
}

function calculateStats(trades) {
  const closed = trades.filter((trade) =>
    ["TARGET", "STOP_LOSS", "EOD_SQUARE_OFF"].includes(
      trade.exitStatus
    )
  );

  const wins = closed.filter(
    (trade) => trade.netPoints > 0
  );

  const losses = closed.filter(
    (trade) => trade.netPoints <= 0
  );

  const grossProfit = wins.reduce(
    (sum, trade) => sum + trade.netPoints,
    0
  );

  const grossLoss = Math.abs(
    losses.reduce(
      (sum, trade) => sum + trade.netPoints,
      0
    )
  );

  const netPoints = closed.reduce(
    (sum, trade) => sum + trade.netPoints,
    0
  );

  function statsFor(list) {
    const won = list.filter(
      (trade) => trade.netPoints > 0
    ).length;

    return {
      trades: list.length,
      wins: won,
      losses: list.length - won,

      winRate: list.length
        ? Number((won / list.length * 100).toFixed(2))
        : 0,

      netPoints: Number(
        list.reduce(
          (sum, trade) => sum + trade.netPoints,
          0
        ).toFixed(2)
      ),
    };
  }

  const bullish = closed.filter(
    (trade) => trade.direction === "BULLISH"
  );

  const bearish = closed.filter(
    (trade) => trade.direction === "BEARISH"
  );

  return {
    totalSignals: trades.length,
    closedTrades: closed.length,

    openTrades: trades.filter(
      (trade) => trade.exitStatus === "OPEN"
    ).length,

    wins: wins.length,
    losses: losses.length,

    winRate: closed.length
      ? Number(
          (wins.length / closed.length * 100).toFixed(2)
        )
      : 0,

    grossProfit: Number(grossProfit.toFixed(2)),
    grossLoss: Number(grossLoss.toFixed(2)),

    profitFactor: grossLoss
      ? Number((grossProfit / grossLoss).toFixed(2))
      : grossProfit > 0
        ? "Infinity"
        : 0,

    netPoints: Number(netPoints.toFixed(2)),

    maxDrawdown: calculateMaxDrawdown(closed),

    averagePoints: closed.length
      ? Number((netPoints / closed.length).toFixed(2))
      : 0,

    eodSquareOffs: closed.filter(
      (trade) => trade.exitStatus === "EOD_SQUARE_OFF"
    ).length,

    bullish: statsFor(bullish),
    bearish: statsFor(bearish),
  };
}

// ======================================================
// BACKTEST ENGINE
// ======================================================

function runBacktest(candles) {
  const trades = [];

  let latestSwingHigh = null;
  let latestSwingLow = null;

  // Latest two confirmed swing highs and lows
  const recentSwingHighs = [];
  const recentSwingLows = [];

  let marketStructure = "UNKNOWN";

  let bullishStructureCount = 0;
  let bearishStructureCount = 0;
  let mixedStructureCount = 0;
  let unknownStructureCount = 0;

  let structureRejectedBullish = 0;
  let structureRejectedBearish = 0;

  let structureAllowedBullish = 0;
  let structureAllowedBearish = 0;

  let pending = null;
  let position = null;

  let swingHighCount = 0;
  let swingLowCount = 0;

  let eodSquareOffCount = 0;
  let overnightGapExitCount = 0;
  let skippedLastCandleEntries = 0;

  // ----------------------------------------------------
  // CLOSE POSITION
  // ----------------------------------------------------

  function closePosition(
    exitPrice,
    exitDate,
    exitStatus,
    exitReason
  ) {
    const points =
      position.direction === "BULLISH"
        ? exitPrice - position.entry
        : position.entry - exitPrice;

    position.trade.exitDate = exitDate;

    position.trade.exitPrice = Number(
      exitPrice.toFixed(2)
    );

    position.trade.exitStatus = exitStatus;
    position.trade.exitReason = exitReason;

    position.trade.netPoints = Number(
      points.toFixed(2)
    );

    position.trade.resultR = Number(
      (points / position.risk).toFixed(2)
    );

    position = null;
  }

  // ====================================================
  // CANDLE LOOP
  // ====================================================

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const previous = candles[i - 1];

    const lastOfSession = isLastCandleOfSession(
      candles,
      i
    );

    // --------------------------------------------------
    // CONFIRMED SWING + MARKET STRUCTURE UPDATE
    // --------------------------------------------------

    // A swing is used only after its right-side candles
    // have completed. This avoids look-ahead bias.

    const pivotIndex = i - CONFIG.rightBars;

    if (pivotIndex >= CONFIG.leftBars) {

      // SWING HIGH
      if (isSwingHigh(candles, pivotIndex)) {
        latestSwingHigh = {
          price: candles[pivotIndex].high,
          date: candles[pivotIndex].date,
          confirmedAt: i,
        };

        recentSwingHighs.push(latestSwingHigh);

        if (recentSwingHighs.length > 2) {
          recentSwingHighs.shift();
        }

        swingHighCount++;
      }

      // SWING LOW
      if (isSwingLow(candles, pivotIndex)) {
        latestSwingLow = {
          price: candles[pivotIndex].low,
          date: candles[pivotIndex].date,
          confirmedAt: i,
        };

        recentSwingLows.push(latestSwingLow);

        if (recentSwingLows.length > 2) {
          recentSwingLows.shift();
        }

        swingLowCount++;
      }

      // MARKET STRUCTURE CLASSIFICATION
      if (
        recentSwingHighs.length === 2 &&
        recentSwingLows.length === 2
      ) {
        const previousHigh = recentSwingHighs[0].price;
        const currentHigh = recentSwingHighs[1].price;

        const previousLow = recentSwingLows[0].price;
        const currentLow = recentSwingLows[1].price;

        // HH + HL
        if (
          currentHigh > previousHigh &&
          currentLow > previousLow
        ) {
          marketStructure = "BULLISH_STRUCTURE";
        }

        // LH + LL
        else if (
          currentHigh < previousHigh &&
          currentLow < previousLow
        ) {
          marketStructure = "BEARISH_STRUCTURE";
        }

        // Mixed structure
        else {
          marketStructure = "MIXED_STRUCTURE";
        }
      } else {
        marketStructure = "UNKNOWN";
      }
    }

    // STRUCTURE DIAGNOSTICS
    if (marketStructure === "BULLISH_STRUCTURE") {
      bullishStructureCount++;
    } else if (marketStructure === "BEARISH_STRUCTURE") {
      bearishStructureCount++;
    } else if (marketStructure === "MIXED_STRUCTURE") {
      mixedStructureCount++;
    } else {
      unknownStructureCount++;
    }

    // --------------------------------------------------
    // OVERNIGHT GAP PROTECTION
    // --------------------------------------------------

    if (
      position &&
      previous &&
      getISTSessionDate(previous) !==
        getISTSessionDate(candle)
    ) {
      const openingPrice = candle.open;

      let gapExit = false;

      if (position.direction === "BULLISH") {

        if (openingPrice <= position.stopLoss) {
          closePosition(
            openingPrice,
            candle.date,
            "STOP_LOSS",
            "OVERNIGHT_GAP_STOP"
          );

          gapExit = true;

        } else if (openingPrice >= position.target) {
          closePosition(
            openingPrice,
            candle.date,
            "TARGET",
            "OVERNIGHT_GAP_TARGET"
          );

          gapExit = true;
        }

      } else {

        if (openingPrice >= position.stopLoss) {
          closePosition(
            openingPrice,
            candle.date,
            "STOP_LOSS",
            "OVERNIGHT_GAP_STOP"
          );

          gapExit = true;

        } else if (openingPrice <= position.target) {
          closePosition(
            openingPrice,
            candle.date,
            "TARGET",
            "OVERNIGHT_GAP_TARGET"
          );

          gapExit = true;
        }
      }

      if (gapExit) {
        overnightGapExitCount++;

      } else {
        closePosition(
          previous.close,
          previous.date,
          "EOD_SQUARE_OFF",
          "OVERNIGHT_CARRY_FALLBACK"
        );

        eodSquareOffCount++;
      }

      pending = null;
      continue;
    }

    // --------------------------------------------------
    // EXISTING POSITION MANAGEMENT
    // --------------------------------------------------

    if (position) {
      const hitSL =
        position.direction === "BULLISH"
          ? candle.low <= position.stopLoss
          : candle.high >= position.stopLoss;

      const hitTarget =
        position.direction === "BULLISH"
          ? candle.high >= position.target
          : candle.low <= position.target;

      // Conservative rule: SL gets priority.
      if (hitSL) {
        closePosition(
          position.stopLoss,
          candle.date,
          "STOP_LOSS",
          "INTRADAY_STOP_LOSS"
        );

        continue;
      }

      if (hitTarget) {
        closePosition(
          position.target,
          candle.date,
          "TARGET",
          "INTRADAY_TARGET"
        );

        continue;
      }

      // Square-off at final session candle close.
      if (
        CONFIG.squareOffAtSessionEnd &&
        lastOfSession
      ) {
        closePosition(
          candle.close,
          candle.date,
          "EOD_SQUARE_OFF",
          "INTRADAY_SESSION_CLOSE"
        );

        eodSquareOffCount++;
        continue;
      }

      continue;
    }

    // --------------------------------------------------
    // NO NEW ENTRY ON LAST SESSION CANDLE
    // --------------------------------------------------

    if (lastOfSession) {
      if (pending) {
        pending = null;
      }

      skippedLastCandleEntries++;
      continue;
    }

    // --------------------------------------------------
    // RETEST TRACKING
    // --------------------------------------------------

    if (pending) {
      pending.candlesElapsed++;

      const level = pending.level;
      const buffer = pending.buffer;

      // BULLISH RETEST
      if (pending.direction === "BULLISH") {

        if (candle.close <= level) {
          pending = null;
          continue;
        }

        const retest =
          candle.low <= level + buffer &&
          candle.low >= level - buffer &&
          candle.close > level &&
          candle.close > candle.open;

        const rejection =
          retest &&
          lowerWick(candle) >
            candleBody(candle) * 0.5;

        if (retest && rejection) {
          const entry = candle.close;
          const stopLoss = candle.low;

          const risk = entry - stopLoss;

          if (risk > 0) {
            const target =
              entry + risk * CONFIG.riskReward;

            const trade = {
              direction: "BULLISH",

              marketStructure:
                pending.marketStructureAtBreakout ||
                marketStructure,

              breakoutDate: pending.breakoutDate,
              retestDate: candle.date,
              entryDate: candle.date,

              entry,
              stopLoss,
              target,

              risk: Number(risk.toFixed(2)),
              riskReward: CONFIG.riskReward,

              exitDate: "",
              exitPrice: "",
              exitStatus: "OPEN",
              exitReason: "",

              netPoints: "",
              resultR: "",
            };

            trades.push(trade);

            position = {
              direction: "BULLISH",
              entry,
              stopLoss,
              target,
              risk,
              trade,
            };
          }

          pending = null;
          continue;
        }

      }

      // BEARISH RETEST
      else {

        if (candle.close >= level) {
          pending = null;
          continue;
        }

        const retest =
          candle.high >= level - buffer &&
          candle.high <= level + buffer &&
          candle.close < level &&
          candle.close < candle.open;

        const rejection =
          retest &&
          upperWick(candle) >
            candleBody(candle) * 0.5;

        if (retest && rejection) {
          const entry = candle.close;
          const stopLoss = candle.high;

          const risk = stopLoss - entry;

          if (risk > 0) {
            const target =
              entry - risk * CONFIG.riskReward;

            const trade = {
              direction: "BEARISH",

              marketStructure:
                pending.marketStructureAtBreakout ||
                marketStructure,

              breakoutDate: pending.breakoutDate,
              retestDate: candle.date,
              entryDate: candle.date,

              entry,
              stopLoss,
              target,

              risk: Number(risk.toFixed(2)),
              riskReward: CONFIG.riskReward,

              exitDate: "",
              exitPrice: "",
              exitStatus: "OPEN",
              exitReason: "",

              netPoints: "",
              resultR: "",
            };

            trades.push(trade);

            position = {
              direction: "BEARISH",
              entry,
              stopLoss,
              target,
              risk,
              trade,
            };
          }

          pending = null;
          continue;
        }
      }

      if (pending) {
        if (
          pending.candlesElapsed >=
          CONFIG.retestWindow
        ) {
          pending = null;
        }

        continue;
      }
    }

    // --------------------------------------------------
    // BREAKOUT DETECTION
    // --------------------------------------------------

    if (!latestSwingHigh || !latestSwingLow) {
      continue;
    }

    const atr = calculateATR(
      candles,
      i,
      CONFIG.atrPeriod
    );

    if (
      !Number.isFinite(atr) ||
      atr <= 0 ||
      !previous
    ) {
      continue;
    }

    const buffer =
      atr * CONFIG.atrBufferMultiplier;

    const bullishBreakout =
      candle.close >
        latestSwingHigh.price + buffer &&
      previous.close <=
        latestSwingHigh.price + buffer;

    const bearishBreakout =
      candle.close <
        latestSwingLow.price - buffer &&
      previous.close >=
        latestSwingLow.price - buffer;

    // --------------------------------------------------
    // MARKET STRUCTURE FILTER
    // --------------------------------------------------

    if (bullishBreakout) {

      const structureAllowsTrade =
        !CONFIG.useMarketStructureFilter ||
        marketStructure === "BULLISH_STRUCTURE";

      if (!structureAllowsTrade) {
        structureRejectedBullish++;
        continue;
      }

      structureAllowedBullish++;

      pending = {
        direction: "BULLISH",
        level: latestSwingHigh.price,
        breakoutDate: candle.date,
        candlesElapsed: 0,
        buffer,
        marketStructureAtBreakout: marketStructure,
      };

    } else if (bearishBreakout) {

      const structureAllowsTrade =
        !CONFIG.useMarketStructureFilter ||
        marketStructure === "BEARISH_STRUCTURE";

      if (!structureAllowsTrade) {
        structureRejectedBearish++;
        continue;
      }

      structureAllowedBearish++;

      pending = {
        direction: "BEARISH",
        level: latestSwingLow.price,
        breakoutDate: candle.date,
        candlesElapsed: 0,
        buffer,
        marketStructureAtBreakout: marketStructure,
      };
    }
  }

  // ----------------------------------------------------
  // FINAL DATASET SAFETY
  // ----------------------------------------------------

  if (position && candles.length) {
    const lastCandle = candles.at(-1);

    closePosition(
      lastCandle.close,
      lastCandle.date,
      "EOD_SQUARE_OFF",
      "FINAL_DATASET_CLOSE"
    );

    eodSquareOffCount++;
  }

  // ----------------------------------------------------
  // RETURN RESULT
  // ----------------------------------------------------

  return {
    trades,

    diagnostics: {
      candlesProcessed: candles.length,

      confirmedSwingHighs: swingHighCount,
      confirmedSwingLows: swingLowCount,

      marketStructureAtEnd: marketStructure,

      structureCandles: {
        bullish: bullishStructureCount,
        bearish: bearishStructureCount,
        mixed: mixedStructureCount,
        unknown: unknownStructureCount,
      },

      structureFilter: {
        enabled: CONFIG.useMarketStructureFilter,

        allowedBullishBreakouts:
          structureAllowedBullish,

        allowedBearishBreakouts:
          structureAllowedBearish,

        rejectedBullishBreakouts:
          structureRejectedBullish,

        rejectedBearishBreakouts:
          structureRejectedBearish,
      },

      pendingSetupAtEnd: pending
        ? pending.direction
        : null,

      eodSquareOffCount,
      overnightGapExitCount,
      skippedLastCandleEntries,

      configuration: CONFIG,
    },
  };
}

// ======================================================
// CSV WRITER
// ======================================================

function writeCSV(filePath, rows) {
  if (!rows.length) {
    fs.writeFileSync(filePath, "No data\n");
    return;
  }

  const headers = Object.keys(rows[0]);

  const escape = (value) => {
    const text = String(value ?? "");

    return `"${text.replace(/"/g, '""')}"`;
  };

  const output = [
    headers.join(","),

    ...rows.map((row) =>
      headers
        .map((header) => escape(row[header]))
        .join(",")
    ),
  ].join("\n");

  fs.writeFileSync(filePath, output);
}

// ======================================================
// MAIN
// ======================================================

function main() {
  console.log("Loading NIFTY historical candles...");

  const candles = loadCandles(INPUT_FILE);

  console.log(`Loaded candles: ${candles.length}`);

  if (candles.length < 100) {
    throw new Error(
      "Not enough historical candles for backtesting"
    );
  }

  const result = runBacktest(candles);

  const stats = calculateStats(result.trades);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const tradesFile = path.join(
    OUTPUT_DIR,
    "BREAKOUT_RETEST_TRADES.csv"
  );

  const summaryFile = path.join(
    OUTPUT_DIR,
    "BREAKOUT_RETEST_SUMMARY.json"
  );

  writeCSV(tradesFile, result.trades);

  const summary = {
    instrument: "NIFTY 50 Spot",
    timeframe: "5minute",

    dataFile: INPUT_FILE,

    firstCandle: candles[0].date,
    lastCandle: candles.at(-1).date,

    stats,

    diagnostics: result.diagnostics,
  };

  fs.writeFileSync(
    summaryFile,
    JSON.stringify(summary, null, 2)
  );

  console.log("\n========== BACKTEST SUMMARY ==========");

  console.log(
    JSON.stringify(summary, null, 2)
  );

  console.log("\nGenerated files:");

  console.log(tradesFile);
  console.log(summaryFile);
}

// ======================================================
// EXECUTION
// ======================================================

main();