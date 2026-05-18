"use client";

import { useState, useEffect } from "react";

interface ServiceStatus {
  status: "operational" | "degraded" | "outage";
  timestamp: number;
  services: {
    database: string;
    redis: string;
    routing_engine: string;
  };
}

export default function StatusPage() {
  const [data, setData] = useState<ServiceStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Use local proxy to bypass ISP blocks and Adblockers
  const API_URL = "/api/proxy";

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/health`);
        if (res.ok) {
          const statusData = await res.json();
          setData(statusData);
        }
      } catch (error) {
        console.error("Failed to fetch status:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [API_URL]);

  const getStatusColor = (status: string) => {
    if (status === "operational" || status === "connected") return "text-[var(--neon-green)]";
    if (status === "degraded" || status === "initializing") return "text-yellow-400";
    return "text-red-500";
  };

  const getStatusIcon = (status: string) => {
    if (status === "operational" || status === "connected") {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24">
        <div className="h-8 w-48 skeleton mb-12"></div>
        <div className="space-y-4">
          <div className="h-20 w-full skeleton"></div>
          <div className="h-20 w-full skeleton"></div>
          <div className="h-20 w-full skeleton"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-24">
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">System Status</h1>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${data?.status === "operational" ? "bg-[rgba(0,255,163,0.1)] text-[var(--neon-green)]" : "bg-yellow-500/10 text-yellow-400"}`}>
          <div className={`w-2 h-2 rounded-full ${data?.status === "operational" ? "bg-[var(--neon-green)] animate-pulse" : "bg-yellow-400"}`}></div>
          All Systems {data?.status === "operational" ? "Normal" : "Degraded"}
        </div>
      </div>

      <div className="grid gap-4">
        {data ? (
          <>
            <div className="glass-panel p-6 flex justify-between items-center bg-[var(--surface-glass)]">
              <div>
                <h3 className="text-[var(--text-primary)] font-bold">API Gateway</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Global entry point for EcoRoute requests</p>
              </div>
              <div className={getStatusColor("operational")}>{getStatusIcon("operational")}</div>
            </div>

            <div className="glass-panel p-6 flex justify-between items-center bg-[var(--surface-glass)]">
              <div>
                <h3 className="text-[var(--text-primary)] font-bold">Core Routing Engine</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Rust-powered graph optimization service</p>
              </div>
              <div className={getStatusColor(data.services.routing_engine)}>{getStatusIcon(data.services.routing_engine)}</div>
            </div>

            <div className="glass-panel p-6 flex justify-between items-center bg-[var(--surface-glass)]">
              <div>
                <h3 className="text-[var(--text-primary)] font-bold">Data Persistence</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">PostgreSQL database for user data</p>
              </div>
              <div className={getStatusColor(data.services.database)}>{getStatusIcon(data.services.database)}</div>
            </div>

            <div className="glass-panel p-6 flex justify-between items-center bg-[var(--surface-glass)]">
              <div>
                <h3 className="text-[var(--text-primary)] font-bold">Rate Limiting & Cache</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Redis service for high-performance quotas</p>
              </div>
              <div className={getStatusColor(data.services.redis)}>{getStatusIcon(data.services.redis)}</div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 glass-panel bg-[var(--surface-glass)]">
            <p className="text-red-400 font-bold">System metrics currently unreachable.</p>
          </div>
        )}
      </div>

      <div className="mt-12 text-center">
        <p className="text-xs text-[var(--text-secondary)]">
          Last updated: {data ? new Date(data.timestamp * 1000).toLocaleTimeString() : "N/A"}
        </p>
      </div>
    </div>
  );
}
