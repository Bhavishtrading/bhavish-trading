export default function ADXCard({ adx }) {
  const strongTrend = adx.adx >= 25;

  const trendColor =
    adx.trend === "Bullish"
      ? "text-green-400"
      : adx.trend === "Bearish"
      ? "text-red-400"
      : "text-yellow-400";

  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700 hover:border-orange-500 transition-all duration-300">

      <h2 className="text-gray-400 text-sm uppercase tracking-wide">
        ADX
      </h2>

      <div className="mt-4 space-y-3">

        <div className="flex justify-between">
          <span className="text-gray-400">ADX</span>
          <span className="text-white font-bold">
            {adx.adx}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">+DI</span>
          <span className="text-green-400 font-bold">
            {adx.plusDI}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">-DI</span>
          <span className="text-red-400 font-bold">
            {adx.minusDI}
          </span>
        </div>

      </div>

      <div className={`mt-5 text-lg font-bold ${trendColor}`}>
        {adx.trend}
      </div>

      <div
        className={`mt-2 text-sm ${
          strongTrend
            ? "text-green-400"
            : "text-yellow-400"
        }`}
      >
        {strongTrend ? "Strong Trend" : "Weak Trend"}
      </div>

    </div>
  );
}