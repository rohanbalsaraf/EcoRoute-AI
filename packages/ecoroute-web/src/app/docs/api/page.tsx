"use client";

import { useState } from "react";

const CODE_EXAMPLES = {
  curl: `curl -X POST https://api.ecoroute.ai/v1/routes \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "origin_lat": 40.7128,
    "origin_lon": -74.0060,
    "dest_lat": 34.0522,
    "dest_lon": -118.2437,
    "vehicle": "petrol"
  }'`,
  python: `import requests

url = "https://api.ecoroute.ai/v1/routes"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
payload = {
    "origin_lat": 40.7128,
    "origin_lon": -74.0060,
    "dest_lat": 34.0522,
    "dest_lon": -118.2437,
    "vehicle": "petrol"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,
  node: `const axios = require('axios');

const getRoute = async () => {
  const response = await axios.post('https://api.ecoroute.ai/v1/routes', {
    origin_lat: 40.7128,
    origin_lon: -74.0060,
    dest_lat: 34.0522,
    dest_lon: -118.2437,
    vehicle: 'petrol'
  }, {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY'
    }
  });
};`
};

export default function ApiDocsPage() {
  const [activeTab, setActiveTab] = useState<keyof typeof CODE_EXAMPLES>("curl");

  return (
    <section id="calculate-route">
      <div className="flex items-center gap-3 mb-6">
        <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded">POST</span>
        <h1 className="text-4xl font-extrabold text-[var(--text-primary)] font-mono tracking-tight">/v1/routes</h1>
      </div>
      
      <p className="text-lg text-[var(--text-secondary)] leading-relaxed mb-8">
        Calculates greenest, fastest, and shortest routes between origin and destination. This endpoint returns full path coordinates and carbon metrics.
      </p>

      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Request Body</h2>
      <div className="overflow-x-auto mb-12">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)]">
              <th className="py-3 font-semibold text-[var(--text-primary)]">Parameter</th>
              <th className="py-3 font-semibold text-[var(--text-primary)]">Type</th>
              <th className="py-3 font-semibold text-[var(--text-primary)]">Description</th>
            </tr>
          </thead>
          <tbody className="text-[var(--text-secondary)]">
            <tr className="border-b border-[var(--border-subtle)]">
              <td className="py-4 font-mono text-[var(--neon-green)] font-bold">origin_lat</td>
              <td className="py-4 italic">float</td>
              <td className="py-4">Latitude of the starting point.</td>
            </tr>
            <tr className="border-b border-[var(--border-subtle)]">
              <td className="py-4 font-mono text-[var(--neon-green)] font-bold">origin_lon</td>
              <td className="py-4 italic">float</td>
              <td className="py-4">Longitude of the starting point.</td>
            </tr>
            <tr className="border-b border-[var(--border-subtle)]">
              <td className="py-4 font-mono text-[var(--neon-green)] font-bold">dest_lat</td>
              <td className="py-4 italic">float</td>
              <td className="py-4">Latitude of the destination.</td>
            </tr>
            <tr className="border-b border-[var(--border-subtle)]">
              <td className="py-4 font-mono text-[var(--neon-green)] font-bold">dest_lon</td>
              <td className="py-4 italic">float</td>
              <td className="py-4">Longitude of the destination.</td>
            </tr>
            <tr className="border-b border-[var(--border-subtle)]">
              <td className="py-4 font-mono text-[var(--neon-green)] font-bold">vehicle</td>
              <td className="py-4 italic">string</td>
              <td className="py-4">Vehicle type: <code className="text-[var(--text-primary)]">petrol</code>, <code className="text-[var(--text-primary)]">ev</code>, <code className="text-[var(--text-primary)]">diesel</code>, <code className="text-[var(--text-primary)]">hybrid</code>.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Code Examples</h2>
      {/* Code Examples Tabs */}
      <div className="glass-panel overflow-hidden bg-[var(--surface-glass)] border-[var(--border-subtle)] shadow-2xl mb-12">
        <div className="flex border-b border-[var(--border-subtle)] bg-[var(--surface)]">
          {Object.keys(CODE_EXAMPLES).map((lang) => (
            <button
              key={lang}
              onClick={() => setActiveTab(lang as any)}
              className={`px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all ${
                activeTab === lang 
                  ? "text-[var(--neon-green)] border-b-2 border-[var(--neon-green)] bg-[rgba(0,255,163,0.05)]" 
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
        <div className="p-6 bg-black/60 font-mono text-sm leading-relaxed overflow-x-auto">
          <pre className="text-green-50/90">
            {CODE_EXAMPLES[activeTab]}
          </pre>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Response Object</h2>
      <p className="text-[var(--text-secondary)] mb-6">
        Returns a JSON object containing the calculated routes categorized by priority.
      </p>
      <div className="glass-panel p-6 bg-[var(--surface-glass)] border-[var(--border-subtle)] font-mono text-xs text-[var(--text-primary)]">
        <pre>{`{
  "greenest": {
    "distance_km": 12.4,
    "time_min": 22,
    "co2_kg": 1.2,
    "path": [3452, 3453, ...]
  },
  "fastest": { ... },
  "shortest": { ... }
}`}</pre>
      </div>
    </section>
  );
}
