"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

export default function DashboardStats() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/internal/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [getToken, API_URL]);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border md:col-span-3 h-48 flex items-center justify-center">
        <p className="text-gray-500">Loading analytics...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border md:col-span-3">
        <p className="text-red-500">Failed to load analytics.</p>
      </div>
    );
  }

  const usagePercentage = Math.min(100, (stats.api_calls_this_month / stats.limit) * 100);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border md:col-span-3">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Usage & Billing</h2>
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${stats.tier === "Pro" ? "bg-purple-100 text-purple-800" : "bg-green-100 text-green-800"}`}>
          {stats.tier} Tier
        </span>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600 font-medium">API Calls (Today)</span>
          <span className="text-gray-900 font-bold">{stats.api_calls_this_month} / {stats.limit}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${usagePercentage > 90 ? "bg-red-600" : "bg-green-600"}`} 
            style={{ width: `${usagePercentage}%` }}
          ></div>
        </div>
        {usagePercentage > 90 && (
          <p className="text-xs text-red-600 mt-2">You are approaching your daily limit. Consider upgrading your tier.</p>
        )}
      </div>
      
      <div className="mt-6 flex justify-end border-t pt-4">
        <button 
          onClick={() => alert("Redirecting to Lemon Squeezy Customer Portal...")}
          className="text-blue-600 hover:underline text-sm font-medium"
        >
          Manage Billing in Lemon Squeezy &rarr;
        </button>
      </div>
    </div>
  );
}
