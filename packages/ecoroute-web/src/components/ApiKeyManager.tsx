"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

export default function ApiKeyManager() {
  const { getToken } = useAuth();
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState<{ raw: string; display: string } | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
      }
    } catch (error) {
      console.error("Failed to generate key:", error);
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
      } else {
        alert("Failed to revoke key.");
      }
    } catch (error) {
      console.error("Failed to revoke key:", error);
      alert("Failed to revoke key.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border md:col-span-2">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">API Keys</h2>
        <button 
          onClick={generateKey} 
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 transition disabled:opacity-50"
        >
          {loading ? "Processing..." : "Generate New Key"}
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">Use these keys to authenticate your API requests.</p>
      
      {newKey && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded mb-4">
          <p className="font-semibold text-sm mb-1">Success! Your new API key:</p>
          <div className="flex items-center gap-2">
            <code className="bg-white px-2 py-1 rounded border text-sm flex-1">{newKey.raw}</code>
            <button 
              onClick={() => copyToClipboard(newKey.raw)}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
            >
              Copy
            </button>
          </div>
          <p className="text-xs mt-2 opacity-80">Make sure to copy this now. You won't be able to see it again!</p>
        </div>
      )}

      <div className="space-y-3">
        {keys.length === 0 && !loading && (
          <p className="text-gray-500 text-sm italic">No API keys found. Generate one to get started.</p>
        )}
        {keys.map((k) => (
          <div key={k.id} className="bg-gray-50 p-4 rounded border border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-sm">{k.name}</p>
                <p className="font-mono text-sm text-gray-500 mt-1">{k.display_key}</p>
                <p className="text-xs text-gray-400 mt-1">Created: {new Date(k.created_at).toLocaleDateString()}</p>
              </div>
              <button 
                className="text-red-600 hover:text-red-800 text-sm font-medium"
                onClick={() => alert("Revoke functionality coming in Phase 4!")}
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
