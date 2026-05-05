"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";
import SearchBar from "../../components/SearchBar";
import MapView from "../../components/MapView";
import RouteCard from "../../components/RouteCard";
import CarbonMeter from "../../components/CarbonMeter";

// Carbon emission factors (kg CO2 per km) — based on EPA & IPCC data
// ecoSaving = % carbon saved through eco-driving (varies by drivetrain)
// trafficPenalty = extra % carbon from stop-and-go in standard driving
const VEHICLES = [
  { id: "petrol",   label: "Petrol Car",   icon: "⛽", factor: 0.21, ecoSaving: 0.15, trafficPenalty: 1.12, color: "#F59E0B", timeFactor: 1.0 },
  { id: "diesel",   label: "Diesel Car",   icon: "🛢️", factor: 0.27, ecoSaving: 0.12, trafficPenalty: 1.08, color: "#EF4444", timeFactor: 1.0 },
  { id: "cng",      label: "CNG Car",      icon: "💨", factor: 0.16, ecoSaving: 0.18, trafficPenalty: 1.15, color: "#3B82F6", timeFactor: 1.0 },
  { id: "hybrid",   label: "Hybrid",       icon: "🔋", factor: 0.10, ecoSaving: 0.28, trafficPenalty: 1.05, color: "#8B5CF6", timeFactor: 0.98 },
  { id: "ev",       label: "Electric (EV)",icon: "⚡", factor: 0.05, ecoSaving: 0.32, trafficPenalty: 1.03, color: "#00FFA3", timeFactor: 1.05 },
  { id: "bike",     label: "Motorcycle",   icon: "🏍️", factor: 0.11, ecoSaving: 0.10, trafficPenalty: 1.18, color: "#F97316", timeFactor: 0.82 },
];

const ECO_DRIVING_TIME_PENALTY = 0.08;

interface RouteGeometry {
  coordinates: [number, number][];
  distance_km: number;
  duration_min: number;
  carbon_kg: number;
}

// Store raw route data separately from computed results
interface RawRouteData {
  eco: RouteGeometry;
  standard: RouteGeometry;
}

// Decode Google-style encoded polyline (used by Valhalla)
function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, byte: number;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    coords.push([lng / 1e6, lat / 1e6]); // [lon, lat] for GeoJSON
  }
  return coords;
}

// Fetch a single Valhalla route with specific costing options
async function fetchValhallaWithCosting(
  originLat: number, originLon: number,
  destLat: number, destLon: number,
  costingOptions: object
): Promise<RouteGeometry> {
  const body = JSON.stringify({
    locations: [
      { lat: originLat, lon: originLon },
      { lat: destLat, lon: destLon }
    ],
    costing: "auto",
    costing_options: { auto: costingOptions },
    units: "kilometers"
  });

  const res = await fetch(`https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(body)}`, {
    signal: AbortSignal.timeout(20000)
  });

  if (!res.ok) throw new Error(`Routing service error (${res.status})`);
  const data = await res.json();
  
  if (!data.trip?.legs?.length) {
    throw new Error('Could not find a driving route.');
  }

  return {
    coordinates: decodePolyline(data.trip.legs[0].shape),
    distance_km: data.trip.summary.length,
    duration_min: data.trip.summary.time / 60,
  };
}

