export default function MarketBiasCard({ bias }) {
  if (!bias) return null;

  const signal = bias.signal || "NEUTRAL";

  const color =
    signal === "BULLISH"
      ? "text-green-400"
      : signal === "BEARISH"
      ? "text-red-400"
      : "text-yellow-400";

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg">
      <h2 className="text-lg font-bold mb-4">
        📊 Market Bias
      </h2>

      <div className={`text-3xl font-bold ${color}`}>
        {signal}
      </div>

      <div className="mt-3">
        Confidence :
        <span className="font-bold ml-2">
          {bias.confidence ?? 0}%
        </span>
      </div>

      <div className="mt-4">
        <h3 className="font-semibold mb-2">
          Reasons
        </h3>

        <ul className="space-y-1 text-sm text-slate-300">
          {(bias.reasons || []).map((reason, index) => (
            <li key={index}>• {reason}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}