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
  
  console.log(response.data);
};`
};

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<keyof typeof CODE_EXAMPLES>("curl");

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
      <div className="flex flex-col lg:flex-row gap-12">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 shrink-0">
          <nav className="space-y-8 sticky top-24">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--neon-green)] mb-4">Getting Started</h3>
              <ul className="space-y-3 text-sm">
                <li><a href="#introduction" className="text-white hover:text-[var(--neon-green)] transition-colors">Introduction</a></li>
                <li><a href="#authentication" className="text-[var(--text-secondary)] hover:text-white transition-colors">Authentication</a></li>
                <li><a href="#rate-limits" className="text-[var(--text-secondary)] hover:text-white transition-colors">Rate Limits</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--neon-purple)] mb-4">Endpoints</h3>
              <ul className="space-y-3 text-sm">
                <li><a href="#calculate-route" className="text-[var(--text-secondary)] hover:text-white transition-colors font-mono">POST /v1/routes</a></li>
                <li><a href="#vehicle-types" className="text-[var(--text-secondary)] hover:text-white transition-colors">Vehicle Models</a></li>
              </ul>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 max-w-3xl">
          <section id="introduction" className="mb-16">
            <h1 className="text-4xl font-extrabold text-white mb-6 tracking-tight">API Documentation</h1>
            <p className="text-lg text-[var(--text-secondary)] leading-relaxed mb-6">
              Welcome to the EcoRoute API. Our platform allows you to calculate the most carbon-efficient routes between any two points on Earth, leveraging real-world topography and vehicle-specific emission models.
            </p>
            <div className="bg-[rgba(0,255,163,0.05)] border-l-4 border-[var(--neon-green)] p-4 rounded-r-lg">
              <p className="text-sm text-[var(--neon-green)] font-medium italic">
                "Our mission is to reduce global logistics emissions by 15% through intelligent routing."
              </p>
            </div>
          </section>

          <section id="authentication" className="mb-16">
            <h2 className="text-2xl font-bold text-white mb-4">Authentication</h2>
            <p className="text-[var(--text-secondary)] mb-6">
              All API requests require an API key passed in the <code className="bg-[var(--surface)] px-1.5 py-0.5 rounded text-[var(--neon-green)]">Authorization</code> header as a Bearer token.
            </p>
            <div className="glass-panel p-4 font-mono text-sm text-white mb-4">
              Authorization: Bearer YOUR_API_KEY
            </div>
            <p className="text-sm text-[var(--text-secondary)] italic">
              You can generate and manage your keys in the <a href="/dashboard" className="text-[var(--neon-green)] hover:underline">Developer Dashboard</a>.
            </p>
          </section>

          <section id="calculate-route" className="mb-16">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded">POST</span>
              <h2 className="text-2xl font-bold text-white font-mono">/v1/routes</h2>
            </div>
            <p className="text-[var(--text-secondary)] mb-8">
              Calculates greenest, fastest, and shortest routes between origin and destination.
            </p>

            <h3 className="text-sm font-bold text-white uppercase mb-4 tracking-wider">Request Body</h3>
            <div className="overflow-x-auto mb-8">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]">
                    <th className="py-3 font-semibold text-white">Parameter</th>
                    <th className="py-3 font-semibold text-white">Type</th>
                    <th className="py-3 font-semibold text-white">Description</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--text-secondary)]">
                  <tr className="border-b border-[var(--border-subtle)]">
                    <td className="py-4 font-mono text-[var(--neon-green)]">origin_lat</td>
                    <td className="py-4 italic">float</td>
                    <td className="py-4">Latitude of the starting point.</td>
                  </tr>
                  <tr className="border-b border-[var(--border-subtle)]">
                    <td className="py-4 font-mono text-[var(--neon-green)]">origin_lon</td>
                    <td className="py-4 italic">float</td>
                    <td className="py-4">Longitude of the starting point.</td>
                  </tr>
                  <tr className="border-b border-[var(--border-subtle)]">
                    <td className="py-4 font-mono text-[var(--neon-green)]">vehicle</td>
                    <td className="py-4 italic">string</td>
                    <td className="py-4">Vehicle type: <code className="text-white">petrol</code>, <code className="text-white">ev</code>, <code className="text-white">diesel</code>.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Code Examples */}
            <div className="glass-panel overflow-hidden">
              <div className="flex border-b border-[var(--border-subtle)] bg-[var(--surface)]">
                {Object.keys(CODE_EXAMPLES).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setActiveTab(lang as any)}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
                      activeTab === lang 
                        ? "text-[var(--neon-green)] border-b-2 border-[var(--neon-green)] bg-[rgba(0,255,163,0.05)]" 
                        : "text-[var(--text-secondary)] hover:text-white"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              <div className="p-4 bg-black/40 font-mono text-sm leading-relaxed overflow-x-auto">
                <pre className="text-green-50/90">
                  {CODE_EXAMPLES[activeTab]}
                </pre>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
