export default function ChangelogPage() {
  const updates = [
    {
      date: "May 2, 2026",
      version: "v1.1.0",
      title: "Comprehensive Light Mode",
      description: "Implemented a full platform-wide Light Mode with dynamic theme switching and synchronized map styles.",
      changes: [
        "Dynamic CartoDB basemap switching (Voyager / Dark Matter)",
        "Persistent theme state using next-themes",
        "Refactored all UI components to use semantic CSS variables",
        "Optimized contrast for high-fidelity accessibility"
      ]
    },
    {
      date: "May 1, 2026",
      version: "v1.0.2",
      title: "UI Polish & Mobile Optimization",
      description: "Finalized the premium dark theme across all pages and optimized the API Playground for mobile devices.",
      changes: [
        "Added shimmer skeleton loaders to the dashboard",
        "Improved MapView responsiveness on small screens",
        "Added OpenGraph and Twitter social meta tags",
        "Integrated professional platform favicon"
      ]
    },
    {
      date: "April 28, 2026",
      version: "v1.0.1",
      title: "SaaS Infrastructure & Billing",
      description: "Wired up the core backend systems required for commercial operation.",
      changes: [
        "Integrated Lemon Squeezy subscription webhooks",
        "Implemented Clerk JWT authentication for all API routes",
        "Added automated user provisioning on first sign-up",
        "Built the interactive API Documentation page"
      ]
    },
    {
      date: "April 15, 2026",
      version: "v1.0.0",
      title: "Official Launch",
      description: "The world's first carbon-aware routing API is now live.",
      changes: [
        "Release of high-performance Rust routing engine",
        "Launch of the web-based API Playground",
        "Support for ICE, Hybrid, and EV drivetrain models",
        "Real-time carbon intensity calculation"
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
      <div className="mb-16">
        <h1 className="text-4xl font-extrabold text-[var(--text-primary)] mb-4">Changelog</h1>
        <p className="text-[var(--text-secondary)]">Stay up to date with the latest features and improvements to EcoRoute.</p>
      </div>

      <div className="space-y-12">
        {updates.map((update, idx) => (
          <div key={idx} className="relative pl-8 border-l border-[var(--border-subtle)]">
            <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[var(--neon-green)] shadow-[0_0_8px_var(--neon-green-glow)]"></div>
            
            <div className="mb-2 flex items-center gap-3">
              <span className="text-xs font-bold text-[var(--neon-green)] uppercase tracking-widest">{update.date}</span>
              <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--text-primary)]">{update.version}</span>
            </div>
            
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">{update.title}</h2>
            <p className="text-[var(--text-secondary)] text-sm mb-6 leading-relaxed max-w-2xl">{update.description}</p>
            
            <ul className="space-y-3">
              {update.changes.map((change, cIdx) => (
                <li key={cIdx} className="flex items-start gap-3 text-sm text-[var(--text-primary)] opacity-80">
                  <span className="text-[var(--neon-green)] mt-1">•</span>
                  {change}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      
      <div className="mt-20 glass-panel p-8 text-center bg-[rgba(123,97,255,0.05)] border-[var(--neon-purple-glow)]">
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Subscribe to updates</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-6">Get notified whenever we ship a new feature or optimization.</p>
        <div className="flex max-w-md mx-auto gap-2">
          <input type="email" placeholder="email@example.com" className="flex-1 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--neon-purple)] placeholder:text-[var(--text-secondary)] opacity-80 focus:opacity-100" />
          <button className="btn-primary px-6 py-2 text-sm whitespace-nowrap text-white" style={{ background: 'var(--neon-purple)' }}>Notify Me</button>
        </div>
      </div>
    </div>
  );
}
