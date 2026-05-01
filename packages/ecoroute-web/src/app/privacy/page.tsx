export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-24">
      <h1 className="text-4xl font-extrabold text-[var(--text-primary)] mb-8 tracking-tight">Privacy Policy</h1>
      
      <div className="prose prose-invert max-w-none text-[var(--text-secondary)] space-y-6">
        <p>Last updated: May 01, 2026</p>
        
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-12 mb-4">1. Introduction</h2>
        <p>
          EcoRoute AI ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website and use our routing services.
        </p>

        <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-12 mb-4">2. Data We Collect</h2>
        <p>
          We collect information that you provide directly to us, such as when you create an account, generate an API key, or communicate with us. This may include:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Email address and basic profile information (via Clerk).</li>
          <li>Usage data, including routing requests (origin and destination coordinates).</li>
          <li>Billing information (processed securely via Lemon Squeezy).</li>
        </ul>

        <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-12 mb-4">3. How We Use Your Data</h2>
        <p>
          We use the information we collect to:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Provide, maintain, and improve our routing services.</li>
          <li>Process transactions and manage your subscription.</li>
          <li>Send technical notices, updates, and support messages.</li>
          <li>Monitor and analyze usage trends to optimize our engine.</li>
        </ul>

        <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-12 mb-4">4. Data Retention</h2>
        <p>
          Routing data is stored to provide you with your calculation history. You can request the deletion of your account and associated data at any time via our support channels.
        </p>

        <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-12 mb-4">5. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at privacy@ecoroute.ai.
        </p>
      </div>
    </div>
  );
}
