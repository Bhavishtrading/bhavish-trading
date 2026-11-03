const MAX_DATA_AGE_MS = 20 * 60 * 1000;
const MAX_SOURCE_GAP_MS = 5 * 60 * 1000;

function getTimestamp(value) {
  if (!value) return null;

  const timestamp =
    typeof value === "number"
      ? value
      : new Date(value).getTime();

  return Number.isFinite(timestamp) ? timestamp : null;
}

export function validateOIBotDataSync({
  futuresSnapshot,
  optionsSnapshot,
  marketConfirmation,
  now = Date.now(),
}) {
  const futuresTime = getTimestamp(
    futuresSnapshot?.capturedAt ??
    futuresSnapshot?.capturedAtISO
  );

  const optionsTime = getTimestamp(
    optionsSnapshot?.capturedAt ??
    optionsSnapshot?.capturedAtISO
  );

  const candleCloseTime = getTimestamp(
    marketConfirmation?.candleCloseTime
  );

  const checks = {
    futuresAvailable: Boolean(futuresTime),
    optionsAvailable: Boolean(optionsTime),
    marketAvailable: Boolean(candleCloseTime),
  };

  if (!Object.values(checks).every(Boolean)) {
    return {
      valid: false,
      signal: "WAIT",
      reason: "One or more market data sources are unavailable.",
      checks,
    };
  }

  const futuresAge = now - futuresTime;
  const optionsAge = now - optionsTime;
  const candleAge = now - candleCloseTime;

  const sourceGap = Math.max(
    futuresTime,
    optionsTime,
    candleCloseTime
  ) - Math.min(
    futuresTime,
    optionsTime,
    candleCloseTime
  );

  checks.futuresFresh =
    futuresAge >= 0 && futuresAge <= MAX_DATA_AGE_MS;

  checks.optionsFresh =
    optionsAge >= 0 && optionsAge <= MAX_DATA_AGE_MS;

  checks.marketFresh =
    candleAge >= 0 && candleAge <= MAX_DATA_AGE_MS;

  checks.timestampsAligned =
    sourceGap <= MAX_SOURCE_GAP_MS;

  const valid = Object.values(checks).every(Boolean);

  return {
    valid,
    signal: valid ? "READY_FOR_ANALYSIS" : "WAIT",
    reason: valid
      ? "All market data sources are fresh and synchronized."
      : "Market data is stale or timestamps are not aligned.",
    checks,
    timestamps: {
      futures: new Date(futuresTime).toISOString(),
      options: new Date(optionsTime).toISOString(),
      marketCandleClose: new Date(candleCloseTime).toISOString(),
    },
    ageMinutes: {
      futures: Number((futuresAge / 60000).toFixed(2)),
      options: Number((optionsAge / 60000).toFixed(2)),
      market: Number((candleAge / 60000).toFixed(2)),
    },
    sourceGapMinutes: Number(
      (sourceGap / 60000).toFixed(2)
    ),
  };
}