"use client";

import { useEffect, useMemo, useState } from "react";


// ======================================================
// NIFTY 50 LIVE STOCKS
// ======================================================

export default function Nifty50LiveStocks() {

  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [lastUpdated, setLastUpdated] = useState(null);


  // ====================================================
  // FETCH LIVE STOCK DATA
  // ====================================================

  async function fetchStocks() {

    try {

      const response =
        await fetch(
          "/api/nifty50-stocks",
          {
            cache: "no-store",
          }
        );

      const result =
        await response.json();


      if (!response.ok || !result.success) {

        throw new Error(
          result.message ||
          "Unable to fetch NIFTY 50 stocks"
        );
      }


      const liveStocks =
        Array.isArray(result.stocks)
          ? result.stocks
          : [];


      setStocks(liveStocks);

      setLastUpdated(
        new Date()
      );

      setError("");

    } catch (err) {

      console.error(
        "NIFTY 50 STOCK TABLE ERROR:",
        err
      );

      setError(
        err.message ||
        "Unable to load stock data"
      );

    } finally {

      setLoading(false);
    }
  }


  // ====================================================
  // INITIAL LOAD + 10 SECOND REFRESH
  // ====================================================

  useEffect(() => {

    fetchStocks();

    const interval =
      setInterval(
        fetchStocks,
        10000
      );

    return () =>
      clearInterval(interval);

  }, []);


  // ====================================================
  // ADVANCES / DECLINES
  // ====================================================

  const advances =
    stocks.filter(
      (stock) =>
        Number(stock.changePercent) > 0
    ).length;


  const declines =
    stocks.filter(
      (stock) =>
        Number(stock.changePercent) < 0
    ).length;


  const unchanged =
    stocks.filter(
      (stock) =>
        Number(stock.changePercent) === 0
    ).length;


  // ====================================================
  // FILTER + SEARCH
  // ====================================================

  const filteredStocks =
    useMemo(() => {

      let result =
        [...stocks];


      // -----------------------------------------------
      // GAINERS / LOSERS
      // -----------------------------------------------

      if (filter === "GAINERS") {

        result =
          result.filter(
            (stock) =>
              Number(
                stock.changePercent
              ) > 0
          );

        result.sort(
          (a, b) =>
            Number(
              b.changePercent
            ) -
            Number(
              a.changePercent
            )
        );

      }

      else if (filter === "LOSERS") {

        result =
          result.filter(
            (stock) =>
              Number(
                stock.changePercent
              ) < 0
          );

        result.sort(
          (a, b) =>
            Number(
              a.changePercent
            ) -
            Number(
              b.changePercent
            )
        );
      }

      else {

        result.sort(
          (a, b) =>
            Number(
              b.weight || 0
            ) -
            Number(
              a.weight || 0
            )
        );
      }


      // -----------------------------------------------
      // SEARCH
      // -----------------------------------------------

      const query =
        search
          .trim()
          .toLowerCase();


      if (query) {

        result =
          result.filter(
            (stock) =>

              String(
                stock.symbol || ""
              )
                .toLowerCase()
                .includes(query)

              ||

              String(
                stock.name || ""
              )
                .toLowerCase()
                .includes(query)

              ||

              String(
                stock.sector || ""
              )
                .toLowerCase()
                .includes(query)
          );
      }


      return result;

    }, [
      stocks,
      filter,
      search,
    ]);


  // ====================================================
  // FORMATTERS
  // ====================================================

  function formatNumber(
    value,
    decimals = 2
  ) {

    const number =
      Number(value);


    if (!Number.isFinite(number)) {
      return "-";
    }


    return number.toLocaleString(
      "en-IN",
      {
        minimumFractionDigits:
          decimals,

        maximumFractionDigits:
          decimals,
      }
    );
  }


  function formatPercent(
    value
  ) {

    const number =
      Number(value);


    if (!Number.isFinite(number)) {
      return "-";
    }


    const sign =
      number > 0
        ? "+"
        : "";


    return `${sign}${number.toFixed(2)}%`;
  }


  function getChangeClass(
    value
  ) {

    const number =
      Number(value);


    if (number > 0) {
      return "text-green-400";
    }

    if (number < 0) {
      return "text-red-400";
    }

    return "text-slate-300";
  }


  function getTrend(
    stock
  ) {

    const change =
      Number(
        stock.changePercent
      );


    if (change > 1) {
      return "Bullish";
    }

    if (change > 0) {
      return "Positive";
    }

    if (change < -1) {
      return "Bearish";
    }

    if (change < 0) {
      return "Negative";
    }

    return "Neutral";
  }


  function getTrendClass(
    stock
  ) {

    const trend =
      getTrend(stock);


    if (
      trend === "Bullish" ||
      trend === "Positive"
    ) {

      return "text-green-400";
    }


    if (
      trend === "Bearish" ||
      trend === "Negative"
    ) {

      return "text-red-400";
    }


    return "text-slate-400";
  }


  // ====================================================
  // LOADING
  // ====================================================

  if (
    loading &&
    stocks.length === 0
  ) {

    return (

      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">

        <div className="flex items-center justify-between">

          <div>

            <h2 className="text-xl font-bold text-white">
              NIFTY 50 LIVE STOCKS
            </h2>

            <p className="text-slate-400 text-sm mt-1">
              Loading live market data...
            </p>

          </div>

          <div className="text-cyan-400 text-sm">
            Loading...
          </div>

        </div>

      </div>
    );
  }


  // ====================================================
  // ERROR
  // ====================================================

  if (
    error &&
    stocks.length === 0
  ) {

    return (

      <div className="bg-slate-900 border border-red-500/40 rounded-xl p-6">

        <h2 className="text-xl font-bold text-white">
          NIFTY 50 LIVE STOCKS
        </h2>

        <p className="text-red-400 text-sm mt-3">
          {error}
        </p>

        <button
          onClick={fetchStocks}
          className="mt-4 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold"
        >
          Retry
        </button>

      </div>
    );
  }


  // ====================================================
  // MAIN UI
  // ====================================================

  return (

    <div className="w-full bg-slate-900 border border-slate-700 rounded-xl shadow-lg overflow-hidden">


      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="p-5 border-b border-slate-700">

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">


          {/* TITLE */}

          <div>

            <div className="flex items-center gap-3">

              <h2 className="text-xl font-bold text-white">
                NIFTY 50 LIVE STOCKS
              </h2>

              <span className="flex items-center gap-1.5 text-xs text-green-400">

                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />

                LIVE

              </span>

            </div>

            <p className="text-slate-400 text-xs mt-1">
              Real-time NIFTY 50 stock performance
            </p>

          </div>


          {/* MARKET BREADTH */}

          <div className="flex items-center gap-4 text-sm">

            <div>
              <span className="text-slate-500">
                Advances
              </span>

              <span className="ml-2 text-green-400 font-bold">
                {advances}
              </span>
            </div>


            <div>
              <span className="text-slate-500">
                Declines
              </span>

              <span className="ml-2 text-red-400 font-bold">
                {declines}
              </span>
            </div>


            <div>
              <span className="text-slate-500">
                Unchanged
              </span>

              <span className="ml-2 text-slate-300 font-bold">
                {unchanged}
              </span>
            </div>

          </div>

        </div>


        {/* ==================================================
            CONTROLS
        ================================================== */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-5">


          {/* FILTERS */}

          <div className="flex items-center gap-2 flex-wrap">

            <button
              onClick={() =>
                setFilter("ALL")
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === "ALL"
                  ? "bg-cyan-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              All ({stocks.length})
            </button>


            <button
              onClick={() =>
                setFilter("GAINERS")
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === "GAINERS"
                  ? "bg-green-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Top Gainers
            </button>


            <button
              onClick={() =>
                setFilter("LOSERS")
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === "LOSERS"
                  ? "bg-red-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Top Losers
            </button>

          </div>


          {/* SEARCH */}

          <div className="w-full md:w-64">

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search stock..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-500"
            />

          </div>

        </div>


        {/* ==================================================
            LAST UPDATED
        ================================================== */}

        <div className="flex justify-end mt-3">

          <span className="text-slate-500 text-xs">

            {lastUpdated
              ? `Last Updated ${lastUpdated.toLocaleTimeString()}`
              : "Updating..."}

          </span>

        </div>

      </div>


      {/* ==================================================
          TABLE
      ================================================== */}

      <div className="w-full overflow-x-auto">

        <table className="w-full min-w-[1250px] text-sm">


          {/* ==================================================
              TABLE HEADER
          ================================================== */}

          <thead>

            <tr className="bg-slate-950 border-b border-slate-700">

              <th className="px-3 py-3 text-left text-slate-500 font-semibold text-xs">
                #
              </th>

              <th className="px-3 py-3 text-left text-slate-500 font-semibold text-xs">
                SYMBOL
              </th>

              <th className="px-3 py-3 text-left text-slate-500 font-semibold text-xs">
                NAME
              </th>

              <th className="px-3 py-3 text-left text-slate-500 font-semibold text-xs">
                SECTOR
              </th>

              <th className="px-3 py-3 text-right text-slate-500 font-semibold text-xs">
                WEIGHT
              </th>

              <th className="px-3 py-3 text-right text-slate-500 font-semibold text-xs">
                OPEN
              </th>

              <th className="px-3 py-3 text-right text-slate-500 font-semibold text-xs">
                DAY HIGH
              </th>

              <th className="px-3 py-3 text-right text-slate-500 font-semibold text-xs">
                DAY LOW
              </th>

              <th className="px-3 py-3 text-right text-slate-500 font-semibold text-xs">
                LTP
              </th>

              <th className="px-3 py-3 text-right text-slate-500 font-semibold text-xs">
                CHANGE
              </th>

              <th className="px-3 py-3 text-right text-slate-500 font-semibold text-xs">
                % CHANGE
              </th>

              <th className="px-3 py-3 text-right text-slate-500 font-semibold text-xs">
                CONTRIBUTION
              </th>

              <th className="px-3 py-3 text-center text-slate-500 font-semibold text-xs">
                TREND
              </th>

            </tr>

          </thead>


          {/* ==================================================
              TABLE BODY
          ================================================== */}

          <tbody>

            {filteredStocks.map(
              (stock, index) => {

                const change =
                  Number(
                    stock.change
                  );

                const changePercent =
                  Number(
                    stock.changePercent
                  );

                return (

                  <tr
                    key={
                      stock.symbol ||
                      index
                    }
                    className="border-b border-slate-800 hover:bg-slate-800/70 transition"
                  >

                    {/* # */}

                    <td className="px-3 py-3 text-slate-500">
                      {index + 1}
                    </td>


                    {/* SYMBOL */}

                    <td className="px-3 py-3">

                      <span className="font-bold text-cyan-400">
                        {stock.symbol || "-"}
                      </span>

                    </td>


                    {/* NAME */}

                    <td className="px-3 py-3">

                      <div className="text-slate-200 font-medium whitespace-nowrap">
                        {stock.name || "-"}
                      </div>

                    </td>


                    {/* SECTOR */}

                    <td className="px-3 py-3">

                      <span className="text-slate-400 text-xs whitespace-nowrap">
                        {stock.sector || "-"}
                      </span>

                    </td>


                    {/* WEIGHT */}

                    <td className="px-3 py-3 text-right">

                      <span className="text-cyan-300 font-semibold">
                        {formatNumber(
                          stock.weight,
                          2
                        )}
                        %
                      </span>

                    </td>


                    {/* OPEN */}

                    <td className="px-3 py-3 text-right text-slate-300">
                      {formatNumber(
                        stock.open,
                        2
                      )}
                    </td>


                    {/* DAY HIGH */}

                    <td className="px-3 py-3 text-right text-green-300">
                      {formatNumber(
                        stock.high,
                        2
                      )}
                    </td>


                    {/* DAY LOW */}

                    <td className="px-3 py-3 text-right text-red-300">
                      {formatNumber(
                        stock.low,
                        2
                      )}
                    </td>


                    {/* LTP */}

                    <td className="px-3 py-3 text-right">

                      <span className="text-white font-bold">
                        {formatNumber(
                          stock.ltp,
                          2
                        )}
                      </span>

                    </td>


                    {/* CHANGE */}

                    <td
                      className={`px-3 py-3 text-right font-semibold ${getChangeClass(
                        change
                      )}`}
                    >

                      {change > 0
                        ? "+"
                        : ""}

                      {formatNumber(
                        change,
                        2
                      )}

                    </td>


                    {/* % CHANGE */}

                    <td
                      className={`px-3 py-3 text-right font-semibold ${getChangeClass(
                        changePercent
                      )}`}
                    >

                      {formatPercent(
                        changePercent
                      )}

                    </td>


                    {/* CONTRIBUTION */}

                    <td
                      className={`px-3 py-3 text-right font-semibold ${getChangeClass(
                        stock.weightedContribution
                      )}`}
                    >

                      {Number(
                        stock.weightedContribution
                      ) > 0
                        ? "+"
                        : ""}

                      {formatNumber(
                        stock.weightedContribution,
                        4
                      )}

                    </td>


                    {/* TREND */}

                    <td
                      className={`px-3 py-3 text-center font-semibold ${getTrendClass(
                        stock
                      )}`}
                    >

                      {getTrend(
                        stock
                      )}

                    </td>

                  </tr>

                );
              }
            )}


            {/* NO DATA */}

            {filteredStocks.length === 0 && (

              <tr>

                <td
                  colSpan={13}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  No stocks found.
                </td>

              </tr>

            )}

          </tbody>

        </table>

      </div>


      {/* ==================================================
          FOOTER
      ================================================== */}

      <div className="px-5 py-3 border-t border-slate-700 bg-slate-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">

        <span className="text-xs text-slate-500">
          Showing {filteredStocks.length} of {stocks.length} stocks
        </span>

        <span className="text-xs text-slate-600">
          Auto refresh: 10 seconds
        </span>

      </div>

    </div>
  );
}