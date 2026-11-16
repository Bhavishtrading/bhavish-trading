
export default function DashboardCard({
  title,
  value,
  change = null,
  percent = null,
  color = "text-white",
  secondaryTitle = null,
  secondaryValue = null,
  secondaryColor = "text-white",
}) {
  const isPositive = change !== null && Number(change) >= 0;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-700/70 bg-[#111C2B] p-5 shadow-lg transition-all duration-300 hover:border-cyan-500/50 hover:bg-[#152235]">
      <div className="absolute left-0 top-0 h-full w-1 bg-cyan-500/0 transition-all group-hover:bg-cyan-400" />

      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          {title}
        </h2>

        <span className="h-2 w-2 rounded-full bg-cyan-400/70" />
      </div>

      <p className={`mt-5 text-3xl font-bold tracking-tight ${color}`}>
        {value}
      </p>

      {change !== null && (
        <div
          className={`mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold ${
            isPositive ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          <span>{isPositive ? "▲" : "▼"}</span>
          <span>{change}</span>
          {percent !== null && <span>({percent}%)</span>}
        </div>
      )}

      {secondaryTitle !== null && (
        <div className="mt-5 border-t border-slate-700/70 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {secondaryTitle}
          </p>

          <p className={`mt-2 text-lg font-bold ${secondaryColor}`}>
            {secondaryValue}
          </p>
        </div>
      )}
    </div>
  );
}
