"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

export default function PricingPage() {
  const { isSignedIn } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!isSignedIn) {
      window.location.href = "/sign-up?redirect_url=/pricing";
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to initiate checkout: " + (data.error || "Unknown error"));
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      toast.error("Error connecting to checkout service.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-radial-top opacity-50 pointer-events-none"></div>
      
      <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--neon-green)] mb-4">Pricing Plans</h2>
          <p className="text-4xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-6xl mb-6">
            Scale your <span className="text-glow-green">impact</span>
          </p>
          <p className="mx-auto max-w-2xl text-lg leading-8 text-[var(--text-secondary)]">
            Choose a plan that fits your logistics volume. From experimental side-projects to enterprise-grade delivery networks.
          </p>
        </div>

        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:gap-x-8 xl:gap-x-12 px-4">
          
          {/* Free Tier */}
          <div className="glass-panel p-8 flex flex-col border-[var(--border-subtle)] hover:border-[var(--border-glow-green)] transition-all duration-500 group bg-[var(--surface-glass)]">
            <div className="mb-8">
              <h3 className="text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--neon-green)] transition-colors">Developer</h3>
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">Ideal for development, testing, and small-scale experiments.</p>
              <div className="mt-6 flex items-baseline gap-x-1">
                <span className="text-5xl font-extrabold tracking-tight text-[var(--text-primary)]">$0</span>
                <span className="text-sm font-medium leading-6 text-[var(--text-secondary)]">/month</span>
              </div>
            </div>
            
            <Link
              href={isSignedIn ? "/dashboard" : "/sign-up"}
              className="btn-glass w-full py-3 text-center text-sm font-bold mb-8 hover:border-[var(--neon-green)]"
            >
              {isSignedIn ? "Go to Dashboard" : "Get Started Free"}
            </Link>

            <ul role="list" className="mt-auto space-y-4 text-sm leading-6 text-[var(--text-secondary)]">
              {[
                "100 requests / day",
                "Standard routing engine",
                "Community support",
                "Public API access"
              ].map((feature, i) => (
                <li key={i} className="flex gap-x-3 items-center">
                  <svg className="h-5 w-5 flex-none text-[var(--neon-green)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro Tier */}
          <div className="glass-panel p-8 flex flex-col border-[var(--neon-purple)] shadow-[0_0_40px_rgba(168,85,247,0.15)] relative overflow-hidden group bg-[var(--surface-glass)]">
            <div className="absolute top-0 right-0 bg-[var(--neon-purple)] text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
              Recommended
            </div>
            
            <div className="mb-8">
              <h3 className="text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--neon-purple)] transition-colors">Production</h3>
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">High-performance routing for commercial logistics and scaling startups.</p>
              <div className="mt-6 flex items-baseline gap-x-1">
                <span className="text-5xl font-extrabold tracking-tight text-[var(--text-primary)]">$49</span>
                <span className="text-sm font-medium leading-6 text-[var(--text-secondary)]">/month</span>
              </div>
            </div>
            
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="btn-primary w-full py-3 text-sm font-bold mb-8 bg-[var(--neon-purple)] shadow-[0_0_15px_rgba(168,85,247,0.4)] border-none hover:bg-purple-500 text-white"
            >
              {loading ? "Initializing..." : "Upgrade to Pro"}
            </button>

            <ul role="list" className="mt-auto space-y-4 text-sm leading-6 text-[var(--text-secondary)]">
              {[
                "10,000 requests / day",
                "Premium Carbon-Aware models",
                "Advanced traffic simulation",
                "Priority email support",
                "99.9% uptime SLA"
              ].map((feature, i) => (
                <li key={i} className="flex gap-x-3 items-center">
                  <svg className="h-5 w-5 flex-none text-[var(--neon-purple)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[var(--text-primary)] font-medium">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
