export default function MACDCard({ macd }) {
  if (!macd) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700">
        <h2 className="text-gray-400 text-sm uppercase tracking-wide">
          MACD
        </h2>

        <div className="mt-6 text-gray-400">
          MACD data unavailable
        </div>
      </div>
    );
  }

  const state = macd.trend || "Neutral";

  const isBullish =
    state === "Bullish" ||
    state === "Bullish Pressure";

  const isBearish =
    state === "Bearish" ||
    state === "Bearish Pressure";

  const isConfirmed =
    macd.confirmation === "Confirmed";

  const stateColor =
    isBullish
      ? "text-green-400"
      : isBearish
      ? "text-red-400"
      : "text-yellow-400";

  const stateIcon =
    isBullish
      ? "🟢"
      : isBearish
      ? "🔴"
      : "🟡";

  function formatValue(value) {
    if (
      value === null ||
      value === undefined ||
      !Number.isFinite(Number(value))
    ) {
      return "-";
    }

    return Number(value).toFixed(3);
  }

  function getMomentumColor() {
    if (
      macd.momentum?.includes("Bullish")
    ) {
      return "text-green-400";
    }

    if (
      macd.momentum?.includes("Bearish")
    ) {
      return "text-red-400";
    }

    return "text-yellow-400";
  }

  function getSlopeColor(value) {
    if (
      value === "Rising" ||
      value === "Increasing"
    ) {
      return "text-green-400";
    }

    if (
      value === "Falling" ||
      value === "Decreasing"
    ) {
      return "text-red-400";
    }

    return "text-gray-300";
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700 hover:border-purple-500 transition-all duration-300">

      {/* =========================================
          HEADER
      ========================================= */}

      <div className="flex items-center justify-between">

        <div>
          <h2 className="text-gray-400 text-sm uppercase tracking-wide">
            MACD
          </h2>

          <p className="text-xs text-gray-500 mt-1">
            Zerodha · {macd.timeframe || "15M"} ·{" "}
            {macd.parameters || "12,26,9"}
          </p>
        </div>

        <div className="text-xs text-gray-500">
          Closed Candle
        </div>

      </div>


      {/* =========================================
          MAIN STATE
      ========================================= */}

      <div className="mt-5">

        <div
          className={`text-xl font-bold ${stateColor}`}
        >
          {stateIcon} {state}
        </div>

        <div
          className={`mt-1 text-sm ${
            isConfirmed
              ? "text-green-300"
              : "text-yellow-300"
          }`}
        >
          {macd.confirmation || "Not Confirmed"}
        </div>

      </div>


      {/* =========================================
          MACD VALUES
      ========================================= */}

      <div className="mt-5 space-y-3">

        <div className="flex justify-between items-center">
          <span className="text-gray-400">
            MACD
          </span>

          <span className="text-white font-bold">
            {formatValue(macd.macd)}
          </span>
        </div>


        <div className="flex justify-between items-center">
          <span className="text-gray-400">
            Signal
          </span>

          <span className="text-white font-bold">
            {formatValue(macd.signal)}
          </span>
        </div>


        <div className="flex justify-between items-center">
          <span className="text-gray-400">
            Histogram
          </span>

          <span
            className={`font-bold ${
              Number(macd.histogram) > 0
                ? "text-green-400"
                : Number(macd.histogram) < 0
                ? "text-red-400"
                : "text-gray-300"
            }`}
          >
            {formatValue(macd.histogram)}
          </span>
        </div>

      </div>


      {/* =========================================
          CROSSOVER
      ========================================= */}

      <div className="mt-5 p-3 rounded-lg bg-slate-900 border border-slate-700">

        <div className="flex justify-between">

          <span className="text-gray-400 text-sm">
            Crossover
          </span>

          <span
            className={`text-sm font-bold ${
              macd.crossoverDetected
                ? macd.crossoverDirection ===
                  "Bullish"
                  ? "text-green-400"
                  : "text-red-400"
                : "text-gray-300"
            }`}
          >
            {macd.crossover ||
              "No Fresh Crossover"}
          </span>

        </div>


        <div className="flex justify-between mt-2">

          <span className="text-gray-400 text-sm">
            Confirmation
          </span>

          <span
            className={`text-sm font-bold ${
              macd.confirmation ===
              "Confirmed"
                ? "text-green-400"
                : "text-yellow-400"
            }`}
          >
            {macd.confirmation ||
              "Not Confirmed"}
          </span>

        </div>

      </div>


      {/* =========================================
          MOMENTUM
      ========================================= */}

      <div className="mt-4">

        <div className="flex justify-between">

          <span className="text-gray-400 text-sm">
            Momentum
          </span>

          <span
            className={`text-sm font-bold ${getMomentumColor()}`}
          >
            {macd.momentum || "-"}
          </span>

        </div>

      </div>


      {/* =========================================
          SLOPES
      ========================================= */}

      <div className="mt-4 space-y-2">

        <div className="flex justify-between">

          <span className="text-gray-400 text-sm">
            MACD Slope
          </span>

          <span
            className={`text-sm font-semibold ${getSlopeColor(
              macd.macdSlope
            )}`}
          >
            {macd.macdSlope || "-"}
          </span>

        </div>


        <div className="flex justify-between">

          <span className="text-gray-400 text-sm">
            Histogram Slope
          </span>

          <span
            className={`text-sm font-semibold ${getSlopeColor(
              macd.histogramSlope
            )}`}
          >
            {macd.histogramSlope || "-"}
          </span>

        </div>


        <div className="flex justify-between">

          <span className="text-gray-400 text-sm">
            Zero Line
          </span>

          <span
            className={`text-sm font-semibold ${
              macd.zeroLine ===
              "Above Zero"
                ? "text-green-400"
                : macd.zeroLine ===
                  "Below Zero"
                ? "text-red-400"
                : "text-gray-300"
            }`}
          >
            {macd.zeroLine || "-"}
          </span>

        </div>

      </div>


      {/* =========================================
          WARNING / ACTION MESSAGE
      ========================================= */}

      <div className="mt-5 pt-4 border-t border-slate-700">

        {macd.crossoverDetected ? (
          <div
            className={`text-sm font-semibold ${
              macd.crossoverDirection ===
              "Bullish"
                ? "text-green-400"
                : "text-red-400"
            }`}
          >
            {macd.crossoverDirection ===
            "Bullish"
              ? "✓ Fresh bullish crossover detected"
              : "✓ Fresh bearish crossover detected"}
          </div>
        ) : (
          <div className="text-yellow-400 text-sm font-semibold">
            ⚠ No fresh crossover — wait for confirmation
          </div>
        )}

      </div>


      {/* =========================================
          LAST CLOSED CANDLE
      ========================================= */}

      {macd.lastCandleTime && (
        <div className="mt-3 text-xs text-gray-500">
          Last closed 15M candle:{" "}
          {new Date(
            macd.lastCandleTime
          ).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })}
        </div>
      )}

    </div>
  );
}