"use client";

import { useEffect, useState } from "react";

export default function Header() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const day = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();

  const isOpen =
    day >= 1 &&
    day <= 5 &&
    minutes >= (9 * 60 + 15) &&
    minutes <= (15 * 60 + 30);

  return (
    <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-6">

      <div>
        <h1 className="text-4xl font-bold text-blue-400">
          Bhavish Trading
        </h1>

        <p className="text-gray-400 mt-2 text-lg">
          AI Powered NIFTY Intelligence Dashboard
        </p>
      </div>

      <div className="flex flex-col items-end">

        <div
          className={`px-5 py-2 rounded-xl font-bold shadow-lg ${
            isOpen
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {isOpen ? "🟢 LIVE" : "🔴 MARKET CLOSED"}
        </div>

        <div className="mt-4 text-right">

          <p className="text-gray-400">
            {now.toLocaleDateString("en-IN")}
          </p>

          <p className="text-2xl font-bold text-white">
            {now.toLocaleTimeString("en-IN")}
          </p>

        </div>

      </div>

    </header>
  );
}