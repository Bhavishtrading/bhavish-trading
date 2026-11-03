
function getEarlyMarketConditions(market) {
  const price = Number(market?.price);
  const vwap = Number(market?.vwap);
  const ema9 = Number(market?.ema9);
  const ema20 = Number(market?.ema20);
  const volumeRatio = Number(market?.volume?.volumeRatio);

  const valid = (...values) =>
    values.every(Number.isFinite);

  return {
    price,
    vwap,
    ema9,
    ema20,
    volumeRatio,

    momentum: market?.momentum,
    structure: market?.structure?.structure,

    aboveVwap:
      valid(price, vwap) && price > vwap,

    belowVwap:
      valid(price, vwap) && price < vwap,

    bullishEMA:
      valid(ema9, ema20) && ema9 > ema20,

    bearishEMA:
      valid(ema9, ema20) && ema9 < ema20,

    momentumUp: market?.momentum === "UP",
    momentumDown: market?.momentum === "DOWN",

    volumeConfirmed:
      Number.isFinite(volumeRatio) &&
      volumeRatio >= 1.2,

    bullishStructure:
      market?.structure?.structure === "BULLISH_STRUCTURE",

    bearishStructure:
      market?.structure?.structure === "BEARISH_STRUCTURE",

    trapWarning:
      market?.breakout?.trapWarning === true,
  };
}

export function generateEarlySignal({
  analysis,
  marketConfirmation,
  dataSync,
  decision,
}) {
  if (
    !analysis?.success ||
    !marketConfirmation?.success ||
    !decision?.success
  ) {
    return {
      status: "WAIT",
      direction: "NEUTRAL",
      earlySignal: false,
      confirmed: false,
      reason: "Market or OI analysis unavailable",
    };
  }

  if (dataSync?.valid !== true) {
    return {
      status: "WAIT",
      direction: "NEUTRAL",
      earlySignal: false,
      confirmed: false,
      reason: "Futures and Options data synchronization failed",
    };
  }

  // Read actual bias from Decision Engine output
  const futuresBias =
    decision?.confirmations?.futures;

  const optionsBias =
    decision?.confirmations?.options?.bias;

  const conditions =
    getEarlyMarketConditions(marketConfirmation);

  // Early bullish conditions
  const bullishEarly =
    futuresBias === "BULLISH" &&
    optionsBias === "BULLISH" &&
    conditions.aboveVwap &&
    conditions.bullishEMA &&
    conditions.momentumUp;

  // Early bearish conditions
  const bearishEarly =
    futuresBias === "BEARISH" &&
    optionsBias === "BEARISH" &&
    conditions.belowVwap &&
    conditions.bearishEMA &&
    conditions.momentumDown;

  const noTrap =
    !conditions.trapWarning &&
    decision?.trapWarning !== true;

  // Fully confirmed signals
  const bullishConfirmed =
    bullishEarly &&
    conditions.volumeConfirmed &&
    conditions.bullishStructure &&
    noTrap;

  const bearishConfirmed =
    bearishEarly &&
    conditions.volumeConfirmed &&
    conditions.bearishStructure &&
    noTrap;

  if (bullishConfirmed) {
    return {
      status: "CONFIRMED_BULLISH",
      direction: "BULLISH",
      earlySignal: true,
      confirmed: true,
      reason: "Bullish OI, VWAP, EMA, momentum, volume and structure aligned",
      conditions,
    };
  }

  if (bearishConfirmed) {
    return {
      status: "CONFIRMED_BEARISH",
      direction: "BEARISH",
      earlySignal: true,
      confirmed: true,
      reason: "Bearish OI, VWAP, EMA, momentum, volume and structure aligned",
      conditions,
    };
  }

  // Early watch - structure confirmation is not mandatory
  if (bullishEarly && noTrap) {
    return {
      status: "EARLY_BULLISH_WATCH",
      direction: "BULLISH",
      earlySignal: true,
      confirmed: false,
      reason: conditions.volumeConfirmed
        ? "Bullish momentum and volume detected. Waiting for bullish structure"
        : "Bullish momentum detected. Waiting for volume and structure confirmation",
      conditions,
    };
  }

  if (bearishEarly && noTrap) {
    return {
      status: "EARLY_BEARISH_WATCH",
      direction: "BEARISH",
      earlySignal: true,
      confirmed: false,
      reason: conditions.volumeConfirmed
        ? "Bearish momentum and volume detected. Waiting for bearish structure"
        : "Bearish momentum detected. Waiting for volume and structure confirmation",
      conditions,
    };
  }

  return {
    status: "WAIT",
    direction: "NEUTRAL",
    earlySignal: false,
    confirmed: false,
    reason: !noTrap
      ? "Potential breakout trap detected"
      : "Early market conditions are not aligned",
    conditions,
  };
}