// Fetch routes from EcoRoute API
async function fetchEcoRouteCompare(
  origin: { lat: number; lon: number },
  dest: { lat: number; lon: number },
  vehicle: string,
  token: string | null,
  apiUrl: string
) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${apiUrl}/v1/routes/compare`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      origin_lat: origin.lat,
      origin_lon: origin.lon,
      dest_lat: dest.lat,
      dest_lon: dest.lon,
      vehicles: [vehicle]
    }),
    signal: AbortSignal.timeout(30000) // 30s for area ingestion
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `API error (${res.status})`);
  }

  const data = await res.json();
  const compare = data.comparisons[vehicle];
  
  if (!compare || compare.error) {
    throw new Error(compare?.error || "No route found for this vehicle type.");
  }

  // Map to internal format
  return {
    eco: {
      coordinates: compare.greenest.path_coords.map((c: any) => [c.lon, c.lat]),
      distance_km: compare.greenest.total_distance_km,
      duration_min: compare.greenest.total_time_min,
      carbon_kg: compare.greenest.total_carbon_kg,
    },
    standard: {
      coordinates: compare.fastest.path_coords.map((c: any) => [c.lon, c.lat]),
      distance_km: compare.fastest.total_distance_km,
      duration_min: compare.fastest.total_time_min,
      carbon_kg: compare.fastest.total_carbon_kg,
    }
  };
}

// Fallback: OSRM (single route)
async function fetchOSRMRoute(
  originLat: number, originLon: number,
  destLat: number, destLon: number
): Promise<RouteGeometry> {
  const url = `https://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?overview=full&geometries=geojson&alternatives=true`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`OSRM error (${res.status})`);
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error('OSRM: no route found');
  return {
    coordinates: data.routes[0].geometry.coordinates,
    distance_km: data.routes[0].distance / 1000,
    duration_min: data.routes[0].duration / 60,
  };
}

