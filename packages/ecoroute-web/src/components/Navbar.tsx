"use client";

import { useState } from 'react';
import Link from 'next/link';
import { UserButton, Show } from '@clerk/nextjs';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-[100] glass-panel border-x-0 border-t-0 rounded-none px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-8">
        <Link href="/" className="font-extrabold text-2xl tracking-tighter flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center shadow-[0_0_15px_rgba(0,255,163,0.5)]">
            <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span>Eco<span className="text-glow-green">Route</span></span>
        </Link>
        
        <div className="hidden md:flex gap-6 text-sm font-medium text-[var(--text-secondary)]">
          <Link href="/compare" className="hover:text-white transition-colors">Playground</Link>
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden md:block">
          <Show when="signed-out">
            <div className="flex gap-4 items-center text-sm font-medium">
              <Link href="/sign-in" className="text-[var(--text-secondary)] hover:text-white transition-colors">
                Log in
              </Link>
              <Link href="/sign-up" className="btn-primary py-2 px-4 text-sm">
                Start Building
              </Link>
            </div>
          </Show>
          <Show when="signed-in">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="text-[var(--text-secondary)] hover:text-white text-sm font-medium transition-colors">
                Dashboard
              </Link>
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9 ring-2 ring-[var(--border-subtle)] hover:ring-[var(--neon-green)] transition-all"
                  }
                }}
              />
            </div>
          </Show>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden p-2 text-white"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          )}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-[rgba(10,11,12,0.95)] backdrop-blur-xl border-b border-[var(--border-subtle)] p-6 md:hidden animate-in slide-in-from-top duration-300">
          <div className="flex flex-col gap-6">
            <Link href="/compare" onClick={() => setIsMenuOpen(false)} className="text-lg font-semibold text-white">Playground</Link>
            <Link href="/pricing" onClick={() => setIsMenuOpen(false)} className="text-lg font-semibold text-white">Pricing</Link>
            <Link href="/docs" onClick={() => setIsMenuOpen(false)} className="text-lg font-semibold text-white">Docs</Link>
            <div className="h-px bg-[var(--border-subtle)] w-full"></div>
            <Show when="signed-out">
              <Link href="/sign-in" onClick={() => setIsMenuOpen(false)} className="text-lg font-semibold text-white">Log in</Link>
              <Link href="/sign-up" onClick={() => setIsMenuOpen(false)} className="btn-primary py-3 text-center">Start Building</Link>
            </Show>
            <Show when="signed-in">
              <Link href="/dashboard" onClick={() => setIsMenuOpen(false)} className="text-lg font-semibold text-white">Dashboard</Link>
              <div className="flex items-center gap-4">
                  <span className="text-sm text-[var(--text-secondary)]">Manage Account</span>
                  <UserButton />
              </div>
            </Show>
          </div>
        </div>
      )}
    </nav>
  );
}
