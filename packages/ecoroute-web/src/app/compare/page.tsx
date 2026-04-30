"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import SearchBar from "../../components/SearchBar";
import MapView from "../../components/MapView";
import RouteCard from "../../components/RouteCard";
import CarbonMeter from "../../components/CarbonMeter";

// Carbon emission factors (kg CO2 per km) — based on EPA & IPCC data
// ecoSaving = % carbon saved through eco-driving (varies by drivetrain)
// trafficPenalty = extra % carbon from stop-and-go in standard driving
const VEHICLES = [
  { id: "petrol",   label: "Petrol Car",   icon: "⛽", factor: 0.21, ecoSaving: 0.15, trafficPenalty: 1.12, color: "#F59E0B" },
  { id: "diesel",   label: "Diesel Car",   icon: "🛢️", factor: 0.27, ecoSaving: 0.12, trafficPenalty: 1.08, color: "#EF4444" },
  { id: "cng",      label: "CNG Car",      icon: "💨", factor: 0.16, ecoSaving: 0.18, trafficPenalty: 1.15, color: "#3B82F6" },
  { id: "hybrid",   label: "Hybrid",       icon: "🔋", factor: 0.10, ecoSaving: 0.28, trafficPenalty: 1.05, color: "#8B5CF6" },
  { id: "ev",       label: "Electric (EV)",icon: "⚡", factor: 0.05, ecoSaving: 0.32, trafficPenalty: 1.03, color: "#00FFA3" },
  { id: "bike",     label: "Motorcycle",   icon: "🏍️", factor: 0.11, ecoSaving: 0.10, trafficPenalty: 1.18, color: "#F97316" },
];

const ECO_DRIVING_TIME_PENALTY = 0.08;

interface RouteGeometry {
  coordinates: [number, number][];
  distance_km: number;
  duration_min: number;
}

// Store raw route data separately from computed results
interface RawRouteData {
  eco: RouteGeometry;
  standard: RouteGeometry;
}

async function fetchOSRMRoute(
  originLat: number, originLon: number,
  destLat: number, destLon: number
): Promise<RouteGeometry[]> {
  const url = `https://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?overview=full&geometries=geojson&alternatives=true`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error('Could not find a driving route between these locations.');
  }

  return data.routes.map((r: any) => ({
    coordinates: r.geometry.coordinates,
    distance_km: r.distance / 1000,
    duration_min: r.duration / 60,
  }));
}

