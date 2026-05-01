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
    <div className={`p-3 rounded-lg border transition-all ${isEco ? 'bg-[rgba(0,255,163,0.05)] border-[var(--neon-green)] shadow-[0_0_10px_rgba(0,255,163,0.1)]' : 'bg-[var(--surface-glass)] border-[var(--border-subtle)]'}`}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          {isEco ? (
            <div className="w-6 h-6 rounded-full bg-[rgba(0,255,163,0.2)] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-[var(--neon-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-[var(--surface)] border border-[var(--border-subtle)] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
          )}
          <h4 className={`text-sm font-semibold ${isEco ? 'text-[var(--neon-green)]' : 'text-[var(--text-primary)]'}`}>
            {isEco ? 'Eco-Friendly Route' : 'Standard Route'}
          </h4>
        </div>
        {isEco && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[var(--neon-green)] text-white dark:text-black rounded">RECOMMENDED</span>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">CO2 Emitted</p>
          <p className={`text-sm font-bold ${isEco ? 'text-[var(--neon-green)]' : 'text-[var(--text-primary)]'}`}>{carbon}</p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">Time</p>
          <p className="text-sm font-bold text-[var(--text-primary)]">{duration}</p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">Distance</p>
          <p className="text-sm font-bold text-[var(--text-primary)]">{distance}</p>
        </div>
      </div>
    </div>
  );
}