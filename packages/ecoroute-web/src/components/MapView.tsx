'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapViewProps {
  isActive: boolean;
  isSearching: boolean;
  routeGeometries?: { eco: [number, number][]; standard: [number, number][] } | null;
  originCoords?: { lat: number; lon: number } | null;
  destCoords?: { lat: number; lon: number } | null;
  selectedRoute?: "eco" | "standard";
}

// POI categories with emoji icons and Overpass tags
const POI_CATEGORIES = [
  { id: 'fuel',     label: 'Fuel',       emoji: '⛽', query: 'amenity=fuel' },
  { id: 'hospital', label: 'Hospital',   emoji: '🏥', query: 'amenity=hospital' },
  { id: 'cafe',     label: 'Café',       emoji: '☕', query: 'amenity=cafe' },
  { id: 'hotel',    label: 'Hotel',      emoji: '🏨', query: 'tourism=hotel' },
  { id: 'shop',     label: 'Shop',       emoji: '🛒', query: 'shop=supermarket' },
  { id: 'cinema',   label: 'Cinema',     emoji: '🎬', query: 'amenity=cinema' },
];

async function fetchPOIs(center: {lat: number, lng: number}, categories: string[]): Promise<any[]> {
  // Query within ~5km radius of the map center
  const radius = 5000; // meters
  
  const filters = categories
    .map(catId => {
      const cat = POI_CATEGORIES.find(c => c.id === catId);
      if (!cat) return '';
      const [key, val] = cat.query.split('=');
      return `node["${key}"="${val}"](around:${radius},${center.lat},${center.lng});`;
    })
    .join('\n');

  const query = `[out:json][timeout:15];(${filters});out body 50;`;
  
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Overpass error ${res.status}`);
    const data = await res.json();
    return data.elements || [];
  } catch (e) {
    console.warn('POI fetch failed:', e);
    return [];
  }
}

function getPoiEmoji(tags: any): string {
  if (tags.amenity === 'fuel') return '⛽';
  if (tags.amenity === 'hospital') return '🏥';
  if (tags.amenity === 'cafe') return '☕';
  if (tags.tourism === 'hotel') return '🏨';
  if (tags.shop === 'supermarket') return '🛒';
  if (tags.amenity === 'cinema') return '🎬';
  return '📍';
}

export default function MapView({ isActive, isSearching, routeGeometries, originCoords, destCoords, selectedRoute = "eco" }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ origin: maplibregl.Marker | null; dest: maplibregl.Marker | null }>({ origin: null, dest: null });
  const poiMarkersRef = useRef<maplibregl.Marker[]>([]);
  const mapReady = useRef(false);
  const [activePOIs, setActivePOIs] = useState<string[]>([]);
  const [poiLoading, setPOILoading] = useState(false);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors'
          }
        },
        layers: [{
          id: 'osm-tiles', type: 'raster', source: 'osm-tiles',
          minzoom: 0, maxzoom: 19
        }]
      },
      center: [0, 20],
      zoom: 2,
      attributionControl: false
    });

    const resizeObserver = new ResizeObserver(() => map.current?.resize());
    resizeObserver.observe(mapContainer.current);

    map.current.on('load', () => {
      if (!map.current) return;
      mapReady.current = true;

      // Standard route (underneath)
      map.current.addSource('std-route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
      });
      map.current.addLayer({
        id: 'std-route-glow', type: 'line', source: 'std-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#F97316', 'line-width': 14, 'line-opacity': 0.15, 'line-blur': 8 }
      });
      map.current.addLayer({
        id: 'std-route-line', type: 'line', source: 'std-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#F97316', 'line-width': 5, 'line-opacity': 0.8 }
      });

      // Eco route (on top)
      map.current.addSource('eco-route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
      });
      map.current.addLayer({
        id: 'eco-route-glow', type: 'line', source: 'eco-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#00FFA3', 'line-width': 14, 'line-opacity': 0.15, 'line-blur': 8 }
      });
      map.current.addLayer({
        id: 'eco-route-line', type: 'line', source: 'eco-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#00FFA3', 'line-width': 5, 'line-opacity': 0.9 }
      });

      // Markers
      const originEl = document.createElement('div');
      originEl.innerHTML = '<div style="width:18px;height:18px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>';
      markersRef.current.origin = new maplibregl.Marker({ element: originEl, anchor: 'center' });

      const destEl = document.createElement('div');
      destEl.innerHTML = '<div style="width:18px;height:18px;border-radius:50%;background:#EF4444;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>';
      markersRef.current.dest = new maplibregl.Marker({ element: destEl, anchor: 'center' });
    });

    return () => {
      resizeObserver.disconnect();
      map.current?.remove();
      map.current = null;
      mapReady.current = false;
    };
  }, []);

  // Render routes
  useEffect(() => {
    if (!map.current || !mapReady.current || !routeGeometries) return;

    const ecoSource = map.current.getSource('eco-route') as maplibregl.GeoJSONSource;
    if (ecoSource) {
      ecoSource.setData({
        type: 'Feature', properties: {},
        geometry: { type: 'LineString', coordinates: routeGeometries.eco }
      });
    }

    const stdSource = map.current.getSource('std-route') as maplibregl.GeoJSONSource;
    if (stdSource) {
      stdSource.setData({
        type: 'Feature', properties: {},
        geometry: { type: 'LineString', coordinates: routeGeometries.standard }
      });
    }

    if (originCoords && destCoords) {
      const bounds = new maplibregl.LngLatBounds();
      routeGeometries.eco.forEach(c => bounds.extend(c as [number, number]));
      routeGeometries.standard.forEach(c => bounds.extend(c as [number, number]));
      map.current.fitBounds(bounds, { padding: 60, duration: 1500 });

      if (markersRef.current.origin) {
        markersRef.current.origin.setLngLat([originCoords.lon, originCoords.lat]).addTo(map.current!);
      }
      if (markersRef.current.dest) {
        markersRef.current.dest.setLngLat([destCoords.lon, destCoords.lat]).addTo(map.current!);
      }
    }
  }, [routeGeometries, originCoords, destCoords]);

  // Highlight selected route
  useEffect(() => {
    if (!map.current || !mapReady.current) return;
    const isEco = selectedRoute === "eco";
    
    map.current.setPaintProperty('eco-route-line', 'line-width', isEco ? 6 : 3);
    map.current.setPaintProperty('eco-route-line', 'line-opacity', isEco ? 1 : 0.4);
    map.current.setPaintProperty('eco-route-glow', 'line-opacity', isEco ? 0.2 : 0.05);
    
    map.current.setPaintProperty('std-route-line', 'line-width', !isEco ? 6 : 3);
    map.current.setPaintProperty('std-route-line', 'line-opacity', !isEco ? 1 : 0.4);
    map.current.setPaintProperty('std-route-glow', 'line-opacity', !isEco ? 0.2 : 0.05);
  }, [selectedRoute]);

  // Load POIs when categories change or map moves
  useEffect(() => {
    // Clear existing POI markers
    poiMarkersRef.current.forEach(m => m.remove());
    poiMarkersRef.current = [];

    if (!map.current || !mapReady.current || activePOIs.length === 0 || !routeGeometries) return;

    let cancelled = false;

    const loadPOIs = async () => {
      if (!map.current || cancelled) return;
      setPOILoading(true);
      const center = map.current.getCenter();
      const pois = await fetchPOIs({ lat: center.lat, lng: center.lng }, activePOIs);
      
      if (cancelled || !map.current) return;

      // Clear old markers before adding new ones
      poiMarkersRef.current.forEach(m => m.remove());
      poiMarkersRef.current = [];
      
      pois.forEach(poi => {
        if (!poi.lat || !poi.lon || !map.current) return;
        
        const emoji = getPoiEmoji(poi.tags || {});
        const name = poi.tags?.name || '';
        
        const el = document.createElement('div');
        el.style.cssText = 'cursor:pointer;font-size:20px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.5));transition:transform 0.2s;';
        el.textContent = emoji;
        el.title = name;
        el.onmouseenter = () => { el.style.transform = 'scale(1.4)'; };
        el.onmouseleave = () => { el.style.transform = 'scale(1)'; };
        
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([poi.lon, poi.lat]);
        
        if (name) {
          marker.setPopup(new maplibregl.Popup({ offset: 15, closeButton: false })
            .setHTML(`<div style="font-size:12px;font-weight:600;padding:4px 8px;">${emoji} ${name}</div>`));
        }
        
        marker.addTo(map.current!);
        poiMarkersRef.current.push(marker);
      });
      
      setPOILoading(false);
    };

    // Load immediately
    loadPOIs();

    // Re-load when user pans/zooms
    const onMoveEnd = () => { loadPOIs(); };
    map.current.on('moveend', onMoveEnd);

    return () => {
      cancelled = true;
      map.current?.off('moveend', onMoveEnd);
    };
  }, [activePOIs, routeGeometries]);

  const togglePOI = (catId: string) => {
    setActivePOIs(prev => 
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="w-full h-full absolute inset-0" />
      
      {isSearching && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-16 h-16 rounded-full border-4 border-gray-600 border-t-[#00FFA3] animate-spin"></div>
          <p className="mt-4 text-[#00FFA3] font-semibold tracking-wider text-sm animate-pulse">CALCULATING ROUTES...</p>
        </div>
      )}

      {/* Route Legend + POI Toggles */}
      {routeGeometries && (
        <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-sm px-3 py-2.5 rounded-lg shadow-lg text-[11px] max-w-[180px]">
          <p className="font-bold text-gray-800 text-[10px] uppercase tracking-wider mb-1.5">Routes</p>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-1 rounded-full bg-[#00FFA3]"></div>
            <span className="text-gray-700 font-medium">Eco-Friendly</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-1 rounded-full bg-[#F97316]"></div>
            <span className="text-gray-700 font-medium">Standard</span>
          </div>
          
          {/* POI Toggles */}
          <div className="border-t border-gray-200 pt-2">
            <p className="font-bold text-gray-800 text-[10px] uppercase tracking-wider mb-1.5 flex items-center gap-1">
              Nearby Places
              {poiLoading && <span className="inline-block w-2.5 h-2.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>}
            </p>
            <div className="grid grid-cols-3 gap-1">
              {POI_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => togglePOI(cat.id)}
                  title={cat.label}
                  className={`flex flex-col items-center py-1 rounded text-[10px] transition-all ${
                    activePOIs.includes(cat.id)
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-base">{cat.emoji}</span>
                  <span className="leading-tight mt-0.5">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-3 z-10 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-md text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
        EcoRoute • MapLibre GL + OSRM
      </div>
    </div>
  );
}