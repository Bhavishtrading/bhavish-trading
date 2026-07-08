export default function MarketMomentum({ data }) {
  return (
    <div className="bg-slate-800 rounded-xl p-6 mt-8">

      <h2 className="text-2xl font-bold mb-6">
        🔥 Market Momentum
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Buying Pressure */}
        <div className="bg-slate-700 rounded-lg p-5">
          <p className="text-gray-400">Buying Pressure</p>

          <div className="w-full bg-slate-600 rounded-full h-3 mt-3">
            <div
              className="bg-green-500 h-3 rounded-full"
              style={{ width: `${data.momentum.buying}%` }}
            ></div>
          </div>

          <h2 className="text-3xl font-bold text-green-400 mt-4">
            {data.momentum.buying}%
          </h2>
        </div>

        {/* Selling Pressure */}
        <div className="bg-slate-700 rounded-lg p-5">
          <p className="text-gray-400">Selling Pressure</p>

          <div className="w-full bg-slate-600 rounded-full h-3 mt-3">
            <div
              className="bg-red-500 h-3 rounded-full"
              style={{ width: `${data.momentum.selling}%` }}
            ></div>
          </div>

          <h2 className="text-3xl font-bold text-red-400 mt-4">
            {data.momentum.selling}%
          </h2>
        </div>

        {/* Market Momentum */}
        <div className="bg-slate-700 rounded-lg p-5">
          <p className="text-gray-400">Momentum</p>

          <h2 className="text-3xl font-bold text-green-400 mt-3">
            {data.momentum.trend}
          </h2>

          <p className="text-gray-300 mt-2">
            {data.momentum.status}
          </p>
        </div>

      </div>

    </div>
  );
}