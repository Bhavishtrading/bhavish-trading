"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleLogin = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/angel/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          totp: otp,
        }),
      });

      const result = await response.json();

      if (result.status === true) {

        // Temporary Storage
        localStorage.setItem("jwtToken", result.data.jwtToken);
        localStorage.setItem("refreshToken", result.data.refreshToken);

        alert("Login Successful ✅");

        router.push("/");

      } else {

        alert(result.message);

      }

    } catch (err) {

      console.error(err);
      alert("Login Failed");

    } finally {

      setLoading(false);

    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">

      <div className="bg-slate-900 p-8 rounded-xl w-96">

        <h1 className="text-3xl font-bold text-white mb-6">
          Angel One Login
        </h1>

        <input
          type="text"
          placeholder="Enter 6 Digit TOTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="w-full p-3 rounded-lg bg-slate-800 text-white border border-slate-700"
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full mt-5 bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg"
        >
          {loading ? "Logging In..." : "Login"}
        </button>

      </div>

    </div>
  );
}