"use client";

import { useState } from "react";

export default function SearchPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function search() {
    try {
      setLoading(true);

      const jwtToken = localStorage.getItem("jwtToken");

      const response = await fetch("/api/angel/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
          exchange: "NSE",
          searchscrip: "NIFTY",
        }),
      });

      const data = await response.json();

      console.log(data);
      setResult(data);

    } catch (err) {
      console.error(err);
      alert("Search Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-10">

      <h1 className="text-3xl font-bold mb-8">
        Search Scrip
      </h1>

      <button
        onClick={search}
        className="bg-green-600 px-5 py-3 rounded-lg"
      >
        {loading ? "Searching..." : "Search NIFTY"}
      </button>

      {result && (
        <pre className="mt-8 bg-slate-900 p-5 rounded-xl overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

    </div>
  );
}