
export default function BhavishScoreCard({ score }) {
  if (!score) {
    return (
      <div className="rounded-xl border border-slate-700/70 bg-[#111C2B] p-5 shadow-lg">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          BHAVISH SCORE
        </h2>
        <p className="mt-5 text-sm text-slate-400">Score unavailable</p>
      </div>
    );
  }

  const value = Number(score.score ?? 0);
  const factors = score.factors || {};
  const timeframe = score.timeframe || {};

  const isBullish = value >= 80;
  const isBearish = value <= -80;

  const scoreColor = isBullish
    ? "text-emerald-400"
    : isBearish
    ? "text-rose-400"
    : "text-amber-400";

  const actionColor =
    score.action === "CE SIDE"
      ? "text-emerald-400"
      : score.action === "PE SIDE"
      ? "text-rose-400"
      : "text-amber-400";

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-700/70 bg-[#111C2B] p-5 shadow-lg transition-all duration-300 hover:border-cyan-500/50 hover:bg-[#152235]">
      <div className="absolute left-0 top-0 h-full w-1 bg-cyan-500/0 transition-all group-hover:bg-cyan-400" />

      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          BHAVISH SCORE
        </h2>
        <span className="h-2 w-2 rounded-full bg-cyan-400/70" />
      </div>

      <div className="mt-5 flex items-end justify-between">
        <div>
          <p className={`text-4xl font-bold tabular-nums ${scoreColor}`}>
            {value}
          </p>
          <p className={`mt-2 text-xs font-bold tracking-wider ${scoreColor}`}>
            {score.state || "NEUTRAL"}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">
            Trading Action
          </p>
          <p className={`mt-2 text-sm font-bold ${actionColor}`}>
            {score.action || "NO TRADE"}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-slate-700/70 pt-4">
        <div className="mb-4 flex justify-between text-xs text-slate-400">
          <span>Score Range</span>
          <span className="font-semibold text-slate-300">
            {score.minScore ?? -100} to +{score.maxScore ?? 100}
          </span>
        </div>

        <div className="space-y-3">
          <FactorRow
            label="EMA Structure"
            value={factors.emaStructure}
            timeframe={timeframe.structure}
          />
          <FactorRow label="MACD" value={factors.macd} timeframe={timeframe.macd} />
          <FactorRow label="ADX" value={factors.adx} timeframe={timeframe.adx} />
          <FactorRow label="RSI" value={factors.rsi} timeframe={timeframe.rsi} />
          <FactorRow label="OI" value={factors.oi} timeframe={timeframe.oi} />
          <FactorRow label="PCR" value={factors.pcr} timeframe={timeframe.pcr} />
          <FactorRow label="Volume" value={factors.volume} timeframe={timeframe.volume} />
        </div>
      </div>

      <div className="mt-5 border-t border-slate-700/70 pt-3">
        <p className="text-xs text-slate-500">
          Scoring: -100 to +100
        </p>
      </div>
    </div>
  );
}

function FactorRow({ label, value, timeframe }) {
  const num = Number(value ?? 0);

  const color =
    num > 0
      ? "text-emerald-400"
      : num < 0
      ? "text-rose-400"
      : "text-slate-400";

  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <span className="text-xs text-slate-300">{label}</span>
        {timeframe && (
          <span className="ml-2 text-[10px] text-slate-500">
            {timeframe}
          </span>
        )}
      </div>

      <span className={`text-xs font-semibold tabular-nums ${color}`}>
        {num > 0 ? "+" : ""}
        {num}
      </span>
    </div>
  );
}
