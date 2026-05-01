"use client";

import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/react';
import { ThemeProvider } from 'next-themes';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false}>
      <ClerkProvider>
        <Analytics />
        <Toaster position="bottom-right" richColors />
        {children}
      </ClerkProvider>
    </ThemeProvider>
  );
}
