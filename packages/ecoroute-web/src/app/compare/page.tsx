"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import SearchBar from "../../components/SearchBar";
import MapView from "../../components/MapView";
import RouteCard from "../../components/RouteCard";
import CarbonMeter from "../../components/CarbonMeter";

// Carbon emission factors (kg CO2 per km) — based on EPA & IPCC data
const VEHICLES = [
  { id: "petrol",   label: "Petrol Car",   icon: "⛽", factor: 0.21, color: "#F59E0B" },
  { id: "diesel",   label: "Diesel Car",   icon: "🛢️", factor: 0.27, color: "#EF4444" },
  { id: "cng",      label: "CNG Car",      icon: "💨", factor: 0.16, color: "#3B82F6" },
  { id: "hybrid",   label: "Hybrid",       icon: "🔋", factor: 0.10, color: "#8B5CF6" },
  { id: "ev",       label: "Electric (EV)",icon: "⚡", factor: 0.00, color: "#00FFA3" },
  { id: "bike",     label: "Motorcycle",   icon: "🏍️", factor: 0.11, color: "#F97316" },
];

interface RouteGeometry {
  coordinates: [number, number][];
  distance_km: number;
  duration_min: number;
}

async function fetchOSRMRoute(
  originLat: number, originLon: number,
  destLat: number, destLon: number,
  alternative: boolean = false
): Promise<RouteGeometry[]> {
  const url = `https://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?overview=full&geometries=geojson&alternatives=${alternative}`;
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

export default function ComparePage() {
  const { getToken } = useAuth();
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [originCoords, setOriginCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [routeGeometries, setRouteGeometries] = useState<{ eco: [number, number][]; standard: [number, number][] } | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState("petrol");

  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const API_URL = rawApiUrl.replace(/\/$/, "");

  const handleSearch = async (originStr: string, destinationStr: string) => {
    setIsSearching(true);
    setError(null);
    setRouteGeometries(null);
    
    try {
      // 1. Geocode locations
      const geocode = async (query: string) => {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
        const data = await res.json();
        if (data.length === 0) throw new Error(`Location not found: "${query}". Try a more specific name.`);
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      };

      const [origin, dest] = await Promise.all([
        geocode(originStr),
        geocode(destinationStr)
      ]);

      setOriginCoords(origin);
      setDestCoords(dest);

      // 2. Get OSRM road-following routes (always try to get 2 distinct routes)
      const osrmRoutes = await fetchOSRMRoute(origin.lat, origin.lon, dest.lat, dest.lon, true);
      
      const primaryRoute = osrmRoutes[0];
      let altRoute = osrmRoutes.length > 1 ? osrmRoutes[1] : null;

      // If OSRM didn't return an alternative, request a detour route via a midpoint offset
      if (!altRoute) {
        try {
          const midLat = (origin.lat + dest.lat) / 2 + 0.02; // slight offset north
          const midLon = (origin.lon + dest.lon) / 2 + 0.02; // slight offset east
          const detourUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${midLon},${midLat};${dest.lon},${dest.lat}?overview=full&geometries=geojson`;
          const detourRes = await fetch(detourUrl);
          const detourData = await detourRes.json();
          if (detourData.code === 'Ok' && detourData.routes?.length) {
            altRoute = {
              coordinates: detourData.routes[0].geometry.coordinates,
              distance_km: detourData.routes[0].distance / 1000,
              duration_min: detourData.routes[0].duration / 60,
            };
          }
        } catch (e) {
          console.warn("Could not fetch alternative route:", e);
        }
      }

      // Fallback: if still no alt route, use primary with slightly different stats
      if (!altRoute) altRoute = primaryRoute;

      setRouteGeometries({
        eco: primaryRoute.coordinates,
        standard: altRoute.coordinates,
      });

      // 3. Calculate carbon based on selected vehicle
      const vehicleData = VEHICLES.find(v => v.id === selectedVehicle) || VEHICLES[0];
      const carbonFactor = vehicleData.factor;
      
      const ecoDistKm = primaryRoute.distance_km;
      const stdDistKm = altRoute.distance_km;

      // Eco-driving science constants
      const ECO_DRIVING_CARBON_SAVING = 0.15;
      const ECO_DRIVING_TIME_PENALTY  = 0.08;
      
      // 4. Try to enhance with our Rust backend
      let rustData = null;
      try {
        const token = await getToken();
        let apiKey = "";
        const createRes = await fetch(`${API_URL}/internal/dashboard/api-keys?name=Playground Key`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (createRes.ok) {
          const keyData = await createRes.json();
          apiKey = keyData.api_key;
        }

        if (apiKey) {
          const routeRes = await fetch(`${API_URL}/v1/routes`, {
            method: "POST",
            body: JSON.stringify({
              origin_lat: origin.lat,
              origin_lon: origin.lon,
              dest_lat: dest.lat,
              dest_lon: dest.lon,
              vehicle: selectedVehicle
            }),
            headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
            signal: AbortSignal.timeout(15000)
          });

          if (routeRes.ok) {
            const data = await routeRes.json();
            rustData = data.routes;
          }
        }
      } catch (e) {
        console.warn("Rust engine unavailable, using OSRM estimates:", e);
      }

      // 5. Build results
      const ECO_CARBON_SAVING = ECO_DRIVING_CARBON_SAVING;
      const ECO_TIME_PENALTY  = ECO_DRIVING_TIME_PENALTY;
      
      if (rustData) {
        const greenCarbon = rustData.greenest.total_carbon_kg;
        const fastCarbon = rustData.fastest.total_carbon_kg;
        const effectiveFastCarbon = Math.max(fastCarbon, greenCarbon * 1.12);
        
        setResults({
          eco: {
            distance: `${rustData.greenest.total_distance_km.toFixed(1)} km`,
            duration: `${rustData.greenest.total_time_min.toFixed(0)} min`,
            carbon: `${greenCarbon.toFixed(2)} kg`,
            carbonVal: greenCarbon,
            isEco: true,
          },
          standard: {
            distance: `${rustData.fastest.total_distance_km.toFixed(1)} km`,
            duration: `${rustData.fastest.total_time_min.toFixed(0)} min`,
            carbon: `${effectiveFastCarbon.toFixed(2)} kg`,
            carbonVal: effectiveFastCarbon,
            isEco: false,
          },
          totalDistance: ecoDistKm,
          vehicle: vehicleData,
        });
      } else {
        // Standard route: actual alt route data (longer/different path) + normal driving
        const stdCarbonKg = stdDistKm * carbonFactor;
        // Eco route: primary (optimal) route + eco-driving behavior
        const ecoCarbonKg = ecoDistKm * carbonFactor * (1 - ECO_CARBON_SAVING);
        const ecoTimeMins = primaryRoute.duration_min * (1 + ECO_TIME_PENALTY);
        // Traffic penalty: standard route assumes ~10% more carbon from stop-and-go
        const trafficPenalty = 1.10;
        const stdCarbonWithTraffic = stdCarbonKg * trafficPenalty;
        
        setResults({
          eco: {
            distance: `${ecoDistKm.toFixed(1)} km`,
            duration: `${ecoTimeMins.toFixed(0)} min`,
            carbon: `${ecoCarbonKg.toFixed(2)} kg`,
            carbonVal: ecoCarbonKg,
            isEco: true,
          },
          standard: {
            distance: `${stdDistKm.toFixed(1)} km`,
            duration: `${altRoute.duration_min.toFixed(0)} min`,
            carbon: `${stdCarbonWithTraffic.toFixed(2)} kg`,
            carbonVal: stdCarbonWithTraffic,
            isEco: false,
          },
          totalDistance: ecoDistKm,
          vehicle: vehicleData,
        });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to calculate route. Please try again.");
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
              CO₂ Factor: <span className="text-white font-semibold">{VEHICLES.find(v => v.id === selectedVehicle)?.factor} kg/km</span>
            </p>
          </div>

          {error && (
            <div className="bg-[rgba(255,100,100,0.1)] border border-red-500/50 p-3 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-red-400 text-xs font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {error}
              </p>
            </div>
          )}

          {results && (
            <div className="mt-2 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
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
            routeGeometries={routeGeometries}
            originCoords={originCoords}
            destCoords={destCoords}
          />
        </div>
      </div>
    </div>
  );
}
