'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  isActive: boolean;
  isSearching: boolean;
  routes?: any;
}

export default function MapView({ isActive, isSearching, routes }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const ecoLayer = useRef<L.Polyline | null>(null);
  const stdLayer = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    // Initialize Leaflet map
    map.current = L.map(mapContainer.current, {
      center: [18.5204, 73.8567], // Pune
      zoom: 12,
      zoomControl: false,
      attributionControl: false
    });

    // Add Premium Dark Tiles (Free, no key required)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map.current);

    // Add a custom zoom control in a better position
    L.control.zoom({ position: 'bottomright' }).addTo(map.current);

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!map.current || !routes) return;

    // Clear existing layers
    if (ecoLayer.current) map.current.removeLayer(ecoLayer.current);
    if (stdLayer.current) map.current.removeLayer(stdLayer.current);

    // Draw Standard Route (Dashed Gray)
    if (routes.fastest && routes.fastest.path_coords) {
      const stdPoints = routes.fastest.path_coords.map((p: any) => [p.lat, p.lon] as L.LatLngExpression);
      stdLayer.current = L.polyline(stdPoints, {
        color: '#64748B',
        weight: 4,
        dashArray: '8, 12',
        opacity: 0.6
      }).addTo(map.current);
    }

    // Draw Eco Route (Solid Neon Green)
    if (routes.greenest && routes.greenest.path_coords) {
      const ecoPoints = routes.greenest.path_coords.map((p: any) => [p.lat, p.lon] as L.LatLngExpression);
      ecoLayer.current = L.polyline(ecoPoints, {
        color: '#00FFA3',
        weight: 6,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map.current);

      // Add simple circles as markers for start and end
      const start = ecoPoints[0];
      const end = ecoPoints[ecoPoints.length - 1];

      L.circleMarker(start, {
        radius: 8,
        fillColor: '#FFFFFF',
        color: '#94A3B8',
        weight: 2,
        fillOpacity: 1
      }).addTo(map.current);

      L.circleMarker(end, {
        radius: 8,
        fillColor: '#00FFA3',
        color: '#000000',
        weight: 2,
        fillOpacity: 1
      }).addTo(map.current);

      // Fit bounds to the eco route
      map.current.fitBounds(ecoLayer.current.getBounds(), {
        padding: [50, 50],
        animate: true,
        duration: 1.5
      });
    }
  }, [routes]);

  return (
    <div className="w-full h-full relative bg-[#0A0B10]">
      <div ref={mapContainer} className="absolute inset-0 z-0" />
      
      {isSearching && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--surface-glass)] backdrop-blur-sm">
          <div className="w-16 h-16 rounded-full border-4 border-[var(--border-subtle)] border-t-[var(--neon-green)] animate-spin"></div>
          <p className="mt-4 text-[var(--neon-green)] font-semibold tracking-wider text-sm animate-pulse">ANALYZING TOPOLOGY...</p>
        </div>
      )}

      {/* Origin/Dest Indicators */}
      <div className="absolute bottom-4 left-4 z-10 glass-panel p-2 px-3 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest border border-white/5">
        Live Routing Engine • OpenStreetMap Data
      </div>

      <style jsx global>{`
        .leaflet-container {
          background: #0A0B10 !important;
        }
        .leaflet-tile-pane {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
  );
}