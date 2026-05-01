interface CarbonMeterProps {
  ecoCarbon: number;
  stdCarbon: number;
}

export default function CarbonMeter({ ecoCarbon, stdCarbon }: CarbonMeterProps) {
  const savings = (stdCarbon - ecoCarbon).toFixed(1);
  const percentage = Math.round(((stdCarbon - ecoCarbon) / stdCarbon) * 100);

  return (
    <div className="glass-panel p-4 relative overflow-hidden bg-[var(--surface-glass)]">
      <div className="absolute -right-4 -top-4 w-20 h-20 bg-[var(--neon-green)] rounded-full blur-[30px] opacity-10 dark:opacity-20"></div>
      
      <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Environmental Impact</h4>
      <div className="flex items-end gap-2 mb-3">
        <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[var(--neon-green)] to-[var(--neon-purple)] leading-none">
          {savings} kg
        </span>
        <span className="text-[var(--text-secondary)] pb-0.5 text-sm font-medium">CO2 Saved</span>
      </div>

      <div className="w-full bg-[var(--surface)] h-2 rounded-full overflow-hidden relative">
        {/* Standard bar underneath */}
        <div className="absolute top-0 left-0 h-full w-full bg-[var(--border-subtle)]"></div>
        {/* Savings section */}
        <div 
          className="absolute top-0 right-0 h-full bg-[var(--neon-green)] shadow-[0_0_10px_rgba(0,255,163,0.8)]"
          style={{ width: `${percentage}%`, left: `${100 - percentage}%` }}
        ></div>
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] font-medium text-[var(--text-secondary)]">
        <span>Standard Route</span>
        <span className="text-[var(--neon-green)]">{percentage}% Reduction</span>
      </div>
    </div>
  );
}