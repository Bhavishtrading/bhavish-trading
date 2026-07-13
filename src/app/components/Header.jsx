import { getMarketSession } from "../../services/liveMarket";

export default function Header() {
  const market = getMarketSession();

  return (
    <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-6">

      {/* Left Side */}
      <div>
        <h1 className="text-4xl font-bold text-blue-400">
          Bhavish Trading
        </h1>

        <p className="text-gray-400 mt-2 text-lg">
          AI Powered NIFTY Intelligence Dashboard
        </p>
      </div>

      {/* Right Side */}
      <div className="flex flex-col items-end">

        <div
          className={`px-5 py-2 rounded-xl font-bold shadow-lg ${
            market.isOpen
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          ● {market.text}
        </div>

        <div className="mt-4 text-right">
          <p className="text-gray-400">
            {market.date}
          </p>

          <p className="text-2xl font-bold text-white">
            {market.time}
          </p>
        </div>

      </div>

    </header>
  );
}