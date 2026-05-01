"use client";

import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/react';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <Analytics />
      <Toaster position="bottom-right" theme="dark" richColors />
      {children}
    </ClerkProvider>
  );
}
