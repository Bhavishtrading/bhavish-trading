export default function DashboardCard({ title, value, color = "text-white" }) {
  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-lg hover:bg-slate-700 transition">
      <h2 className="text-gray-400 text-sm">{title}</h2>

      <p className={`text-3xl font-bold mt-3 ${color}`}>
        {value}
      </p>
    </div>
  );
}