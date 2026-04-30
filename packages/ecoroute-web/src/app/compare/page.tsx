"use client";

import { useState } from "react";
import SearchBar from "../../components/SearchBar";
import MapView from "../../components/MapView";
import RouteCard from "../../components/RouteCard";
import CarbonMeter from "../../components/CarbonMeter";

export default function ComparePage() {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleSearch = () => {
    setIsSearching(true);
    
    // Simulate API Call to EcoRoute Core
    setTimeout(() => {
      setResults({
        eco: {
          distance: "14.2 km",
          duration: "26 min",
          carbon: "2.1 kg",
          isEco: true,
        },
        standard: {
          distance: "12.8 km",
          duration: "24 min",
          carbon: "4.5 kg",
          isEco: false,
        }
      });
      setIsSearching(false);
    }, 1500);
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

          {results && (
            <div className="mt-2 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CarbonMeter ecoCarbon={2.1} stdCarbon={4.5} />
              
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
          <MapView isActive={!!results} isSearching={isSearching} />
        </div>
      </div>
    </div>
  );
}
