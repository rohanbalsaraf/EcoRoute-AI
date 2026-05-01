import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-6 tracking-tight">
          Decarbonizing <span className="text-glow-green">Global Logistics</span>
        </h1>
        <p className="text-xl text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto">
          EcoRoute is building the digital infrastructure for the zero-emission transition. 
          Our mission is to empower every developer to build carbon-aware applications.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20">
        <div className="glass-panel p-8 border-glow-hover bg-[var(--surface-glass)]">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Our Vision</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            By 2030, we aim to have saved over 1 billion metric tons of CO2 by optimizing 
            trillions of delivery miles. We believe that efficiency and sustainability 
            are two sides of the same coin.
          </p>
        </div>
        <div className="glass-panel p-8 border-glow-hover bg-[var(--surface-glass)]">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">The Engine</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Powered by a high-performance Rust core, EcoRoute calculates optimal routes 
            not just based on time, but based on real-time elevation, drivetrain efficiency, 
            and carbon intensity data.
          </p>
        </div>
      </div>

      <div className="glass-panel p-10 text-center relative overflow-hidden bg-[var(--surface-glass)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--neon-green)] opacity-5 blur-[100px] -z-10"></div>
        <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-6">Join the Movement</h2>
        <p className="text-[var(--text-secondary)] mb-8 max-w-xl mx-auto">
          Whether you're a solo developer or a Fortune 500 logistics firm, 
          EcoRoute provides the tools you need to build a greener future.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/sign-up" className="btn-primary px-8 py-3 text-base">
            Start Building for Free
          </Link>
          <Link href="/docs" className="btn-glass px-8 py-3 text-base">
            Read the Docs
          </Link>
        </div>
      </div>
    </div>
  );
}
