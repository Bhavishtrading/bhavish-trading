"use client";

import { useState } from "react";

export default function LTPPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function getLTP() {
    try {
      setLoading(true);

      const jwtToken = localStorage.getItem("jwtToken");

      if (!jwtToken) {
        alert("JWT Token not found. Please login again.");
        return;
      }

      const response = await fetch("/api/angel/ltp", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      });

      const data = await response.json();

      console.log(data);
      setResult(data);

    } catch (error) {
      console.error(error);
      alert("Failed to fetch LTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-10">

      <h1 className="text-4xl font-bold mb-8">
        Live NIFTY LTP
      </h1>

      <button
        onClick={getLTP}
        className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg"
      >
        {loading ? "Loading..." : "Get Live NIFTY"}
      </button>

      {result && (
        <pre className="mt-8 bg-slate-900 p-5 rounded-xl overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

    </div>
  );
}