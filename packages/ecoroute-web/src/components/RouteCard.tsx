interface RouteCardProps {
  data: {
    distance: string;
    duration: string;
    carbon: string;
    isEco: boolean;
  };
}

export default function RouteCard({ data }: RouteCardProps) {
  const { isEco, distance, duration, carbon } = data;
  
  return (
    <div className={`p-4 rounded-xl border transition-all ${isEco ? 'bg-[rgba(0,255,163,0.05)] border-[var(--neon-green)] shadow-[0_0_15px_rgba(0,255,163,0.1)]' : 'bg-[var(--surface-glass)] border-[var(--border-subtle)]'}`}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          {isEco ? (
            <div className="w-8 h-8 rounded-full bg-[rgba(0,255,163,0.2)] flex items-center justify-center">
              <svg className="w-4 h-4 text-[var(--neon-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-[var(--surface)] border border-[var(--border-subtle)] flex items-center justify-center">
              <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
          )}
          <h4 className={`font-semibold ${isEco ? 'text-[var(--neon-green)]' : 'text-white'}`}>
            {isEco ? 'Eco-Friendly Route' : 'Standard Route'}
          </h4>
        </div>
        {isEco && <span className="text-xs font-bold px-2 py-1 bg-[var(--neon-green)] text-black rounded-md">RECOMMENDED</span>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">CO2 Emitted</p>
          <p className={`text-lg font-bold ${isEco ? 'text-[var(--neon-green)]' : 'text-white'}`}>{carbon}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Time</p>
          <p className="text-lg font-bold text-white">{duration}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Distance</p>
          <p className="text-lg font-bold text-white">{distance}</p>
        </div>
      </div>
    </div>
  );
}