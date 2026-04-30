interface SearchBarProps {
  onSearch: () => void;
  isLoading: boolean;
}

export default function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  return (
    <div className="glass-panel p-4 flex flex-col gap-4">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-400"></div>
        <input 
          type="text" 
          placeholder="Origin (e.g., San Francisco, CA)" 
          className="w-full bg-[var(--surface)] border border-[var(--border-subtle)] text-white rounded-lg pl-8 pr-4 py-3 focus:outline-none focus:border-[var(--neon-green)] focus:ring-1 focus:ring-[var(--neon-green)] transition-all"
          defaultValue="San Francisco, CA"
        />
      </div>
      
      <div className="relative flex justify-center -my-3 z-10">
        <div className="bg-[var(--surface-glass)] border border-[var(--border-subtle)] rounded-full p-1 text-[var(--text-secondary)]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path></svg>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-sm bg-red-500"></div>
        <input 
          type="text" 
          placeholder="Destination (e.g., Los Angeles, CA)" 
          className="w-full bg-[var(--surface)] border border-[var(--border-subtle)] text-white rounded-lg pl-8 pr-4 py-3 focus:outline-none focus:border-[var(--neon-green)] focus:ring-1 focus:ring-[var(--neon-green)] transition-all"
          defaultValue="Los Angeles, CA"
        />
      </div>

      <button 
        onClick={onSearch}
        disabled={isLoading}
        className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></path><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            Optimizing Routes...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            Calculate Eco Route
          </>
        )}
      </button>
    </div>
  );
}