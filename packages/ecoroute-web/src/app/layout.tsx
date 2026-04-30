import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider, UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import "../styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EcoRoute | Carbon-Aware Routing API",
  description: "Next-generation API-first platform for zero-emission logistics and carbon-aware routing.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();

  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <div className="bg-gradient-radial-top"></div>
          <nav className="fixed top-0 w-full z-50 glass-panel border-x-0 border-t-0 rounded-none px-6 py-4 flex justify-between items-center">
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
                <a href="https://docs.ecoroute.example.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Docs</a>
              </div>
            </div>
            
            <div>
              {!userId ? (
                <div className="flex gap-4 items-center text-sm font-medium">
                  <Link href="/sign-in" className="text-[var(--text-secondary)] hover:text-white transition-colors">
                    Log in
                  </Link>
                  <Link href="/sign-up" className="btn-primary py-2 px-4 text-sm">
                    Start Building
                  </Link>
                </div>
              ) : (
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
              )}
            </div>
          </nav>
          <main className="pt-24 min-h-screen">
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  );
}