export default function VWAPCard({ vwap, price }) {
  const vwapValue =
    typeof vwap === "object"
      ? Number(vwap?.value)
      : Number(vwap);

 const currentPrice =
  typeof vwap === "object" && vwap?.price != null
    ? Number(vwap.price)
    : Number(price);

  const valid =
    Number.isFinite(vwapValue) &&
    Number.isFinite(currentPrice);

  if (!valid) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700">
        <h2 className="text-gray-400 text-sm uppercase tracking-wide">
          NIFTY FUT VWAP
        </h2>

        <div className="mt-5 text-gray-400">
          VWAP unavailable
        </div>
      </div>
    );
  }

  const distance = currentPrice - vwapValue;

  const distancePercent =
    (distance / vwapValue) * 100;

  const aboveVWAP = distance > 0;
  const belowVWAP = distance < 0;

  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700 hover:border-cyan-500 transition-all duration-300">

      {/* TITLE */}
      <h2 className="text-gray-400 text-sm uppercase tracking-wide">
        NIFTY FUT VWAP
      </h2>

      {/* VWAP VALUE */}
      <div className="mt-4 text-2xl font-bold text-white">
        {vwapValue.toFixed(2)}
      </div>

      {/* CURRENT PRICE */}
      <div className="mt-3 text-sm text-gray-400">
        Price:{" "}
        <span className="text-white font-semibold">
          {currentPrice.toFixed(2)}
        </span>
      </div>

      {/* VWAP STATUS */}
      <div
        className={`mt-4 text-lg font-bold ${
          aboveVWAP
            ? "text-green-400"
            : belowVWAP
            ? "text-red-400"
            : "text-yellow-400"
        }`}
      >
        {aboveVWAP
          ? "🟢 Above VWAP"
          : belowVWAP
          ? "🔴 Below VWAP"
          : "🟡 At VWAP"}
      </div>

      {/* DISTANCE */}
      <div className="mt-3 text-sm text-gray-400">
        Distance:{" "}
        <span
          className={
            aboveVWAP
              ? "text-green-400 font-semibold"
              : belowVWAP
              ? "text-red-400 font-semibold"
              : "text-yellow-400 font-semibold"
          }
        >
          {distance >= 0 ? "+" : ""}
          {distance.toFixed(2)} pts
        </span>
      </div>

      {/* DISTANCE % */}
      <div className="mt-1 text-sm text-gray-500">
        {distancePercent >= 0 ? "+" : ""}
        {distancePercent.toFixed(2)}%
      </div>

      {/* INTERPRETATION */}
      <div className="mt-3 text-sm text-gray-400">
        {aboveVWAP
          ? "Price is trading above NIFTY Futures VWAP"
          : belowVWAP
          ? "Price is trading below NIFTY Futures VWAP"
          : "Price is trading near NIFTY Futures VWAP"}
      </div>
    </div>
  );
}