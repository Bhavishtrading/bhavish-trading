export default function MarketScore({ data }) {
  return (
    <div className="bg-slate-800 rounded-xl p-6 mt-8">

      <h2 className="text-2xl font-bold mb-6">
        AI Market Intelligence
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        <div className="bg-slate-700 rounded-lg p-5">
          <p className="text-gray-400">AI Signal</p>

          <h2 className="text-3xl font-bold text-green-400 mt-3">
            {data.ai.signal}
          </h2>
        </div>

        <div className="bg-slate-700 rounded-lg p-5">
          <p className="text-gray-400">Confidence</p>

          <h2 className="text-3xl font-bold text-blue-400 mt-3">
            {data.ai.confidence}%
          </h2>
        </div>

        <div className="bg-slate-700 rounded-lg p-5">
          <p className="text-gray-400">Risk Level</p>

          <h2 className="text-3xl font-bold text-yellow-400 mt-3">
            {data.ai.risk}
          </h2>
        </div>

      </div>

    </div>
  );
}