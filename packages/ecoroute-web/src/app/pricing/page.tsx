"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

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
        alert("Failed to initiate checkout: " + (data.error || "Unknown error"));
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      alert("Error connecting to checkout service.");
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-green-600">Pricing</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Pricing plans for teams of all sizes
          </p>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-600">
          Choose an affordable plan that&#39;s packed with the best features for integrating carbon-aware routing.
        </p>

        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:gap-x-8 xl:gap-x-12 px-4">
          
          {/* Free Tier */}
          <div className="rounded-3xl p-8 ring-1 ring-gray-200 bg-white shadow-sm transition-all hover:shadow-md">
            <h3 className="text-2xl font-bold tracking-tight text-gray-900">Developer</h3>
            <p className="mt-4 text-sm leading-6 text-gray-600">Perfect for side projects and evaluating the API.</p>
            <p className="mt-6 flex items-baseline gap-x-1">
              <span className="text-5xl font-bold tracking-tight text-gray-900">$0</span>
              <span className="text-sm font-semibold leading-6 text-gray-600">/month</span>
            </p>
            <Link
              href={isSignedIn ? "/dashboard" : "/sign-up"}
              className="mt-6 block rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 text-green-600 ring-1 ring-inset ring-green-200 hover:ring-green-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
            >
              {isSignedIn ? "Go to Dashboard" : "Get started for free"}
            </Link>
            <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
              <li className="flex gap-x-3">
                <svg className="h-6 w-5 flex-none text-green-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                100 requests / day
              </li>
              <li className="flex gap-x-3">
                <svg className="h-6 w-5 flex-none text-green-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                Standard routing algorithms
              </li>
              <li className="flex gap-x-3">
                <svg className="h-6 w-5 flex-none text-green-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                Community support
              </li>
            </ul>
          </div>

          {/* Pro Tier */}
          <div className="rounded-3xl p-8 ring-2 ring-purple-600 bg-white shadow-xl">
            <div className="flex items-center justify-between gap-x-4">
              <h3 className="text-2xl font-bold tracking-tight text-purple-600">Production</h3>
              <p className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold leading-5 text-purple-600">Most popular</p>
            </div>
            <p className="mt-4 text-sm leading-6 text-gray-600">For scaling startups and high-volume logistics.</p>
            <p className="mt-6 flex items-baseline gap-x-1">
              <span className="text-5xl font-bold tracking-tight text-gray-900">$49</span>
              <span className="text-sm font-semibold leading-6 text-gray-600">/month</span>
            </p>
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="mt-6 block w-full rounded-md bg-purple-600 px-3 py-2 text-center text-sm font-semibold leading-6 text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 disabled:opacity-50 transition-colors"
            >
              {loading ? "Redirecting..." : "Upgrade to Pro"}
            </button>
            <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
              <li className="flex gap-x-3">
                <svg className="h-6 w-5 flex-none text-purple-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                10,000 requests / day
              </li>
              <li className="flex gap-x-3">
                <svg className="h-6 w-5 flex-none text-purple-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                Advanced Carbon-Aware Models
              </li>
              <li className="flex gap-x-3">
                <svg className="h-6 w-5 flex-none text-purple-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                Priority email support
              </li>
              <li className="flex gap-x-3">
                <svg className="h-6 w-5 flex-none text-purple-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                SLA guarantees
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
