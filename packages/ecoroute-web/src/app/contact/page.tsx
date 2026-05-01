export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-6 tracking-tight">
          Get in <span className="text-glow-green">Touch</span>
        </h1>
        <p className="text-lg text-[var(--text-secondary)]">
          Have questions about our Enterprise plans or need technical support? We're here to help.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div className="glass-panel p-6 text-center bg-[var(--surface-glass)]">
          <div className="w-12 h-12 bg-[rgba(0,255,163,0.1)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--border-glow-green)]">
            <svg className="w-6 h-6 text-[var(--neon-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
          </div>
          <h3 className="text-[var(--text-primary)] font-bold mb-1">Email</h3>
          <p className="text-sm text-[var(--text-secondary)]">support@ecoroute.ai</p>
        </div>
        
        <div className="glass-panel p-6 text-center bg-[var(--surface-glass)]">
          <div className="w-12 h-12 bg-[rgba(123,97,255,0.1)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--neon-purple-glow)]">
            <svg className="w-6 h-6 text-[var(--neon-purple)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
          </div>
          <h3 className="text-[var(--text-primary)] font-bold mb-1">Discord</h3>
          <p className="text-sm text-[var(--text-secondary)]">Join our Community</p>
        </div>

        <div className="glass-panel p-6 text-center bg-[var(--surface-glass)]">
          <div className="w-12 h-12 bg-[rgba(0,255,163,0.1)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--border-glow-green)]">
            <svg className="w-6 h-6 text-[var(--neon-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          </div>
          <h3 className="text-[var(--text-primary)] font-bold mb-1">Office</h3>
          <p className="text-sm text-[var(--text-secondary)]">San Francisco, CA</p>
        </div>
      </div>

      <div className="glass-panel p-8 md:p-12 max-w-2xl mx-auto bg-[var(--surface-glass)]">
        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Name</label>
              <input type="text" className="w-full bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--neon-green)] transition-all placeholder:text-[var(--text-secondary)] opacity-80 focus:opacity-100" placeholder="Jane Doe" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Email</label>
              <input type="email" className="w-full bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--neon-green)] transition-all placeholder:text-[var(--text-secondary)] opacity-80 focus:opacity-100" placeholder="jane@example.com" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Message</label>
            <textarea rows={4} className="w-full bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--neon-green)] transition-all placeholder:text-[var(--text-secondary)] opacity-80 focus:opacity-100" placeholder="How can we help?"></textarea>
          </div>
          <button type="button" className="btn-primary w-full py-4 text-base font-bold shadow-[0_0_20px_var(--neon-green-glow)] text-white">
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
}
