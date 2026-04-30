'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapViewProps {
  isActive: boolean;
  isSearching: boolean;
  routes?: any;
  originCoords?: { lat: number; lon: number } | null;
  destCoords?: { lat: number; lon: number } | null;
}

async function fetchRoadGeometry(coords: [number, number][]): Promise<[number, number][]> {
  // Use OSRM demo server for road-snapped geometry
  // coords = array of [lon, lat]
  if (coords.length < 2) return coords;

  const start = coords[0];
  const end = coords[coords.length - 1];

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      return data.routes[0].geometry.coordinates;
    }
  } catch (e) {
    console.warn('OSRM fallback to straight lines:', e);
  }

  // Fallback: return original straight-line coords
  return coords;
}

export default function MapView({ isActive, isSearching, routes, originCoords, destCoords }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ origin: maplibregl.Marker | null; dest: maplibregl.Marker | null }>({ origin: null, dest: null });

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'raster-tiles': {
            type: 'raster',
            tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png'],
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
      center: [73.8567, 18.5204],
      zoom: 12,
      attributionControl: false
    });

    const resizeObserver = new ResizeObserver(() => {
      map.current?.resize();
    });
    resizeObserver.observe(mapContainer.current);

    map.current.on('load', () => {
      if (!map.current) return;

      // Eco route — road-snapped
      map.current.addSource('eco-route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
      });
      map.current.addLayer({
        id: 'eco-route-glow',
        type: 'line',
        source: 'eco-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#00FFA3', 'line-width': 12, 'line-opacity': 0.15, 'line-blur': 6 }
      });
      map.current.addLayer({
        id: 'eco-route-line',
        type: 'line',
        source: 'eco-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#00FFA3', 'line-width': 5, 'line-opacity': 0.9 }
      });

      // Standard route — road-snapped
      map.current.addSource('std-route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
      });
      map.current.addLayer({
        id: 'std-route-line',
        type: 'line',
        source: 'std-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#F97316', 'line-width': 4, 'line-dasharray': [2, 2], 'line-opacity': 0.6 }
      });

      // Origin marker
      const elOrigin = document.createElement('div');
      elOrigin.innerHTML = `<div style="width:20px;height:20px;border-radius:50%;background:white;border:3px solid #3B82F6;box-shadow:0 0 10px rgba(59,130,246,0.5);"></div>`;
      markersRef.current.origin = new maplibregl.Marker({ element: elOrigin, anchor: 'center' });

      // Dest marker
      const elDest = document.createElement('div');
      elDest.innerHTML = `<div style="width:20px;height:20px;border-radius:50%;background:#00FFA3;border:3px solid #000;box-shadow:0 0 10px rgba(0,255,163,0.5);"></div>`;
      markersRef.current.dest = new maplibregl.Marker({ element: elDest, anchor: 'center' });
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

    const renderRoutes = async () => {
      if (!map.current) return;

      // Get the first and last coordinates for each route type
      for (const [type, sourceId] of [['greenest', 'eco-route'], ['fastest', 'std-route']] as const) {
        if (!routes[type] || !routes[type].path_coords || routes[type].path_coords.length < 2) continue;

        const pathCoords = routes[type].path_coords;
        const rawCoords: [number, number][] = pathCoords.map((p: any) => [p.lon, p.lat]);

        // Fetch real road geometry from OSRM
        const roadCoords = await fetchRoadGeometry(rawCoords);

        const source = map.current?.getSource(sourceId) as maplibregl.GeoJSONSource;
        if (source) {
          source.setData({
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: roadCoords }
          });
        }
      }

      // Fit bounds to the eco route
      if (routes.greenest?.path_coords?.length > 0 && originCoords && destCoords) {
        const bounds = new maplibregl.LngLatBounds();
        bounds.extend([originCoords.lon, originCoords.lat]);
        bounds.extend([destCoords.lon, destCoords.lat]);
        map.current?.fitBounds(bounds, { padding: 80, duration: 2000 });

        // Update markers
        if (markersRef.current.origin && map.current) {
          markersRef.current.origin.setLngLat([originCoords.lon, originCoords.lat]).addTo(map.current);
        }
        if (markersRef.current.dest && map.current) {
          markersRef.current.dest.setLngLat([destCoords.lon, destCoords.lat]).addTo(map.current);
        }
      }
    };

    renderRoutes();
  }, [routes, originCoords, destCoords]);

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
        Live Routing Engine • MapLibre GL + OSRM
      </div>
    </div>
  );
}