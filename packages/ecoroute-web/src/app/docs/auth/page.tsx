export default function AuthDocsPage() {
  return (
    <section id="authentication">
      <h1 className="text-4xl font-extrabold text-[var(--text-primary)] mb-6 tracking-tight">Authentication</h1>
      <p className="text-lg text-[var(--text-secondary)] leading-relaxed mb-6">
        All API requests require an API key passed in the <code className="bg-[var(--surface)] px-1.5 py-0.5 rounded text-[var(--neon-green)]">Authorization</code> header as a Bearer token.
      </p>
      
      <div className="glass-panel p-6 font-mono text-sm text-[var(--text-primary)] mb-8 bg-[var(--surface-glass)] border-[var(--border-subtle)]">
        <p className="text-[var(--text-secondary)] mb-4"># Example Header</p>
        <span className="text-[var(--neon-purple)]">Authorization</span>: <span className="text-[var(--neon-green)]">Bearer ecoroute_live_...</span>
      </div>

      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Managing Keys</h2>
      <p className="text-[var(--text-secondary)] mb-6">
        You can generate, list, and revoke your API keys in the <a href="/dashboard" className="text-[var(--neon-green)] hover:underline">Developer Dashboard</a>. We support up to 5 active keys per project.
      </p>

      <div className="bg-yellow-500/10 border-l-4 border-yellow-500/50 p-4 rounded-r-lg mb-8">
        <p className="text-sm text-yellow-500/80 font-medium">
          <strong>Security Warning:</strong> Never share your API key or commit it to version control. If a key is compromised, revoke it immediately from the dashboard.
        </p>
      </div>

      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">API Tiers</h2>
      <p className="text-[var(--text-secondary)] mb-6">
        Your authentication token determines your rate limits and available models based on your subscription tier.
      </p>
      
      <ul className="space-y-4">
        <li className="flex items-start gap-4">
          <div className="w-2 h-2 rounded-full bg-[var(--neon-green)] mt-2"></div>
          <div>
            <p className="font-bold text-[var(--text-primary)]">Developer Tier (Free)</p>
            <p className="text-sm text-[var(--text-secondary)]">100 requests per day, standard routing.</p>
          </div>
        </li>
        <li className="flex items-start gap-4">
          <div className="w-2 h-2 rounded-full bg-[var(--neon-purple)] mt-2"></div>
          <div>
            <p className="font-bold text-[var(--text-primary)]">Production Tier (Paid)</p>
            <p className="text-sm text-[var(--text-secondary)]">10,000+ requests per day, premium carbon models, 99.9% uptime.</p>
          </div>
        </li>
      </ul>
    </section>
  );
}
