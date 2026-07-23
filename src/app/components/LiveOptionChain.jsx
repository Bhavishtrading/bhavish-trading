function formatNumber(value) {
  if (value === null || value === undefined) return "-";

  const num = Number(value);

  if (num >= 10000000) {
    return (num / 10000000).toFixed(2) + " Cr";
  }

  if (num >= 100000) {
    return (num / 100000).toFixed(2) + " L";
  }

  if (num >= 1000) {
    return (num / 1000).toFixed(1) + " K";
  }

  return num.toString();
}

export default function LiveOptionChain({ optionChain }) {
  const chain = optionChain?.chain ?? [];
  const atm = optionChain?.atm;
  const expiry = optionChain?.expiry;

  return (
    <div className="bg-slate-800 rounded-xl p-6 mt-8 border border-slate-700 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">📈 Live Option Chain</h2>

          <p className="text-gray-400 text-sm mt-1">
            Expiry : {expiry || "-"}
          </p>
        </div>

        <div className="text-right">
          <p className="text-gray-400 text-sm">ATM Strike</p>

          <h2 className="text-2xl font-bold text-green-400">
            {atm}
          </h2>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg">
        <table className="min-w-full">
          <thead>
            <tr className="bg-slate-900 text-sm uppercase">
              <th className="p-4 text-green-400">CE LTP</th>
              <th className="p-4 text-green-400">CE OI</th>
              <th className="p-4 text-green-400">ΔOI</th>
              <th className="p-4 text-green-400">Volume</th>

              <th className="p-4 text-yellow-400">Strike</th>

              <th className="p-4 text-red-400">Volume</th>
              <th className="p-4 text-red-400">ΔOI</th>
              <th className="p-4 text-red-400">PE OI</th>
              <th className="p-4 text-red-400">PE LTP</th>
            </tr>
          </thead>

          <tbody>
            {chain.map((row) => {
              const isATM = Number(row.strike) === Number(atm);

              return (
                <tr
                  key={row.strike}
                  className={`transition-all duration-150 border-b border-slate-700 ${
                    isATM
                      ? "bg-yellow-500/20"
                      : "hover:bg-slate-700/60"
                  }`}
                >
                  <td className="p-4 font-semibold text-green-300">
                    {row.ce?.ltp ?? "-"}
                  </td>

                  <td className="p-4">
                    {formatNumber(row.ce?.oi)}
                  </td>

                  <td
                    className={`p-4 font-semibold ${
                      (row.ce?.oiChange ?? 0) >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {formatNumber(row.ce?.oiChange)}
                  </td>

                  <td className="p-4 text-cyan-300">
                    {formatNumber(row.ce?.volume)}
                  </td>

                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full font-bold ${
                        isATM
                          ? "bg-yellow-500 text-black"
                          : "text-yellow-300"
                      }`}
                    >
                      {row.strike}
                    </span>
                  </td>

                  <td className="p-4 text-cyan-300">
                    {formatNumber(row.pe?.volume)}
                  </td>

                  <td
                    className={`p-4 font-semibold ${
                      (row.pe?.oiChange ?? 0) >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {formatNumber(row.pe?.oiChange)}
                  </td>

                  <td className="p-4">
                    {formatNumber(row.pe?.oi)}
                  </td>

                  <td className="p-4 font-semibold text-red-300">
                    {row.pe?.ltp ?? "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}