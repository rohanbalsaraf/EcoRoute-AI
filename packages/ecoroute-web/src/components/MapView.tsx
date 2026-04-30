import { useEffect, useState } from 'react';

interface MapViewProps {
  isActive: boolean;
  isSearching: boolean;
}

export default function MapView({ isActive, isSearching }: MapViewProps) {
  const [showRoutes, setShowRoutes] = useState(false);

  useEffect(() => {
    if (isActive) {
      // Small delay to let the UI settle before drawing the lines
      const timer = setTimeout(() => setShowRoutes(true), 300);
      return () => clearTimeout(timer);
    } else {
      setShowRoutes(false);
    }
  }, [isActive]);

  return (
    <div className="w-full h-full relative bg-[#0A0B10] overflow-hidden">
      {/* Grid Pattern Background to look like a digital map */}
      <div 
        className="absolute inset-0 opacity-[0.05]" 
        style={{
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 1) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      ></div>

      {isSearching && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--surface-glass)] backdrop-blur-sm">
          <div className="w-16 h-16 rounded-full border-4 border-[var(--border-subtle)] border-t-[var(--neon-green)] animate-spin"></div>
          <p className="mt-4 text-[var(--neon-green)] font-semibold tracking-wider text-sm animate-pulse">ANALYZING TOPOLOGY...</p>
        </div>
      )}

      {/* SVG Map Lines */}
      <svg className="absolute inset-0 w-full h-full z-10" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Start Point (San Francisco roughly) */}
        <g transform="translate(200, 400)">
          <circle cx="0" cy="0" r="12" fill="var(--surface)" stroke="var(--text-secondary)" strokeWidth="4" />
          <circle cx="0" cy="0" r="4" fill="var(--text-primary)" />
          <text x="-10" y="-20" fill="var(--text-primary)" className="font-semibold text-sm">Origin</text>
        </g>

        {/* End Point (Los Angeles roughly) */}
        <g transform="translate(700, 800)">
          <circle cx="0" cy="0" r="12" fill="var(--surface)" stroke="var(--neon-green)" strokeWidth="4" />
          <circle cx="0" cy="0" r="4" fill="var(--neon-green)" />
          <text x="-15" y="-20" fill="var(--neon-green)" className="font-semibold text-sm text-glow-green">Dest</text>
        </g>

        {showRoutes && (
          <>
            {/* Standard Route (Gray, straight/boring) */}
            <path 
              d="M 200 400 C 400 400, 600 600, 700 800" 
              fill="none" 
              stroke="var(--text-secondary)" 
              strokeWidth="6"
              strokeDasharray="12,12"
              className="opacity-50 animate-in fade-in duration-1000"
            />
            
            {/* Eco Route (Neon Green, glowing, complex curve) */}
            <path 
              d="M 200 400 C 300 550, 400 800, 700 800" 
              fill="none" 
              stroke="var(--neon-green)" 
              strokeWidth="8"
              filter="url(#glowGreen)"
              strokeDasharray="2000"
              strokeDashoffset="2000"
              className="animate-[draw_2s_ease-out_forwards]"
            />
          </>
        )}
      </svg>
      
      <style jsx>{`
        @keyframes draw {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}