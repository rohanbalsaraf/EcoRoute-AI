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
    <div className="glass-panel p-4 md:col-span-3">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">Usage & Billing</h2>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${stats.tier === "Pro" ? "bg-[var(--neon-purple)] text-white" : "bg-[var(--neon-green)] text-black"}`}>
          {stats.tier} Tier
        </span>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-[var(--text-secondary)] font-medium">API Calls (Today)</span>
          <span className="text-white font-bold">{stats.api_calls_this_month} / {stats.limit}</span>
        </div>
        <div className="w-full bg-[var(--surface)] rounded-full h-1.5 relative overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${usagePercentage > 90 ? "bg-red-500" : "bg-[var(--neon-green)] shadow-[0_0_8px_var(--neon-green-glow)]"}`} 
            style={{ width: `${usagePercentage}%` }}
          ></div>
        </div>
        {usagePercentage > 90 && (
          <p className="text-[10px] text-red-400 mt-2 font-medium">Approaching daily limit. Consider upgrading.</p>
        )}
      </div>
      
      <div className="mt-6 flex justify-between items-center border-t border-[var(--border-subtle)] pt-4">
        {stats.tier !== "Pro" ? (
          <button 
            onClick={async () => {
              try {
                const res = await fetch("/api/checkout", { method: "POST" });
                const data = await res.json();
                if (data.url) {
                  window.location.href = data.url;
                } else {
                  alert("Failed to initiate checkout: " + (data.error || "Unknown error"));
                }
              } catch (e) {
                console.error(e);
                alert("Error connecting to checkout service.");
              }
            }}
            className="btn-primary text-xs"
          >
            Upgrade to Pro
          </button>
        ) : (
          <div></div> // Spacer
        )}
        <a 
          href="https://app.lemonsqueezy.com/my-orders"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--neon-green)] hover:underline text-xs font-medium"
        >
          Manage Billing &rarr;
        </a>
      </div>
    </div>
  );
}
