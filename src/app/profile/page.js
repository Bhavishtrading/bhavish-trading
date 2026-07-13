"use client";

import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const jwtToken = localStorage.getItem("jwtToken");

      if (!jwtToken) {
        alert("Please login first");
        window.location.href = "/login";
        return;
      }

      const response = await fetch("/api/angel/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      });

      const data = await response.json();

      console.log("Profile Response:", data);

      setProfile(data);

    } catch (error) {
      console.error(error);
      alert("Unable to load profile");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        Loading Profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-10">
      <h1 className="text-3xl font-bold mb-8">
        Angel One Profile
      </h1>

      <pre className="bg-slate-900 p-5 rounded-xl overflow-auto">
        {JSON.stringify(profile, null, 2)}
      </pre>
    </div>
  );
}