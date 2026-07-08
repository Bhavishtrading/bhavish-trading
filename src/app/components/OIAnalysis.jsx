export default function OIAnalysis({ data }) {
  return (
    <div className="bg-slate-800 rounded-xl p-6 mt-8">

      <h2 className="text-2xl font-bold mb-6">
        OI Analysis
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

        <div className="bg-slate-700 rounded-lg p-5">
          <p className="text-gray-400">
            Long Build-up
          </p>

          <h2 className="text-3xl text-green-400 font-bold mt-3">
            {data.oi.longBuildUp}%
          </h2>
        </div>

        <div className="bg-slate-700 rounded-lg p-5">
          <p className="text-gray-400">
            Short Build-up
          </p>

          <h2 className="text-3xl text-red-400 font-bold mt-3">
            {data.oi.shortBuildUp}%
          </h2>
        </div>

        <div className="bg-slate-700 rounded-lg p-5">
          <p className="text-gray-400">
            Short Covering
          </p>

          <h2 className="text-3xl text-green-400 font-bold mt-3">
            {data.oi.shortCovering}%
          </h2>
        </div>

        <div className="bg-slate-700 rounded-lg p-5">
          <p className="text-gray-400">
            Long Unwinding
          </p>

          <h2 className="text-3xl text-red-400 font-bold mt-3">
            {data.oi.longUnwinding}%
          </h2>
        </div>

      </div>

    </div>
  );
}