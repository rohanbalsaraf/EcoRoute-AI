import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--background)] py-12 px-6 mt-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-2">
          <Link href="/" className="font-extrabold text-2xl tracking-tighter flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center shadow-[0_0_15px_rgba(0,255,163,0.5)]">
              <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span>Eco<span className="text-glow-green">Route</span></span>
          </Link>
          <p className="text-[var(--text-secondary)] text-sm max-w-xs leading-relaxed">
            The next-generation routing engine for a sustainable world. 
            Built with high-performance Rust and carbon-aware intelligence.
          </p>
        </div>
        
        <div>
          <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Platform</h4>
          <ul className="space-y-4 text-sm">
            <li><Link href="/compare" className="text-[var(--text-secondary)] hover:text-[var(--neon-green)] transition-colors">Playground</Link></li>
            <li><Link href="/pricing" className="text-[var(--text-secondary)] hover:text-[var(--neon-green)] transition-colors">Pricing</Link></li>
            <li><Link href="/docs" className="text-[var(--text-secondary)] hover:text-[var(--neon-green)] transition-colors">Documentation</Link></li>
            <li><Link href="/dashboard" className="text-[var(--text-secondary)] hover:text-[var(--neon-green)] transition-colors">Developer Dashboard</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Company</h4>
          <ul className="space-y-4 text-sm">
            <li><Link href="/about" className="text-[var(--text-secondary)] hover:text-[var(--neon-green)] transition-colors">About Us</Link></li>
            <li><Link href="/contact" className="text-[var(--text-secondary)] hover:text-[var(--neon-green)] transition-colors">Contact</Link></li>
            <li><Link href="/changelog" className="text-[var(--text-secondary)] hover:text-[var(--neon-green)] transition-colors">Changelog</Link></li>
            <li><Link href="#" className="text-[var(--text-secondary)] hover:text-[var(--neon-green)] transition-colors">Privacy Policy</Link></li>
            <li><Link href="#" className="text-[var(--text-secondary)] hover:text-[var(--neon-green)] transition-colors">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto border-t border-[var(--border-subtle)] mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-[var(--text-secondary)] text-xs">
          © {new Date().getFullYear()} EcoRoute AI. All rights reserved.
        </p>
        <div className="flex gap-6">
          <a href="#" className="text-[var(--text-secondary)] hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
          </a>
          <a href="#" className="text-[var(--text-secondary)] hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
