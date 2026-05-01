import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();

  // Automatically redirect logged-in developers to the dashboard
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center relative overflow-hidden">
      {/* Background Decorative SVG */}
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-20 pointer-events-none">
        <svg viewBox="0 0 800 600" className="w-full max-w-4xl h-auto blur-sm">
          <path d="M 100 500 Q 250 100, 400 300 T 700 100" fill="none" stroke="var(--neon-green)" strokeWidth="4" className="dash-animation" />
          <path d="M 100 500 Q 300 400, 450 150 T 700 100" fill="none" stroke="var(--neon-purple)" strokeWidth="2" className="dash-animation" style={{ animationDelay: '2s' }} />
        </svg>
      </div>

      <div className="relative z-10 max-w-3xl mt-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-glass)] backdrop-blur-md mb-6 text-xs font-medium text-[var(--text-secondary)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-green)] animate-pulse"></span>
          EcoRoute API v1.0 is now live
        </div>
        
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight text-transparent bg-clip-text bg-gradient-to-b from-[var(--text-primary)] to-[var(--text-secondary)]">
          Routing intelligence for a <br />
          <span className="text-glow-green text-transparent bg-clip-text bg-gradient-to-r from-[var(--neon-green)] to-[var(--neon-purple)]">
            zero-emission future.
          </span>
        </h1>
        
        <p className="text-base md:text-lg text-[var(--text-secondary)] mb-8 max-w-2xl mx-auto leading-relaxed">
          The only routing API built from the ground up to minimize CO2 emissions. 
          Factor in gradient, vehicle type, and real-time traffic to deliver the greenest path in sub-milliseconds.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link href="/sign-up" className="btn-primary text-base px-8">
            Get API Key
          </Link>
          <Link href="/compare" className="btn-glass text-base flex items-center justify-center gap-2 px-8">
            Try Playground
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </Link>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 mt-20 max-w-5xl w-full text-left px-4 pb-12">
        <div className="glass-panel p-6 border-glow-hover bg-[var(--surface-glass)]">
          <div className="w-10 h-10 rounded-lg bg-[rgba(0,255,163,0.1)] flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-[var(--neon-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
          </div>
          <h3 className="text-lg font-bold mb-2 text-[var(--text-primary)]">Hyper-Accurate Topology</h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">Our Rust core calculates fuel burn by factoring in 3D elevation maps, stopping at traffic lights, and road curvature.</p>
        </div>
        
        <div className="glass-panel p-6 border-glow-hover bg-[var(--surface-glass)]">
          <div className="w-10 h-10 rounded-lg bg-[rgba(123,97,255,0.1)] flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-[var(--neon-purple)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <h3 className="text-lg font-bold mb-2 text-[var(--text-primary)]">Multi-Model Engines</h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">Instantly switch between ICE, Hybrid, and EV consumption algorithms. Perfectly tailor routes to your fleet's exact vehicles.</p>
        </div>
        
        <div className="glass-panel p-6 border-glow-hover bg-[var(--surface-glass)]">
          <div className="w-10 h-10 rounded-lg bg-[rgba(0,255,163,0.1)] flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-[var(--neon-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </div>
          <h3 className="text-lg font-bold mb-2 text-[var(--text-primary)]">Drop-in REST API</h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">Compatible with standard GeoJSON routing responses. Migrate your logistics engine in under 10 lines of code.</p>
        </div>
      </div>
    </div>
  );
}