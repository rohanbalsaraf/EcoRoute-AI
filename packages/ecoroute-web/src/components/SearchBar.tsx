import { useState } from 'react';

interface SearchBarProps {
  onSearch: (origin: string, destination: string) => void;
  isLoading: boolean;
}

export default function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [origin, setOrigin] = useState('Pune Station, Pune');
  const [destination, setDestination] = useState('Hinjewadi, Pune');

  return (
    <div className="glass-panel p-3 flex flex-col gap-3">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-400"></div>
        <input 
          type="text" 
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder="Origin (e.g., Pune Station)" 
          className="w-full bg-[var(--surface)] text-sm border border-[var(--border-subtle)] text-white rounded-md pl-7 pr-3 py-2 focus:outline-none focus:border-[var(--neon-green)] focus:ring-1 focus:ring-[var(--neon-green)] transition-all"
        />
      </div>
      
      <div className="relative flex justify-center -my-2.5 z-10">
        <div className="bg-[var(--surface-glass)] border border-[var(--border-subtle)] rounded-full p-0.5 text-[var(--text-secondary)]">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path></svg>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-sm bg-red-500"></div>
        <input 
          type="text" 
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Destination (e.g., Hinjewadi)" 
          className="w-full bg-[var(--surface)] text-sm border border-[var(--border-subtle)] text-white rounded-md pl-7 pr-3 py-2 focus:outline-none focus:border-[var(--neon-green)] focus:ring-1 focus:ring-[var(--neon-green)] transition-all"
        />
      </div>

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