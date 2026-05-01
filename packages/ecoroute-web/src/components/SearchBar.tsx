import { useState, useEffect, useRef } from 'react';

interface SearchBarProps {
  onSearch: (origin: string, destination: string) => void;
  isLoading: boolean;
}

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function AutocompleteInput({ 
  value, 
  onChange, 
  placeholder, 
  dotColor,
  onUseGPS,
  isOrigin
}: { 
  value: string; 
  onChange: (val: string) => void; 
  placeholder: string; 
  dotColor: string;
  onUseGPS?: () => void;
  isOrigin?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const debouncedValue = useDebounce(value, 400);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debouncedValue.length < 3) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    setIsFetching(true);

    fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(debouncedValue)}&limit=5`,
      { signal: controller.signal }
    )
      .then(res => res.json())
      .then(data => {
        const results = (data.features || []).map((f: any) => ({
          display_name: [f.properties.name, f.properties.county, f.properties.state, f.properties.country].filter(Boolean).join(', '),
          lat: String(f.geometry.coordinates[1]),
          lon: String(f.geometry.coordinates[0]),
        }));
        setSuggestions(results);
        setShowDropdown(results.length > 0);
        setIsFetching(false);
      })
      .catch(() => setIsFetching(false));

    return () => controller.abort();
  }, [debouncedValue]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className={`absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 ${dotColor === 'blue' ? 'rounded-full bg-blue-400' : 'rounded-sm bg-red-500'}`}></div>
      <input 
        type="text" 
        value={value}
        onChange={(e) => { onChange(e.target.value); setShowDropdown(true); }}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        className="w-full bg-[var(--surface)] text-sm border border-[var(--border-subtle)] text-white rounded-md pl-7 pr-16 py-2 focus:outline-none focus:border-[var(--neon-green)] focus:ring-1 focus:ring-[var(--neon-green)] transition-all"
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {isFetching && (
          <div className="w-3 h-3 border-2 border-[var(--neon-green)] border-t-transparent rounded-full animate-spin"></div>
        )}
        {isOrigin && onUseGPS && (
          <button
            type="button"
            onClick={onUseGPS}
            title="Use my GPS location"
            className="p-1 rounded hover:bg-[var(--surface-glass)] transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-[var(--neon-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </button>
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-50 top-full mt-1 left-0 w-full bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg shadow-2xl max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li
              key={i}
              onClick={() => { onChange(s.display_name); setShowDropdown(false); }}
              className="px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-glass)] hover:text-white cursor-pointer transition-colors border-b border-[var(--border-subtle)] last:border-b-0 flex items-start gap-2"
            >
              <svg className="w-3 h-3 mt-0.5 shrink-0 text-[var(--neon-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              <span className="line-clamp-2">{s.display_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Reverse geocode to get readable address
        try {
          const res = await fetch(`https://photon.komoot.io/reverse?lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data.features?.length > 0) {
            const p = data.features[0].properties;
            setOrigin([p.name, p.city || p.county, p.state, p.country].filter(Boolean).join(', '));
          } else {
            setOrigin(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        } catch {
          setOrigin(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        setGpsLoading(false);
      },
      (err) => {
        alert('Could not get your location. Please allow location access.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="glass-panel p-3 flex flex-col gap-3">
      <AutocompleteInput
        value={gpsLoading ? 'Getting your location...' : origin}
        onChange={setOrigin}
        placeholder="Search origin (e.g., Times Square, NYC)"
        dotColor="blue"
        onUseGPS={handleUseGPS}
        isOrigin={true}
      />
      
      <div className="relative flex justify-center -my-2.5 z-10">
        <div className="bg-[var(--surface-glass)] border border-[var(--border-subtle)] rounded-full p-0.5 text-[var(--text-secondary)]">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path></svg>
        </div>
      </div>

      <AutocompleteInput
        value={destination}
        onChange={setDestination}
        placeholder="Search destination (e.g., Central Park, NYC)"
        dotColor="red"
      />

      <button 
        onClick={() => onSearch(origin, destination)}
        disabled={isLoading || !origin || !destination}
        className="btn-primary w-full mt-1 flex items-center justify-center gap-1.5 text-xs"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-3.5 w-3.5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            Optimizing...
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            Calculate Route
          </>
        )}
      </button>
    </div>
  );
}