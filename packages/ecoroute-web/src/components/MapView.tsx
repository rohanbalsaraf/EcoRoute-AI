'use client';

import { useEffect, useRef } from 'react';
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

export default function MapView({ isActive, isSearching, routeGeometries, originCoords, destCoords, selectedRoute = "eco" }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ origin: maplibregl.Marker | null; dest: maplibregl.Marker | null }>({ origin: null, dest: null });
  const mapReady = useRef(false);

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
          id: 'osm-tiles',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19
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

  // Update route data on map
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

    // Fit bounds to BOTH routes
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

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="w-full h-full absolute inset-0" />
      
      {isSearching && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-16 h-16 rounded-full border-4 border-gray-600 border-t-[#00FFA3] animate-spin"></div>
          <p className="mt-4 text-[#00FFA3] font-semibold tracking-wider text-sm animate-pulse">CALCULATING ROUTES...</p>
        </div>
      )}

      {/* Route Legend */}
      {routeGeometries && (
        <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-sm px-3 py-2.5 rounded-lg shadow-lg text-[11px]">
          <p className="font-bold text-gray-800 text-[10px] uppercase tracking-wider mb-1.5">Routes</p>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-1 rounded-full bg-[#00FFA3]"></div>
            <span className="text-gray-700 font-medium">Eco-Friendly</span>
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-5 h-1 rounded-full bg-[#F97316]"></div>
            <span className="text-gray-700 font-medium">Standard</span>
          </div>
          <div className="border-t border-gray-200 pt-1.5 mt-1">
            <p className="font-bold text-gray-800 text-[10px] uppercase tracking-wider mb-1">Traffic</p>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-gray-600 text-[10px]">Light</span>
              <div className="w-2 h-2 rounded-full bg-yellow-500 ml-1"></div>
              <span className="text-gray-600 text-[10px]">Moderate</span>
              <div className="w-2 h-2 rounded-full bg-red-500 ml-1"></div>
              <span className="text-gray-600 text-[10px]">Heavy</span>
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