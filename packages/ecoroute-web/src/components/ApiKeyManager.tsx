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
    <div className="glass-panel p-4 md:col-span-2">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">API Keys</h2>
        <button 
          onClick={generateKey} 
          disabled={loading}
          className="btn-primary text-xs"
        >
          {loading ? "Processing..." : "Generate New Key"}
        </button>
      </div>
      <p className="text-xs text-[var(--text-secondary)] mb-4">Use these keys to authenticate your API requests.</p>
      
      {newKey && (
        <div className="bg-[rgba(0,255,163,0.1)] border border-[var(--neon-green)] p-3 rounded mb-4 animate-in fade-in zoom-in duration-300">
          <p className="font-semibold text-xs text-[var(--neon-green)] mb-1.5 uppercase tracking-wider">Your new API key:</p>
          <div className="flex items-center gap-2">
            <code className="bg-[var(--surface)] px-2 py-1.5 rounded border border-[var(--border-subtle)] text-xs flex-1 font-mono text-white break-all">{newKey.raw}</code>
            <button 
              onClick={() => copyToClipboard(newKey.raw)}
              className="btn-primary py-1.5 px-3 text-xs"
            >
              Copy
            </button>
          </div>
          <p className="text-[10px] mt-2 text-[var(--neon-green)] opacity-80">Make sure to copy this now. You won't be able to see it again!</p>
        </div>
      )}

      <div className="space-y-2">
        {error && (
          <p className="text-red-400 text-[10px] italic mb-2">Connection Error: Ensure NEXT_PUBLIC_API_URL is set correctly (Current: {API_URL})</p>
        )}
        {keys.length === 0 && !loading && !error && (
          <p className="text-[var(--text-secondary)] text-xs italic">No API keys found. Generate one to get started.</p>
        )}
        {keys.map((k) => (
          <div key={k.id} className="bg-[var(--surface)] p-3 rounded border border-[var(--border-subtle)] hover:border-[var(--border-glow-green)] transition-all group">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-sm text-white">{k.name}</p>
                <p className="font-mono text-xs text-[var(--text-secondary)] mt-1">{k.display_key}</p>
                <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-tighter">Created: {new Date(k.created_at).toLocaleDateString()}</p>
              </div>
              <button 
                className="text-red-500 hover:text-red-400 text-xs font-medium transition-colors opacity-0 group-hover:opacity-100"
                onClick={() => revokeKey(k.id)}
              >
                Revoke
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