export default function ComparePage() {
  const { getToken, isSignedIn } = useAuth();
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
    
    return {
      eco: {
        distance: `${rawRoutes.eco.distance_km.toFixed(1)} km`,
        duration: `${rawRoutes.eco.duration_min.toFixed(0)} min`,
        carbon: `${rawRoutes.eco.carbon_kg.toFixed(2)} kg`,
        carbonVal: rawRoutes.eco.carbon_kg,
        isEco: true,
        isFastest: rawRoutes.eco.duration_min < rawRoutes.standard.duration_min,
      },
      standard: {
        distance: `${rawRoutes.standard.distance_km.toFixed(1)} km`,
        duration: `${rawRoutes.standard.duration_min.toFixed(0)} min`,
        carbon: `${rawRoutes.standard.carbon_kg.toFixed(2)} kg`,
        carbonVal: rawRoutes.standard.carbon_kg,
        isEco: false,
        isFastest: rawRoutes.standard.duration_min <= rawRoutes.eco.duration_min,
      },
      totalDistance: rawRoutes.eco.distance_km,
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
      // 1. Geocode — try Photon first (more reliable), fallback to Nominatim
      const geocode = async (query: string) => {
        // Try Photon (Komoot) first
        try {
          const res = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`,
            { signal: AbortSignal.timeout(8000) }
          );
          if (res.ok) {
            const data = await res.json();
            if (data.features?.length > 0) {
              const [lon, lat] = data.features[0].geometry.coordinates;
              return { lat, lon };
            }
          }
        } catch (e) {
          console.warn('Photon geocoder failed, trying Nominatim:', e);
        }

        // Fallback to Nominatim
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
          { signal: AbortSignal.timeout(8000) }
        );
        if (!res.ok) throw new Error(`Geocoding failed (${res.status}). Try again.`);
        const data = await res.json();
        if (data.length === 0) throw new Error(`Location not found: "${query}". Try a more specific name.`);
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      };

      const [origin, dest] = await Promise.all([geocode(originStr), geocode(destinationStr)]);
      setOriginCoords(origin);
      setDestCoords(dest);

      // 2. Get two different routes using proprietary EcoRoute API
      const token = await getToken();
      const routes = await fetchEcoRouteCompare(origin, dest, selectedVehicle, token, API_URL);
      setRawRoutes(routes);
      toast.success("EcoRoute optimization complete!");

    } catch (err: any) {
      console.error('Route calculation error:', err);
      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        setError('Request timed out. Please check your internet and try again.');
      } else if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        setError('Network error — could not reach routing services. Check your internet connection.');
      } else {
        setError(err.message || "Failed to calculate route. Please try again.");
      }
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 min-h-[calc(100vh-5rem)] lg:h-[calc(100vh-5rem)]">
      <div className="flex flex-col lg:flex-row gap-6 h-full pb-8 lg:pb-0">
        
        {/* Left Control Panel */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4 lg:h-full lg:overflow-y-auto lg:pr-2">
          <div>
            <h1 className="text-2xl font-bold mb-1 text-[var(--text-primary)]">API Playground</h1>
            <p className="text-[var(--text-secondary)] text-xs mb-4">
              Test the EcoRoute API in real-time. Enter any two locations worldwide.
            </p>
            <SearchBar onSearch={handleSearch} isLoading={isSearching} />
          </div>

          {/* Vehicle Selector */}
          <div className="glass-panel p-3 bg-[var(--surface-glass)]">
            <h4 className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Your Vehicle</h4>
            <div className="grid grid-cols-3 gap-1.5">
              {VEHICLES.map(v => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVehicle(v.id)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all border ${
                    selectedVehicle === v.id 
                      ? 'bg-[rgba(0,255,163,0.1)] border-[var(--neon-green)] text-[var(--text-primary)] shadow-[0_0_8px_rgba(0,255,163,0.15)]' 
                      : 'bg-[var(--surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="text-sm">{v.icon}</span>
                  <span className="truncate">{v.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[9px] text-[var(--text-secondary)] mt-2">
              CO₂: <span className="text-[var(--text-primary)] font-semibold">{VEHICLES.find(v => v.id === selectedVehicle)?.factor} kg/km</span>
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
              <div className="glass-panel p-4 flex items-center justify-between bg-[var(--surface-glass)]">
                <div>
                  <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Total Distance</p>
                  <p className="text-2xl font-extrabold text-[var(--text-primary)]">{results.totalDistance.toFixed(1)} <span className="text-sm font-medium text-[var(--text-secondary)]">km</span></p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Vehicle</p>
                  <p className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-1 justify-end">
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
                  className={`cursor-pointer transition-all rounded-lg ${selectedRoute === "eco" ? "ring-2 ring-[var(--neon-green)] ring-offset-1 ring-offset-[var(--background)]" : "opacity-70 hover:opacity-100"}`}
                >
                  <RouteCard data={results.eco} />
                </div>
                <div 
                  onClick={() => setSelectedRoute("standard")} 
                  className={`cursor-pointer transition-all rounded-lg ${selectedRoute === "standard" ? "ring-2 ring-[#F97316] ring-offset-1 ring-offset-[var(--background)]" : "opacity-70 hover:opacity-100"}`}
                >
                  <RouteCard data={results.standard} />
                </div>
              </div>

              {!isSignedIn && (
                <div className="mt-4 glass-panel p-4 border-[var(--border-glow-green)] bg-[rgba(0,255,163,0.05)] animate-in fade-in slide-in-from-bottom-2 duration-700">
                  <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2">Want to automate this?</h4>
                  <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
                    Get your own **API Key** to integrate carbon-aware routing into your own software. Logged-in users get:
                  </p>
                  <ul className="text-[11px] text-[var(--text-primary)] opacity-80 space-y-2 mb-4">
                    <li className="flex items-center gap-2">
                      <span className="text-[var(--neon-green)] font-bold">✓</span> 100 free requests per day
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[var(--neon-green)] font-bold">✓</span> Personal Analytics Dashboard
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[var(--neon-green)] font-bold">✓</span> Commercial usage license
                    </li>
                  </ul>
                  <Link href="/sign-up" className="btn-primary w-full text-center py-2 text-xs block text-white">
                    Get Started for Free
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Map View */}
        <div className="w-full lg:w-2/3 h-[300px] sm:h-[400px] lg:h-full rounded-xl overflow-hidden glass-panel relative border border-[var(--border-subtle)]">
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
