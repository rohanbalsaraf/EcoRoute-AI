interface CarbonMeterProps {
  ecoCarbon: number;
  stdCarbon: number;
}

export default function CarbonMeter({ ecoCarbon, stdCarbon }: CarbonMeterProps) {
  const savings = (stdCarbon - ecoCarbon).toFixed(1);
  const percentage = Math.round(((stdCarbon - ecoCarbon) / stdCarbon) * 100);

  return (
    <div className="glass-panel p-5 relative overflow-hidden">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-[var(--neon-green)] rounded-full blur-[40px] opacity-20"></div>
      
      <h4 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Environmental Impact</h4>
      <div className="flex items-end gap-3 mb-4">
        <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[var(--neon-green)] to-[var(--neon-purple)]">
          {savings} kg
        </span>
        <span className="text-[var(--text-secondary)] pb-1 font-medium">CO2 Saved</span>
      </div>

      <div className="w-full bg-[var(--surface)] h-3 rounded-full overflow-hidden relative">
        {/* Standard bar underneath */}
        <div className="absolute top-0 left-0 h-full w-full bg-[var(--border-subtle)]"></div>
        {/* Savings section */}
        <div 
          className="absolute top-0 right-0 h-full bg-[var(--neon-green)] shadow-[0_0_10px_rgba(0,255,163,0.8)]"
          style={{ width: `${percentage}%`, left: `${100 - percentage}%` }}
        ></div>
      </div>
      <div className="flex justify-between mt-2 text-xs font-medium text-[var(--text-secondary)]">
        <span>Standard Route</span>
        <span className="text-[var(--neon-green)]">{percentage}% Reduction</span>
      </div>
    </div>
  );
}