export default function RSICard({ rsi }) {
  let status = "Neutral";
  let color = "text-yellow-400";

  if (rsi >= 60) {
    status = "Bullish";
    color = "text-green-400";
  } else if (rsi <= 40) {
    status = "Bearish";
    color = "text-red-400";
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700 hover:border-blue-500 transition-all duration-300">
      <h2 className="text-gray-400 text-sm uppercase tracking-wide">
        RSI (14)
      </h2>

      <p className="text-4xl font-bold mt-4 text-white">
        {rsi.toFixed(2)}
      </p>

      <p className={`mt-3 text-lg font-semibold ${color}`}>
        {status}
      </p>

      <div className="mt-4 w-full bg-slate-700 rounded-full h-2">
        <div
          className="bg-green-500 h-2 rounded-full"
          style={{
            width: `${Math.min(Math.max(rsi, 0), 100)}%`,
          }}
        />
      </div>
    </div>
  );
}