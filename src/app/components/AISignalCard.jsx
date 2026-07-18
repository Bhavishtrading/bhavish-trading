export default function AISignalCard({ ai }) {
  const signalColor =
    ai.signal === "BUY CE"
      ? "text-green-400"
      : ai.signal === "BUY PE"
      ? "text-red-400"
      : "text-yellow-400";

  const riskColor =
    ai.risk === "Low"
      ? "text-green-400"
      : ai.risk === "Medium"
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-cyan-500">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-gray-300 text-sm uppercase tracking-wider">
          🤖 AI SIGNAL
        </h2>

        <span className="text-green-400 text-xs font-bold">
          ● LIVE
        </span>
      </div>

      {/* Signal */}
      <div className={`text-5xl font-bold mt-6 ${signalColor}`}>
        {ai.signal}
      </div>

      {/* Confidence */}
      <div className="mt-6">

        <div className="flex justify-between text-sm mb-2">
          <span>Confidence</span>

          <span className="text-green-400 font-bold">
            {ai.confidence}%
          </span>
        </div>

        <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500"
            style={{
              width: `${ai.confidence}%`,
            }}
          />
        </div>

      </div>

      {/* Score & Risk */}
      <div className="grid grid-cols-2 gap-4 mt-6">

        <div>
          <p className="text-gray-400 text-sm">
            Score
          </p>

          <p className="text-cyan-400 font-bold text-xl">
            {ai.score}/100
          </p>
        </div>

        <div>
          <p className="text-gray-400 text-sm">
            Risk
          </p>

          <p className={`font-bold text-xl ${riskColor}`}>
            {ai.risk}
          </p>
        </div>

      </div>

      {/* Entry SL Target */}
      <div className="grid grid-cols-3 gap-3 mt-6">

        <div className="bg-slate-700 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-400">
            ENTRY
          </p>

          <p className="text-green-400 font-bold">
            {ai.entry}
          </p>
        </div>

        <div className="bg-slate-700 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-400">
            SL
          </p>

          <p className="text-red-400 font-bold">
            {ai.stopLoss}
          </p>
        </div>

        <div className="bg-slate-700 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-400">
            TARGET
          </p>

          <p className="text-cyan-400 font-bold">
            {ai.target}
          </p>
        </div>

      </div>

      {/* AI Reasons */}
      <div className="mt-6 border-t border-slate-700 pt-4">

        <p className="text-gray-400 text-sm mb-3">
          AI Reasons
        </p>

        <div className="space-y-2">

          {ai.reasons.map((reason, index) => (
            <div
              key={index}
              className="text-sm text-gray-200"
            >
              ✅ {reason}
            </div>
          ))}

        </div>

      </div>

      {/* Button */}
      <button
        className="mt-8 w-full bg-green-600 hover:bg-green-700 transition rounded-lg py-3 font-bold"
      >
        TAKE TRADE
      </button>

    </div>
  );
}