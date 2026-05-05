'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from 'next-themes';

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
  const { theme, resolvedTheme } = useTheme();

  const getStyle = (currentTheme: string) => 
    currentTheme === 'dark' 
      ? 'https://tiles.openfreemap.org/styles/dark' 
      : 'https://tiles.openfreemap.org/styles/positron';

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: getStyle(resolvedTheme || 'dark'),
      center: [0, 20],
      zoom: 2,
      attributionControl: false
    });

    const resizeObserver = new ResizeObserver(() => map.current?.resize());
    resizeObserver.observe(mapContainer.current);

    map.current.on('load', () => {
      if (!map.current) return;
      mapReady.current = true;
      setupLayers();
      
      // Initial color injection
      if (resolvedTheme === 'dark') {
        injectDarkColors();
      }
    });

    return () => {
      resizeObserver.disconnect();
      map.current?.remove();
      map.current = null;
      mapReady.current = false;
    };
  }, []);

  const injectDarkColors = () => {
    if (!map.current) return;
    try {
      // Inject rich colors into the "dark" style
      map.current.setPaintProperty('water', 'fill-color', '#1e293b'); // Deep Navy
      map.current.setPaintProperty('landuse_park', 'fill-color', '#064e3b'); // Forest Green
      map.current.setPaintProperty('landcover_wood', 'fill-color', '#064e3b');
      map.current.setPaintProperty('building', 'fill-color', '#111111'); // Dark building
    } catch (e) {
      // Layers might not exist in all styles
    }
  };

  const setupLayers = () => {
    if (!map.current) return;
    const isDark = resolvedTheme === 'dark';
    const ecoColor = isDark ? '#00FFA3' : '#059669'; // Darker green for light mode
    const stdColor = isDark ? '#F97316' : '#EA580C'; // Darker orange for light mode
    
    // Standard route (underneath, dashed)
    if (!map.current.getSource('std-route')) {
      map.current.addSource('std-route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
      });
    }
    
    ['std-route-line', 'eco-route-glow', 'eco-route-line'].forEach(id => {
      if (map.current?.getLayer(id)) map.current.removeLayer(id);
    });

    map.current.addLayer({
      id: 'std-route-line', type: 'line', source: 'std-route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 
        'line-color': isDark ? '#64748b' : '#94a3b8', 
        'line-width': 4, 
        'line-opacity': 0.6,
        'line-dasharray': [2, 2] 
      }
    });

    // Eco route (on top, solid glow)
    if (!map.current.getSource('eco-route')) {
      map.current.addSource('eco-route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
      });
    }
    map.current.addLayer({
      id: 'eco-route-glow', type: 'line', source: 'eco-route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#00FFA3', 'line-width': 12, 'line-opacity': 0.2, 'line-blur': 8 }
    });
    map.current.addLayer({
      id: 'eco-route-line', type: 'line', source: 'eco-route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#00FFA3', 'line-width': 6, 'line-opacity': 1.0 }
    });

    // Markers
    if (!markersRef.current.origin) {
      const originEl = document.createElement('div');
      originEl.innerHTML = '<div style="width:18px;height:18px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>';
      markersRef.current.origin = new maplibregl.Marker({ element: originEl, anchor: 'center' });
    }

    if (!markersRef.current.dest) {
      const destEl = document.createElement('div');
      destEl.innerHTML = '<div style="width:18px;height:18px;border-radius:50%;background:#EF4444;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>';
      markersRef.current.dest = new maplibregl.Marker({ element: destEl, anchor: 'center' });
    }
  };

  // Sync theme
  useEffect(() => {
    if (!map.current || !mapReady.current) return;
    
    const currentTheme = resolvedTheme || 'dark';
    
    // Listen for style load before re-adding everything
    const handleStyleLoad = () => {
      if (currentTheme === 'dark') {
        injectDarkColors();
      }
      setupLayers();
      if (routeGeometries) {
        updateRouteData(routeGeometries);
      }
    };

    map.current.setStyle(getStyle(currentTheme));
    map.current.once('styledata', handleStyleLoad);
    
    return () => {
      map.current?.off('styledata', handleStyleLoad);
    };
  }, [resolvedTheme]);

  const updateRouteData = (geoms: { eco: [number, number][]; standard: [number, number][] }) => {
    if (!map.current || !mapReady.current) return;
    const ecoSource = map.current.getSource('eco-route') as maplibregl.GeoJSONSource;
    if (ecoSource) ecoSource.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: geoms.eco } });
    
    const stdSource = map.current.getSource('std-route') as maplibregl.GeoJSONSource;
    if (stdSource) stdSource.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: geoms.standard } });

    if (originCoords && destCoords) {
      if (markersRef.current.origin) markersRef.current.origin.setLngLat([originCoords.lon, originCoords.lat]).addTo(map.current);
      if (markersRef.current.dest) markersRef.current.dest.setLngLat([destCoords.lon, destCoords.lat]).addTo(map.current);
    }
  };

  useEffect(() => {
    if (!routeGeometries) return;
    updateRouteData(routeGeometries);
    
    if (originCoords && destCoords && map.current) {
      const bounds = new maplibregl.LngLatBounds();
      routeGeometries.eco.forEach(c => bounds.extend(c as [number, number]));
      routeGeometries.standard.forEach(c => bounds.extend(c as [number, number]));
      map.current.fitBounds(bounds, { padding: 60, duration: 1500 });
    }
  }, [routeGeometries, originCoords, destCoords]);

  // Highlight selected route
  useEffect(() => {
    if (!map.current || !mapReady.current) return;
    const isEco = selectedRoute === "eco";
    try {
      map.current.setPaintProperty('eco-route-line', 'line-width', isEco ? 8 : 4);
      map.current.setPaintProperty('eco-route-line', 'line-opacity', isEco ? 1 : 0.3);
      map.current.setPaintProperty('eco-route-glow', 'line-opacity', isEco ? 0.25 : 0);
      
      map.current.setPaintProperty('std-route-line', 'line-width', !isEco ? 8 : 4);
      map.current.setPaintProperty('std-route-line', 'line-opacity', !isEco ? 0.9 : 0.3);
    } catch (e) {
      // Layers might be missing during style transition
    }
  }, [selectedRoute, resolvedTheme]);

  // Load POIs when categories change or map moves
  useEffect(() => {
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
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([poi.lon, poi.lat]);
        if (name) marker.setPopup(new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(`<div style="font-size:12px;font-weight:600;padding:4px 8px;background:var(--surface);color:var(--text-primary);border:1px solid var(--border-subtle);border-radius:4px;">${emoji} ${name}</div>`));
        marker.addTo(map.current!);
        poiMarkersRef.current.push(marker);
      });
      setPOILoading(false);
    };
    loadPOIs();
    const onMoveEnd = () => { loadPOIs(); };
    map.current.on('moveend', onMoveEnd);
    return () => {
      cancelled = true;
      map.current?.off('moveend', onMoveEnd);
    };
  }, [activePOIs, routeGeometries]);

  const togglePOI = (catId: string) => {
    setActivePOIs(prev => prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]);
  };

  return (
    <div className="w-full h-full relative bg-[var(--surface)]">
      <div ref={mapContainer} className="w-full h-full absolute inset-0" />
      
      {isSearching && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--background)] opacity-60 backdrop-blur-sm">
          <div className="w-16 h-16 rounded-full border-4 border-[var(--border-subtle)] border-t-[var(--neon-green)] animate-spin"></div>
          <p className="mt-4 text-[var(--neon-green)] font-semibold tracking-widest text-xs animate-pulse uppercase">Optimizing Routes...</p>
        </div>
      )}

      {/* Route Legend + POI Toggles */}
      {routeGeometries && (
        <div className="absolute top-3 right-3 z-10 glass-panel bg-[var(--surface-glass)] px-3 py-2.5 shadow-lg text-[11px] max-w-[180px]">
          <p className="font-bold text-[var(--text-primary)] text-[10px] uppercase tracking-wider mb-1.5">Routes</p>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-1 rounded-full bg-[#00FFA3]"></div>
            <span className="text-[var(--text-secondary)] font-medium">Eco-Friendly</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-1 rounded-full bg-[#F97316]"></div>
            <span className="text-[var(--text-secondary)] font-medium">Standard</span>
          </div>
          
          {/* POI Toggles */}
          <div className="border-t border-[var(--border-subtle)] pt-2">
            <p className="font-bold text-[var(--text-primary)] text-[10px] uppercase tracking-wider mb-1.5 flex items-center gap-1">
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
                      ? 'bg-[rgba(123,97,255,0.1)] text-[var(--neon-purple)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface)]'
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

      <div className="absolute bottom-3 left-3 z-10 glass-panel bg-[var(--surface-glass)] px-3 py-1.5 shadow-md text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
        <span>EcoRoute</span>
        <span className="opacity-40">•</span>
        <span>MapLibre GL</span>
        <span className="opacity-40">•</span>
        <span>OpenFreeMap</span>
        <span className="opacity-40">•</span>
        <span>OSRM</span>
      </div>
    </div>
  );
}