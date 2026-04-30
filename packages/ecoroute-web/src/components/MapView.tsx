'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapViewProps {
  isActive: boolean;
  isSearching: boolean;
  routes?: any;
}

export default function MapView({ isActive, isSearching, routes }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'raster-tiles': {
            type: 'raster',
            tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
          }
        },
        layers: [
          {
            id: 'simple-tiles',
            type: 'raster',
            source: 'raster-tiles',
            minzoom: 0,
            maxzoom: 22
          }
        ]
      },
      center: [73.8567, 18.5204], // Pune
      zoom: 12,
      attributionControl: false
    });

    // Ensure map resizes correctly
    const resizeObserver = new ResizeObserver(() => {
      map.current?.resize();
    });
    resizeObserver.observe(mapContainer.current);

    map.current.on('load', () => {
      if (!map.current) return;

      // Add sources for routes
      map.current.addSource('eco-route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
      });

      map.current.addLayer({
        id: 'eco-route-line',
        type: 'line',
        source: 'eco-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#00FFA3',
          'line-width': 6,
          'line-opacity': 0.8
        }
      });

      map.current.addSource('std-route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
      });

      map.current.addLayer({
        id: 'std-route-line',
        type: 'line',
        source: 'std-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#94A3B8',
          'line-width': 4,
          'line-dasharray': [2, 2],
          'line-opacity': 0.5
        }
      });

      // Markers
      const elOrigin = document.createElement('div');
      elOrigin.className = 'w-4 h-4 rounded-full bg-white border-2 border-slate-400 shadow-lg';
      const markerOrigin = new maplibregl.Marker(elOrigin).setLngLat([0, 0]).addTo(map.current);

      const elDest = document.createElement('div');
      elDest.className = 'w-4 h-4 rounded-full bg-[#00FFA3] border-2 border-black shadow-lg';
      const markerDest = new maplibregl.Marker(elDest).setLngLat([0, 0]).addTo(map.current);

      (map.current as any)._markers = { origin: markerOrigin, dest: markerDest };
    });

    return () => {
      resizeObserver.disconnect();
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!map.current || !routes) return;

    const updateRoute = (type: string, sourceId: string) => {
      if (!map.current || !routes[type] || !routes[type].path_coords) return null;
      
      const coords = routes[type].path_coords.map((p: any) => [p.lon, p.lat]);
      const source = map.current.getSource(sourceId) as maplibregl.GeoJSONSource;
      if (source) {
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coords }
        });
      }
      return coords;
    };

    const ecoCoords = updateRoute('greenest', 'eco-route');
    updateRoute('fastest', 'std-route');

    if (ecoCoords && ecoCoords.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      ecoCoords.forEach((c: any) => bounds.extend(c as [number, number]));
      map.current.fitBounds(bounds, { padding: 50, duration: 2000 });

      // Update markers
      const markers = (map.current as any)._markers;
      if (markers) {
        markers.origin.setLngLat(ecoCoords[0]);
        markers.dest.setLngLat(ecoCoords[ecoCoords.length - 1]);
      }
    }
  }, [routes]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="w-full h-full absolute inset-0" />
      
      {isSearching && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--surface-glass)] backdrop-blur-sm">
          <div className="w-16 h-16 rounded-full border-4 border-[var(--border-subtle)] border-t-[var(--neon-green)] animate-spin"></div>
          <p className="mt-4 text-[var(--neon-green)] font-semibold tracking-wider text-sm animate-pulse">ANALYZING TOPOLOGY...</p>
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-10 glass-panel p-2 px-3 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest border border-white/5">
        Live Routing Engine • MapLibre GL
      </div>
    </div>
  );
}