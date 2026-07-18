export default function EMATrendCard({ ema }) {
  const trendColor =
    ema.trend === "Bullish"
      ? "text-green-400"
      : ema.trend === "Bearish"
      ? "text-red-400"
      : "text-yellow-400";

  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700">

      <h2 className="text-gray-400 text-sm uppercase tracking-wide">
        EMA TREND
      </h2>

      <div className={`text-3xl font-bold mt-4 ${trendColor}`}>
        {ema.trend}
      </div>

      <div className="mt-6 space-y-2">

        <div className="flex justify-between">
          <span className="text-gray-400">EMA 9</span>
          <span className="text-white font-bold">{ema.ema9}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">EMA 20</span>
          <span className="text-white font-bold">{ema.ema20}</span>
        </div>

      </div>

    </div>
  );
}