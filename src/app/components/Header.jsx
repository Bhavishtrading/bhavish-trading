import { getMarketSession } from "../../services/liveMarket";

export default function Header() {

  const market = getMarketSession();

  return (
    <header className="flex items-center justify-between mb-8">

      <div>
        <h1 className="text-4xl font-bold text-blue-400">
          Bhavish Trading
        </h1>

        <p className="text-gray-400 mt-2">
          NIFTY Intelligence Dashboard
        </p>
      </div>

      <div className="text-right">

        <span
          className={`px-4 py-2 rounded-lg font-semibold text-white ${
            market.isOpen ? "bg-green-600" : "bg-red-600"
          }`}
        >
          ● {market.text}
        </span>

        <p className="text-gray-400 mt-3">
          {market.date}
        </p>

        <p className="text-white font-semibold">
          {market.time}
        </p>

      </div>

    </header>
  );
}