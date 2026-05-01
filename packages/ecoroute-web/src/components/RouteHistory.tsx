"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

export default function RouteHistory() {
  const { getToken } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const API_URL = rawApiUrl.replace(/\/$/, "");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/internal/dashboard/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
        }
      } catch (error) {
        console.error("Failed to fetch history:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [getToken, API_URL]);

  if (loading) {
    return (
      <div className="glass-panel p-6 bg-[var(--surface-glass)]">
        <div className="h-6 w-32 skeleton mb-6"></div>
        <div className="space-y-3">
          <div className="h-16 w-full skeleton"></div>
          <div className="h-16 w-full skeleton"></div>
          <div className="h-16 w-full skeleton"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 bg-[var(--surface-glass)]">
      <h2 className="text-lg font-bold text-[var(--text-primary)] mb-6">Recent Routes</h2>
      
      {history.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)] italic">No routes calculated yet. Use the Playground to get started.</p>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div key={item.id} className="border-b border-[var(--border-subtle)] pb-4 last:border-0 last:pb-0">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[rgba(0,255,163,0.1)] text-[var(--neon-green)] uppercase">
                    {item.vehicle}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[var(--neon-green)]">{item.green_co2} kg CO2</p>
                </div>
              </div>
              <div className="flex gap-4 text-[10px] text-[var(--text-secondary)]">
                <p>Dist: <span className="text-[var(--text-primary)]">{item.green_dist} km</span></p>
                <p>Time: <span className="text-[var(--text-primary)]">{item.green_time} min</span></p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
