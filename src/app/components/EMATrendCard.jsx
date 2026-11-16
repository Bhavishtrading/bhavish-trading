
export default function EMATrendCard({ ema }) {
  const trendColor =
    ema.trend === "Bullish"
      ? "text-emerald-400"
      : ema.trend === "Bearish"
      ? "text-rose-400"
      : "text-amber-400";

  const trendLabel =
    ema.trend === "Bullish"
      ? "EMA Alignment Bullish"
      : ema.trend === "Bearish"
      ? "EMA Alignment Bearish"
      : "Neutral";

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-700/70 bg-[#111C2B] p-5 shadow-lg transition-all duration-300 hover:border-cyan-500/50 hover:bg-[#152235]">
      <div className="absolute left-0 top-0 h-full w-1 bg-cyan-500/0 transition-all group-hover:bg-cyan-400" />

      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          EMA TREND
        </h2>

        <span className="h-2 w-2 rounded-full bg-cyan-400/70" />
      </div>

      <div className={`mt-5 text-3xl font-bold tracking-tight ${trendColor}`}>
        {ema.trend}
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
          <span className="text-sm text-slate-400">EMA 9</span>
          <span className="font-semibold tabular-nums text-slate-100">
            {Number(ema.ema9).toFixed(2)}
          </span>
        </div>

        <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
          <span className="text-sm text-slate-400">EMA 20</span>
          <span className="font-semibold tabular-nums text-slate-100">
            {Number(ema.ema20).toFixed(2)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">EMA 50</span>
          <span className="font-semibold tabular-nums text-slate-100">
            {Number(ema.ema50).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="mt-5 border-t border-slate-700/70 pt-4">
        <div className={`text-sm font-semibold ${trendColor}`}>
          {trendLabel}
        </div>
      </div>
    </div>
  );
}
