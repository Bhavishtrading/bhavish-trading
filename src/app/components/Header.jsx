export default function Header() {
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

      <span className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold">
        ● LIVE
      </span>
    </header>
  );
}