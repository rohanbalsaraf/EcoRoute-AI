"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import SearchBar from "../../components/SearchBar";
import MapView from "../../components/MapView";
import RouteCard from "../../components/RouteCard";
import CarbonMeter from "../../components/CarbonMeter";

export default function ComparePage() {
  const { getToken } = useAuth();
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const API_URL = rawApiUrl.replace(/\/$/, "");

  const handleSearch = async () => {
    setIsSearching(true);
    setError(null);
    
    try {
      const token = await getToken();
      
      // 1. Get an API key to use for this request (Playground usually needs an API key)
      // For simplicity in the playground, we'll fetch the user's keys first
      const keyRes = await fetch(`${API_URL}/internal/dashboard/api-keys`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let apiKey = "";
      if (keyRes.ok) {
        const keys = await keyRes.json();
        if (keys.length > 0) {
          // Note: In a real app, we'd need the FULL key, but our internal list only shows display_key.
          // For the Playground, let's assume we have a "Playground Session" or we just create a temporary key.
          // For now, let's use a specialized endpoint if it exists, or just generate a new one.
          const createRes = await fetch(`${API_URL}/internal/dashboard/api-keys?name=Playground Key`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
          });
          const keyData = await createRes.json();
          apiKey = keyData.api_key;
        } else {
          // Auto-generate a key for the user if they have none
          const createRes = await fetch(`${API_URL}/internal/dashboard/api-keys?name=Playground Key`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
          });
          const keyData = await createRes.json();
          apiKey = keyData.api_key;
        }
      }

      // 2. Call the real routing API
      // Using hardcoded coordinates for Pune (from our dummy graph) for the playground demo
      const params = new URLSearchParams({
        origin_lat: "18.5285", 
        origin_lon: "73.8740",
        dest_lat: "18.5912",
        dest_lon: "73.7380",
        vehicle: "petrol"
      });
      
      const routeRes = await fetch(`${API_URL}/v1/routes`, {
        method: "POST",
        body: JSON.stringify({
          origin_lat: 18.5285, 
          origin_lon: 73.8740,
          dest_lat: 18.5912,
          dest_lon: 73.7380,
          vehicle: "petrol"
        }),
        headers: { 
          "X-API-Key": apiKey,
          "Content-Type": "application/json"
        }
      });

      if (routeRes.ok) {
        const data = await routeRes.json();
        const routes = data.routes;
        
        setResults({
          eco: {
            distance: `${routes.greenest.total_distance_km.toFixed(1)} km`,
            duration: `${routes.greenest.total_time_min.toFixed(0)} min`,
            carbon: `${routes.greenest.total_carbon_kg.toFixed(2)} kg`,
            carbonVal: routes.greenest.total_carbon_kg,
            isEco: true,
          },
          standard: {
            distance: `${routes.fastest.total_distance_km.toFixed(1)} km`,
            duration: `${routes.fastest.total_time_min.toFixed(0)} min`,
            carbon: `${routes.fastest.total_carbon_kg.toFixed(2)} kg`,
            carbonVal: routes.fastest.total_carbon_kg,
            isEco: false,
          },
          raw: routes
        });
      } else {
        const errData = await routeRes.json();
        setError(errData.detail || "Routing failed");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the routing engine.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 h-[calc(100vh-5rem)]">
      <div className="flex flex-col lg:flex-row gap-6 h-full">
        
        {/* Left Control Panel */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4 h-full overflow-y-auto pr-2 pb-4">
          <div>
            <h1 className="text-2xl font-bold mb-1 text-white">API Playground</h1>
            <p className="text-[var(--text-secondary)] text-xs mb-4">
              Test the EcoRoute API in real-time. Enter a route to see the carbon savings.
            </p>
            <SearchBar onSearch={handleSearch} isLoading={isSearching} />
          </div>

          {error && (
            <div className="bg-[rgba(255,100,100,0.1)] border border-red-500/50 p-3 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-red-400 text-xs font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {error}
              </p>
              <p className="text-[10px] text-gray-600 mt-1">Check if API_URL is correct: {API_URL}</p>
            </div>
          )}

          {results && (
            <div className="mt-2 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CarbonMeter ecoCarbon={results.eco.carbonVal} stdCarbon={results.standard.carbonVal} />
              
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Route Results</h3>
                <RouteCard data={results.eco} />
                <RouteCard data={results.standard} />
              </div>
            </div>
          )}
        </div>

        {/* Right Map View */}
        <div className="w-full lg:w-2/3 h-[400px] lg:h-full rounded-xl overflow-hidden glass-panel relative border border-[var(--border-subtle)]">
          <MapView 
            isActive={!!results} 
            isSearching={isSearching} 
            routes={results?.raw} 
          />
        </div>
      </div>
    </div>
  );
}
