export default function BhavishScoreCard({ score }) {
  if (!score) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700">
        <h2 className="text-gray-400 text-sm uppercase tracking-wide">
          BHAVISH SCORE
        </h2>

        <div className="mt-5 text-gray-400">
          Score unavailable
        </div>
      </div>
    );
  }

  const value = Number(score.score ?? 0);

  const bullish =
    value >= 80;

  const bearish =
    value <= -80;

  const stateColor =
    bullish
      ? "text-green-400"
      : bearish
      ? "text-red-400"
      : "text-yellow-400";

  const stateIcon =
    bullish
      ? "🟢"
      : bearish
      ? "🔴"
      : "🟡";

  const actionColor =
    score.action === "BUY CE"
      ? "text-green-400"
      : score.action === "BUY PE"
      ? "text-red-400"
      : "text-yellow-400";

  const factors = score.factors ?? {};

  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700 hover:border-cyan-500 transition-all duration-300">

      {/* TITLE */}
      <h2 className="text-gray-400 text-sm uppercase tracking-wide">
        🧠 BHAVISH SCORE
      </h2>

      {/* SCORE */}
      <div className={`mt-4 text-4xl font-bold ${stateColor}`}>
        {value > 0 ? "+" : ""}
        {value.toFixed(1)}
      </div>

      {/* STATE */}
      <div className={`mt-2 text-lg font-bold ${stateColor}`}>
        {stateIcon} {score.state ?? "NEUTRAL"}
      </div>

      {/* ACTION */}
      <div className="mt-3">
        <span className="text-gray-400 text-sm">
          Action:{" "}
        </span>

        <span className={`font-bold ${actionColor}`}>
          {score.action ?? "NO TRADE"}
        </span>
      </div>

      {/* SCORE RANGE */}
      <div className="mt-4 text-xs text-gray-500">
        Range: -100 to +100
      </div>

      {/* FACTORS */}
      <div className="mt-5 space-y-2">

        <FactorRow
          label="EMA Structure"
          value={factors.emaStructure}
        />

        <FactorRow
          label="MACD 5M"
          value={factors.macd}
        />

        <FactorRow
          label="ADX 5M"
          value={factors.adx}
        />

        <FactorRow
          label="RSI 5M"
          value={factors.rsi}
        />

        <FactorRow
          label="OI 10M"
          value={factors.oi}
        />

        <FactorRow
          label="PCR"
          value={factors.pcr}
        />

        <FactorRow
          label="Volume 5M"
          value={factors.volume}
        />

      </div>

      {/* TIMEFRAME */}
      <div className="mt-5 pt-4 border-t border-slate-700 text-xs text-gray-500">
        EMA: Live / Closed Candle • MACD: 5M • ADX: 5M • RSI: 5M
      </div>

    </div>
  );
}


/* =====================================================
   FACTOR ROW
===================================================== */

function FactorRow({ label, value }) {
  const numericValue = Number(value ?? 0);

  const color =
    numericValue > 0
      ? "text-green-400"
      : numericValue < 0
      ? "text-red-400"
      : "text-gray-400";

  return (
    <div className="flex items-center justify-between text-sm">

      <span className="text-gray-400">
        {label}
      </span>

      <span className={`font-semibold ${color}`}>
        {numericValue > 0 ? "+" : ""}
        {numericValue.toFixed(1)}
      </span>

    </div>
  );
}