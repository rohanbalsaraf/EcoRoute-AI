export default function IntroductionPage() {
  return (
    <section id="introduction">
      <h1 className="text-4xl font-extrabold text-[var(--text-primary)] mb-6 tracking-tight">Introduction</h1>
      <p className="text-lg text-[var(--text-secondary)] leading-relaxed mb-8">
        Welcome to the EcoRoute API. Our platform allows you to calculate the most carbon-efficient routes between any two points on Earth, leveraging real-world topography and vehicle-specific emission models.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="glass-panel p-6 border-glow-hover bg-[var(--surface-glass)]">
          <h3 className="text-lg font-bold text-[var(--neon-green)] mb-2">Carbon Aware</h3>
          <p className="text-sm text-[var(--text-secondary)]">Optimized for CO2 reduction, not just speed. Save up to 15% in emissions.</p>
        </div>
        <div className="glass-panel p-6 border-glow-hover bg-[var(--surface-glass)]">
          <h3 className="text-lg font-bold text-[var(--neon-purple)] mb-2">Developer First</h3>
          <p className="text-sm text-[var(--text-secondary)]">Simple REST API and SDKs in Python and Node.js for rapid integration.</p>
        </div>
      </div>

      <div className="bg-[rgba(0,255,163,0.05)] border-l-4 border-[var(--neon-green)] p-6 rounded-r-lg mb-12">
        <h4 className="text-sm font-bold text-[var(--neon-green)] uppercase tracking-wider mb-2">Key Philosophy</h4>
        <p className="text-[var(--text-primary)] italic">
          "Logistics shouldn't cost the Earth. We provide the intelligence to make every mile green."
        </p>
      </div>

      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Quick Start</h2>
      <p className="text-[var(--text-secondary)] mb-6">
        To get started, create an account on our <a href="/sign-up" className="text-[var(--neon-green)] hover:underline">Dashboard</a>, generate an API key, and make your first request to the routing endpoint.
      </p>
      
      <a href="/docs/auth" className="btn-primary inline-flex py-3 px-6 text-sm font-bold">
        Setup Authentication &rarr;
      </a>
    </section>
  );
}
