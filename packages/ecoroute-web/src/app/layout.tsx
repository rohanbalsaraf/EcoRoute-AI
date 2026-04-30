import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider, UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import "../styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EcoRoute SaaS",
  description: "API-first platform for carbon-aware routing",
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
          <header className="flex justify-between items-center p-4 bg-white shadow-sm">
            <div className="font-bold text-xl text-green-700">EcoRoute</div>
            <div>
              {!userId ? (
                <Link href="/sign-in" className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition">
                  Sign In
                </Link>
              ) : (
                <div className="flex items-center gap-4">
                  <a href="/dashboard" className="text-gray-600 hover:text-green-600 font-medium">Dashboard</a>
                  <UserButton afterSignOutUrl="/"/>
                </div>
              )}
            </div>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}