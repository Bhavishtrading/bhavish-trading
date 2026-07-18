export default function MACDCard({ macd }) {
  const bullish = macd.trend === "Bullish";

  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700 hover:border-purple-500 transition-all duration-300">

      <h2 className="text-gray-400 text-sm uppercase tracking-wide">
        MACD
      </h2>

      <div className="mt-4 space-y-2">

        <div className="flex justify-between">
          <span className="text-gray-400">MACD</span>
          <span className="text-white font-bold">
            {macd.macd}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Signal</span>
          <span className="text-white font-bold">
            {macd.signal}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Histogram</span>
          <span className="text-white font-bold">
            {macd.histogram}
          </span>
        </div>

      </div>

      <div
        className={`mt-5 text-lg font-bold ${
          bullish
            ? "text-green-400"
            : "text-red-400"
        }`}
      >
        {bullish ? "🟢 Bullish" : "🔴 Bearish"}
      </div>

    </div>
  );
}