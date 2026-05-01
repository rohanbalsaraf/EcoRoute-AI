"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

export default function ApiKeyManager() {
  const { getToken } = useAuth();
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<{ raw: string; display: string } | null>(null);

  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const API_URL = rawApiUrl.replace(/\/$/, "");

  const fetchKeys = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/internal/dashboard/api-keys`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(data);
      }
    } catch (error) {
      console.error("Failed to fetch keys:", error);
      setError("Failed to connect to API server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const generateKey = async () => {
    try {
      setLoading(true);
      setNewKey(null);
      const token = await getToken();
      const res = await fetch(`${API_URL}/internal/dashboard/api-keys?name=Default Key`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNewKey({ raw: data.api_key, display: data.display_key });
        await fetchKeys(); // Refresh the list
        toast.success("New API key generated!");
      }
    } catch (error) {
      console.error("Failed to generate key:", error);
      toast.error("Failed to generate API key.");
    } finally {
      setLoading(false);
    }
  };

  const revokeKey = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key? This action cannot be undone and any applications using this key will immediately stop working.")) {
      return;
    }
    
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(`${API_URL}/internal/dashboard/api-keys/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        if (newKey && keys.find(k => k.id === id)?.display_key === newKey.display) {
            setNewKey(null);
        }
        await fetchKeys();
        toast.success("API key revoked.");
      } else {
        toast.error("Failed to revoke key.");
      }
    } catch (error) {
      console.error("Failed to revoke key:", error);
      toast.error("Failed to revoke key.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="glass-panel p-4 md:col-span-2 bg-[var(--surface-glass)]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">API Keys</h2>
        <button 
          onClick={generateKey}
          disabled={loading}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? <span className="animate-spin text-xs">↻</span> : <span className="text-lg">+</span>}
          <span className="hidden sm:inline">New Key</span>
        </button>
      </div>

      {newKey && (
        <div className="mb-6 p-4 rounded-lg bg-[rgba(0,255,163,0.05)] border border-[var(--border-glow-green)] animate-in zoom-in-95 duration-300">
          <p className="text-[10px] font-bold text-[var(--neon-green)] uppercase tracking-wider mb-2">New Key Generated</p>
          <div className="flex items-center gap-2">
            <code className="bg-[var(--surface)] px-2 py-1.5 rounded border border-[var(--border-subtle)] text-xs flex-1 font-mono text-[var(--text-primary)] break-all">{newKey.raw}</code>
            <button 
              onClick={() => copyToClipboard(newKey.raw)}
              className="p-1.5 rounded bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--neon-green)]"
            >
              Copy
            </button>
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-2 italic">Copy this key now. You won't be able to see it again.</p>
        </div>
      )}

      {loading && !keys.length ? (
        <div className="space-y-3">
          <div className="h-16 w-full skeleton"></div>
          <div className="h-16 w-full skeleton"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {error && (
            <p className="text-red-400 text-[10px] italic mb-2">Connection Error: Ensure NEXT_PUBLIC_API_URL is set correctly (Current: {API_URL})</p>
          )}
          {keys.length === 0 && !loading && !error && (
            <p className="text-[var(--text-secondary)] text-xs italic">No API keys found. Generate one to get started.</p>
          )}
          {keys.map((k: any) => (
            <div key={k.id} className="glass-panel p-3 border-glow-hover flex justify-between items-center bg-[var(--surface-glass)] group transition-all">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-[rgba(123,97,255,0.1)] flex items-center justify-center border border-[var(--neon-purple-glow)]">
                  <svg className="w-4 h-4 text-[var(--neon-purple)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
                </div>
                <div>
                  <p className="font-medium text-sm text-[var(--text-primary)]">{k.name}</p>
                  <p className="font-mono text-[10px] text-[var(--text-secondary)] mt-0.5">{k.display_key}</p>
                </div>
              </div>
              <button 
                onClick={() => revokeKey(k.id)}
                className="text-red-500 hover:text-red-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