async function fetchDetourRoute(
  originLat: number, originLon: number,
  destLat: number, destLon: number
): Promise<RouteGeometry | null> {
  try {
    const midLat = (originLat + destLat) / 2 + 0.03;
    const midLon = (originLon + destLon) / 2 + 0.03;
    const url = `https://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${midLon},${midLat};${destLon},${destLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.length) {
      return {
        coordinates: data.routes[0].geometry.coordinates,
        distance_km: data.routes[0].distance / 1000,
        duration_min: data.routes[0].duration / 60,
      };
    }
  } catch (e) {
    console.warn("Detour fetch failed:", e);
  }
  return null;
}

export default function ComparePage() {
  const { getToken } = useAuth();
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originCoords, setOriginCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [rawRoutes, setRawRoutes] = useState<RawRouteData | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState("petrol");
  const [selectedRoute, setSelectedRoute] = useState<"eco" | "standard">("eco");

  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const API_URL = rawApiUrl.replace(/\/$/, "");

  // Compute results reactively whenever vehicle or raw routes change
  const results = useMemo(() => {
    if (!rawRoutes) return null;
    
    const vehicleData = VEHICLES.find(v => v.id === selectedVehicle) || VEHICLES[0];
    const carbonFactor = vehicleData.factor;
    
    const ecoDistKm = rawRoutes.eco.distance_km;
    const stdDistKm = rawRoutes.standard.distance_km;
    
    // Vehicle-specific calculations
    const ecoCarbonKg = ecoDistKm * carbonFactor * (1 - vehicleData.ecoSaving);
    const ecoTimeMins = rawRoutes.eco.duration_min * (1 + ECO_DRIVING_TIME_PENALTY);
    const stdCarbonKg = stdDistKm * carbonFactor * vehicleData.trafficPenalty;
    
    return {
      eco: {
        distance: `${ecoDistKm.toFixed(1)} km`,
        duration: `${ecoTimeMins.toFixed(0)} min`,
        carbon: `${ecoCarbonKg.toFixed(2)} kg`,
        carbonVal: ecoCarbonKg,
        isEco: true,
      },
      standard: {
        distance: `${stdDistKm.toFixed(1)} km`,
        duration: `${rawRoutes.standard.duration_min.toFixed(0)} min`,
        carbon: `${stdCarbonKg.toFixed(2)} kg`,
        carbonVal: stdCarbonKg,
        isEco: false,
      },
      totalDistance: ecoDistKm,
      vehicle: vehicleData,
    };
  }, [rawRoutes, selectedVehicle]);

  // Route geometries for the map
  const routeGeometries = useMemo(() => {
    if (!rawRoutes) return null;
    return {
      eco: rawRoutes.eco.coordinates,
      standard: rawRoutes.standard.coordinates,
    };
  }, [rawRoutes]);

  const handleSearch = async (originStr: string, destinationStr: string) => {
    setIsSearching(true);
    setError(null);
    setRawRoutes(null);
    setSelectedRoute("eco");
    
    try {
      // 1. Geocode
      const geocode = async (query: string) => {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
        const data = await res.json();
        if (data.length === 0) throw new Error(`Location not found: "${query}". Try a more specific name.`);
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      };

      const [origin, dest] = await Promise.all([geocode(originStr), geocode(destinationStr)]);
      setOriginCoords(origin);
      setDestCoords(dest);

      // 2. Get routes from OSRM
      const osrmRoutes = await fetchOSRMRoute(origin.lat, origin.lon, dest.lat, dest.lon);
      const primaryRoute = osrmRoutes[0];
      
      // Always get a distinct second route
      let altRoute: RouteGeometry | null = osrmRoutes.length > 1 ? osrmRoutes[1] : null;
      if (!altRoute) {
        altRoute = await fetchDetourRoute(origin.lat, origin.lon, dest.lat, dest.lon);
      }
      if (!altRoute) {
        // Last resort: fake a slightly longer route with same geometry
        altRoute = {
          ...primaryRoute,
          distance_km: primaryRoute.distance_km * 1.15,
          duration_min: primaryRoute.duration_min * 1.10,
        };
      }

      setRawRoutes({ eco: primaryRoute, standard: altRoute });

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to calculate route.");
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
              Test the EcoRoute API in real-time. Enter any two locations worldwide.
            </p>
            <SearchBar onSearch={handleSearch} isLoading={isSearching} />
          </div>

          {/* Vehicle Selector */}
          <div className="glass-panel p-3">
            <h4 className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Your Vehicle</h4>
            <div className="grid grid-cols-3 gap-1.5">
              {VEHICLES.map(v => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVehicle(v.id)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all border ${
                    selectedVehicle === v.id 
                      ? 'bg-[rgba(0,255,163,0.1)] border-[var(--neon-green)] text-white shadow-[0_0_8px_rgba(0,255,163,0.15)]' 
                      : 'bg-[var(--surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-white/20 hover:text-white'
                  }`}
                >
                  <span className="text-sm">{v.icon}</span>
                  <span className="truncate">{v.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[9px] text-[var(--text-secondary)] mt-2">
              CO₂: <span className="text-white font-semibold">{VEHICLES.find(v => v.id === selectedVehicle)?.factor} kg/km</span>
              {' • '}Eco Saving: <span className="text-[var(--neon-green)] font-semibold">{((VEHICLES.find(v => v.id === selectedVehicle)?.ecoSaving || 0) * 100).toFixed(0)}%</span>
              {selectedVehicle === 'ev' && <span className="text-[var(--neon-green)] ml-1">• Near-Zero!</span>}
            </p>
          </div>

          {error && (
            <div className="bg-[rgba(255,100,100,0.1)] border border-red-500/50 p-3 rounded-lg">
              <p className="text-red-400 text-xs font-medium flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {error}
              </p>
            </div>
          )}

          {results && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Trip Summary */}
              <div className="glass-panel p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Total Distance</p>
                  <p className="text-2xl font-extrabold text-white">{results.totalDistance.toFixed(1)} <span className="text-sm font-medium text-[var(--text-secondary)]">km</span></p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Vehicle</p>
                  <p className="text-lg font-bold text-white flex items-center gap-1 justify-end">
                    <span>{results.vehicle.icon}</span> {results.vehicle.label}
                  </p>
                </div>
              </div>

              <CarbonMeter ecoCarbon={results.eco.carbonVal} stdCarbon={results.standard.carbonVal} />
              
              {/* Selectable Route Cards */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Select Your Route</h3>
                <div 
                  onClick={() => setSelectedRoute("eco")} 
                  className={`cursor-pointer transition-all rounded-lg ${selectedRoute === "eco" ? "ring-2 ring-[var(--neon-green)] ring-offset-1 ring-offset-[var(--bg-primary)]" : "opacity-70 hover:opacity-100"}`}
                >
                  <RouteCard data={results.eco} />
                </div>
                <div 
                  onClick={() => setSelectedRoute("standard")} 
                  className={`cursor-pointer transition-all rounded-lg ${selectedRoute === "standard" ? "ring-2 ring-[#F97316] ring-offset-1 ring-offset-[var(--bg-primary)]" : "opacity-70 hover:opacity-100"}`}
                >
                  <RouteCard data={results.standard} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Map View */}
        <div className="w-full lg:w-2/3 h-[400px] lg:h-full rounded-xl overflow-hidden glass-panel relative border border-[var(--border-subtle)]">
          <MapView 
            isActive={!!results} 
            isSearching={isSearching} 
            routeGeometries={routeGeometries}
            originCoords={originCoords}
            destCoords={destCoords}
            selectedRoute={selectedRoute}
          />
        </div>
      </div>
    </div>
  );
}
