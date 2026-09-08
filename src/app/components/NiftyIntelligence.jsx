"use client";

export default function NiftyIntelligence({ intelligence }) {
  if (!intelligence) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 text-white">
        <h2 className="text-lg font-bold">🧠 NIFTY Intelligence</h2>
        <p className="text-slate-400 mt-3">
          Intelligence data loading...
        </p>
      </div>
    );
  }

  const {
    score,
    bias,
    confidence,
    trendStrength,
    action,
    risk,
    reasons,
    support,
    resistance,
    supportStrength,
    resistanceStrength,
    breakout,
    breakdown,
    breakoutWatch,
    breakdownWatch,
    breakoutReference,
    breakdownReference,
    volumeRatio,
    volumeConfirmed,
    rangePosition,
    levelBias,
  } = intelligence;

  const biasClass =
    bias === "BULLISH"
      ? "text-green-400"
      : bias === "BEARISH"
      ? "text-red-400"
      : "text-yellow-400";

  const actionClass =
    action?.includes("BUY")
      ? "text-green-400"
      : action?.includes("SELL")
      ? "text-red-400"
      : "text-yellow-400";

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 text-white">

      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold">
          🧠 NIFTY Intelligence
        </h2>

        <span className={`font-bold ${biasClass}`}>
          {bias}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">

        <div className="bg-slate-800 rounded-lg p-3">
          <p className="text-xs text-slate-400">
            Intelligence Score
          </p>
          <p className="text-2xl font-bold mt-1">
            {score}/100
          </p>
        </div>

        <div className="bg-slate-800 rounded-lg p-3">
          <p className="text-xs text-slate-400">
            Confidence
          </p>
          <p className="text-2xl font-bold mt-1">
            {confidence}%
          </p>
        </div>

        <div className="bg-slate-800 rounded-lg p-3">
          <p className="text-xs text-slate-400">
            Trend Strength
          </p>
          <p className="font-bold mt-2">
            {trendStrength}
          </p>
        </div>

        <div className="bg-slate-800 rounded-lg p-3">
          <p className="text-xs text-slate-400">
            Risk
          </p>
          <p className="font-bold mt-2">
            {risk}
          </p>
        </div>

      </div>

      <div className="bg-slate-800 rounded-lg p-4 mb-5">
        <p className="text-xs text-slate-400">
          Suggested Action
        </p>

        <p className={`text-xl font-bold mt-1 ${actionClass}`}>
          {action}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">

        <div className="bg-slate-800 rounded-lg p-3">
          <p className="text-xs text-slate-400">
            Support
          </p>

          <p className="text-lg font-bold text-green-400">
            {support}
          </p>

          <p className="text-xs text-slate-400">
            Strength: {supportStrength}
          </p>
        </div>

        <div className="bg-slate-800 rounded-lg p-3">
          <p className="text-xs text-slate-400">
            Resistance
          </p>

          <p className="text-lg font-bold text-red-400">
            {resistance}
          </p>

          <p className="text-xs text-slate-400">
            Strength: {resistanceStrength}
          </p>
        </div>

      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">

        <div className="bg-slate-800 rounded-lg p-3">
          <p className="text-xs text-slate-400">
            Breakout
          </p>

          <p className="font-bold mt-1">
            {breakout
              ? "🚀 CONFIRMED"
              : breakoutWatch
              ? "⚠️ WATCH"
              : "❌ NO"}
          </p>

          <p className="text-xs text-slate-400 mt-2">
            Reference: {breakoutReference}
          </p>
        </div>

        <div className="bg-slate-800 rounded-lg p-3">
          <p className="text-xs text-slate-400">
            Breakdown
          </p>

          <p className="font-bold mt-1">
            {breakdown
              ? "🔻 CONFIRMED"
              : breakdownWatch
              ? "⚠️ WATCH"
              : "❌ NO"}
          </p>

          <p className="text-xs text-slate-400 mt-2">
            Reference: {breakdownReference}
          </p>
        </div>

      </div>

      <div className="bg-slate-800 rounded-lg p-3 mb-5">
        <div className="flex justify-between">
          <span className="text-slate-400">
            Volume Confirmation
          </span>

          <span
            className={
              volumeConfirmed
                ? "text-green-400 font-bold"
                : "text-red-400 font-bold"
            }
          >
            {volumeConfirmed ? "CONFIRMED" : "WEAK"}
          </span>
        </div>

        <p className="text-xs text-slate-400 mt-1">
          Volume Ratio: {volumeRatio}
        </p>
      </div>

      <div className="flex justify-between bg-slate-800 rounded-lg p-3 mb-5">
        <span className="text-slate-400">
          Level Bias
        </span>

        <span className="font-bold">
          {levelBias}
        </span>
      </div>

      <div>
        <p className="text-sm font-bold mb-2">
          Intelligence Reasons
        </p>

        <div className="space-y-1">
          {reasons?.map((reason, index) => (
            <div
              key={index}
              className="text-sm text-slate-300"
            >
              • {reason}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}