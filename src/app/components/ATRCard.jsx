export default function ATRCard({ atr }) {
  const color =
    atr.volatility === "High"
      ? "text-red-400"
      : atr.volatility === "Low"
      ? "text-yellow-400"
      : "text-green-400";

  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700 hover:border-cyan-500 transition-all duration-300">

      <h2 className="text-gray-400 text-sm uppercase tracking-wide">
        ATR
      </h2>

      <p className="text-4xl font-bold mt-4 text-white">
        {atr.atr}
      </p>

      <p className={`mt-4 text-lg font-bold ${color}`}>
        {atr.volatility} Volatility
      </p>

    </div>
  );
}