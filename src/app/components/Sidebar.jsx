export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-slate-900 border-r border-slate-700 p-6">
      <h2 className="text-2xl font-bold text-blue-400 mb-8">
        Bhavish Trading
      </h2>

      <nav className="space-y-4">

        <div className="hover:bg-slate-800 p-3 rounded-lg cursor-pointer">
          📊 Dashboard
        </div>

        <div className="hover:bg-slate-800 p-3 rounded-lg cursor-pointer">
          📈 Live NIFTY
        </div>

        <div className="hover:bg-slate-800 p-3 rounded-lg cursor-pointer">
          📉 OI Analysis
        </div>

        <div className="hover:bg-slate-800 p-3 rounded-lg cursor-pointer">
          📋 PCR Analysis
        </div>

        <div className="hover:bg-slate-800 p-3 rounded-lg cursor-pointer">
          🔥 Market Momentum
        </div>

        <div className="hover:bg-slate-800 p-3 rounded-lg cursor-pointer">
          🤖 AI Signals
        </div>

      </nav>
    </aside>
  );
}