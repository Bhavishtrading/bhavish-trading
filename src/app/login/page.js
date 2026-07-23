"use client";

export default function LoginPage() {
  const handleLogin = () => {
    window.location.href = "/api/zerodha/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="bg-slate-900 p-8 rounded-xl w-96 text-center">
        <h1 className="text-3xl font-bold text-white mb-6">
          Zerodha Login
        </h1>

        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg"
        >
          Login with Zerodha
        </button>
      </div>
    </div>
  );
}