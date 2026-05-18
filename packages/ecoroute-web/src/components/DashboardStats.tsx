"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export default function DashboardStats() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const API_URL = rawApiUrl.trim().replace(/\/$/, "");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = await getToken();
        const fetchUrl = `${API_URL}/api/v1/user/quota`;
        const headers: any = { 'Content-Type': 'application/json' };
        if (token && typeof token === 'string' && token.length > 10) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(fetchUrl, { 
            method: 'GET',
            headers 
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
          
          // 80% Usage Warning
          const usage = (data.api_calls_this_month / data.limit) * 100;
          if (usage >= 80) {
            import('sonner').then(({ toast }) => {
              toast.warning("Usage Warning", {
                description: `You have used ${usage.toFixed(1)}% of your monthly API quota. Upgrade to Pro to avoid limits.`,
                duration: 10000,
              });
            });
          }
        } else {
          setDebugInfo(`Error ${res.status}: ${res.statusText} | URL: ${fetchUrl}`);
        }
      } catch (error: any) {
        console.error("Failed to fetch stats:", error);
        setDebugInfo(`${error.message} | Target: ${API_URL}/api/v1/user/quota`);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [getToken, API_URL]);

  if (loading) {
    return (
      <div className="glass-panel p-6 md:col-span-3 bg-[var(--surface-glass)]">
        <div className="h-6 w-32 skeleton mb-8"></div>
        <div className="h-48 w-full skeleton rounded-xl"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="glass-panel p-8 md:col-span-3 bg-[var(--surface-glass)] border-red-500/30 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 17c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Analytics Unavailable</h3>
        <p className="text-sm text-[var(--text-secondary)] max-w-xs mb-2">
          We couldn't connect to the analytics engine.
        </p>
        {debugInfo && (
          <p className="text-[10px] font-mono text-red-400/70 mb-6 bg-red-500/5 px-2 py-1 rounded">
            Diagnostic: {debugInfo}
          </p>
        )}
        <div className="flex gap-4">
            <button 
                onClick={() => window.location.reload()}
                className="btn-glass py-2 px-6 text-xs font-bold hover:bg-red-500/10"
            >
                Retry
            </button>
            <a 
                href="/status"
                className="btn-glass py-2 px-6 text-xs font-bold border-none text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
                System Status
            </a>
        </div>
      </div>
    );
  }

  const usagePercentage = Math.min(100, (stats.api_calls_this_month / stats.limit) * 100);

  return (
    <div className="glass-panel p-6 md:col-span-3 bg-[var(--surface-glass)]">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Usage History</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">API calls over the last 7 days</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${stats.tier === "Pro" ? "bg-[var(--neon-purple)] text-white" : "bg-[var(--neon-green)] text-black"}`}>
          {stats.tier} Tier
        </span>
      </div>

      {/* Chart Section */}
      <div className="h-48 w-full mb-8">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stats.daily_usage}>
            <defs>
              <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--neon-green)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--neon-green)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
              dy={10}
            />
            <YAxis hide />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'var(--surface)', 
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              itemStyle={{ color: 'var(--neon-green)' }}
            />
            <Area 
              type="monotone" 
              dataKey="calls" 
              stroke="var(--neon-green)" 
              fillOpacity={1} 
              fill="url(#colorCalls)" 
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-[var(--text-secondary)]">Total usage (Last 7 days)</span>
            <span className="text-[var(--text-primary)] font-bold">{stats.api_calls_this_month} / {stats.limit}</span>
          </div>
          <div className="w-full bg-[var(--surface)] rounded-full h-1.5 relative overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${usagePercentage > 90 ? "bg-red-500" : "bg-[var(--neon-green)] shadow-[0_0_8px_var(--neon-green-glow)]"}`} 
              style={{ width: `${usagePercentage}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 flex justify-between items-center border-t border-[var(--border-subtle)] pt-4">
        {stats.tier !== "Pro" && (
          <button 
            onClick={async () => {
              const res = await fetch("/api/checkout", { method: "POST" });
              const data = await res.json();
              if (data.url) window.location.href = data.url;
            }}
            className="btn-primary py-2 px-4 text-xs font-bold"
          >
            Upgrade to Pro
          </button>
        )}
        <a 
          href="https://app.lemonsqueezy.com/my-orders"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--text-secondary)] hover:text-[var(--neon-green)] text-xs transition-colors"
        >
          Manage Billing &rarr;
        </a>
      </div>
    </div>
  );
}
