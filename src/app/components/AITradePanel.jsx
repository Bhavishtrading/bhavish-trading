export default function AITradePanel({ ai }) {
  if (!ai) return null;

  const signalColor =
    ai.signal?.includes("BUY")
      ? "text-green-400"
      : ai.signal?.includes("SELL")
      ? "text-red-400"
      : "text-yellow-400";

  return (
    <div className="bg-slate-800 rounded-xl p-6 mt-8 shadow-lg border border-slate-700">

      <h2 className="text-2xl font-bold mb-6">
        🤖 AI Trade Setup
      </h2>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

        <div className="bg-slate-900 rounded-lg p-5">
          <p className="text-gray-400">Signal</p>
          <h2 className={`text-3xl font-bold mt-2 ${signalColor}`}>
            {ai.signal}
          </h2>
        </div>

        <div className="bg-slate-900 rounded-lg p-5">
          <p className="text-gray-400">Confidence</p>
          <h2 className="text-3xl text-green-400 font-bold mt-2">
            {ai.confidence}%
          </h2>
        </div>

        <div className="bg-slate-900 rounded-lg p-5">
          <p className="text-gray-400">Risk</p>
          <h2 className="text-3xl text-yellow-400 font-bold mt-2">
            {ai.risk}
          </h2>
        </div>

        <div className="bg-slate-900 rounded-lg p-5">
          <p className="text-gray-400">AI Score</p>
          <h2 className="text-3xl text-cyan-400 font-bold mt-2">
            {ai.score}
          </h2>
        </div>

      </div>

      {/* Trade Levels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">

        <div className="bg-green-900/20 border border-green-700 rounded-lg p-5">
          <p className="text-gray-400">Entry</p>
          <h2 className="text-2xl text-green-400 font-bold mt-2">
            {ai.entry}
          </h2>
        </div>

        <div className="bg-red-900/20 border border-red-700 rounded-lg p-5">
          <p className="text-gray-400">Stop Loss</p>
          <h2 className="text-2xl text-red-400 font-bold mt-2">
            {ai.stopLoss}
          </h2>
        </div>

        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-5">
          <p className="text-gray-400">Target 1</p>
          <h2 className="text-2xl text-blue-400 font-bold mt-2">
            {ai.target1}
          </h2>
        </div>

        <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-5">
          <p className="text-gray-400">Target 2</p>
          <h2 className="text-2xl text-purple-400 font-bold mt-2">
            {ai.target2}
          </h2>
        </div>

      </div>

      {/* Reasons */}
      <div className="bg-slate-900 rounded-lg p-5 mt-6">

        <h3 className="font-bold text-lg mb-4">
          AI Reasons
        </h3>

        <ul className="space-y-2 text-gray-300">
          {ai.reasons?.map((reason, index) => (
            <li key={index}>
              ✅ {reason}
            </li>
          ))}
        </ul>

      </div>

    </div>
  );
}