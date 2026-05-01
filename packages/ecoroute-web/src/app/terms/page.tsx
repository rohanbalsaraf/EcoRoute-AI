export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-24">
      <h1 className="text-4xl font-extrabold text-[var(--text-primary)] mb-8 tracking-tight">Terms of Service</h1>
      
      <div className="prose prose-invert max-w-none text-[var(--text-secondary)] space-y-6">
        <p>Last updated: May 01, 2026</p>
        
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-12 mb-4">1. Agreement to Terms</h2>
        <p>
          By accessing or using the EcoRoute AI platform, you agree to be bound by these Terms of Service. If you do not agree, you may not use our services.
        </p>

        <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-12 mb-4">2. Description of Service</h2>
        <p>
          EcoRoute AI provides a carbon-aware routing engine and API for calculating logistics paths with high environmental efficiency.
        </p>

        <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-12 mb-4">3. API Usage and Keys</h2>
        <p>
          You are responsible for maintaining the confidentiality of your API keys. You agree not to:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Reverse engineer or attempt to extract the source code of our routing engine.</li>
          <li>Use our API for any illegal or unauthorized purpose.</li>
          <li>Circumvent rate limits or other security measures.</li>
        </ul>

        <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-12 mb-4">4. Billing and Subscriptions</h2>
        <p>
          Some features require a paid subscription. Billing is handled through our third-party provider, Lemon Squeezy. All fees are non-refundable unless required by law.
        </p>

        <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-12 mb-4">5. Limitation of Liability</h2>
        <p>
          EcoRoute AI is provided "as is". We are not liable for any damages resulting from the use of our routing data, including but not limited to logistics delays or inaccuracies in carbon estimation.
        </p>

        <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-12 mb-4">6. Changes to Terms</h2>
        <p>
          We reserve the right to modify these terms at any time. Your continued use of the platform constitutes acceptance of the updated terms.
        </p>
      </div>
    </div>
  );
}
