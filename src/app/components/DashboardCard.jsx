export default function DashboardCard({
  title,
  value,
  change = null,
  percent = null,
  color = "text-white",
}) {

  const isPositive =
    change !== null &&
    Number(change) >= 0;

  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700 hover:border-green-500 transition-all duration-300">

      <h2 className="text-gray-400 text-sm uppercase tracking-wide">
        {title}
      </h2>

      <p className={`text-4xl font-bold mt-4 ${color}`}>
        {value}
      </p>

      {change !== null && (
        <div
          className={`mt-4 flex items-center gap-2 text-sm font-semibold ${
            isPositive
              ? "text-green-400"
              : "text-red-400"
          }`}
        >
          <span>
            {isPositive ? "▲" : "▼"}
          </span>

          <span>{change}</span>

          {percent !== null && (
            <span>({percent}%)</span>
          )}
        </div>
      )}

    </div>
  );
}