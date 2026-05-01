import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from "../components/Providers";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EcoRoute | Carbon-Aware Routing API & Sustainability Platform",
  description: "Next-generation API-first platform for zero-emission logistics, carbon-aware routing, and sustainable supply chain optimization.",
  keywords: ["routing api", "carbon footprint", "sustainability", "logistics", "green energy", "eco-friendly routing", "supply chain"],
  authors: [{ name: "EcoRoute Team" }],
  openGraph: {
    title: "EcoRoute | Carbon-Aware Routing API",
    description: "The world's first carbon-aware routing engine. Reduce your fleet's emissions by 15% with a single API call.",
    url: "https://ecoroute.ai",
    siteName: "EcoRoute",
    images: [
      {
        url: "https://ecoroute.ai/og-image.png",
        width: 1200,
        height: 630,
        alt: "EcoRoute Dashboard Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EcoRoute | Carbon-Aware Routing API",
    description: "Build sustainable logistics with the world's first carbon-aware routing engine.",
    images: ["https://ecoroute.ai/og-image.png"],
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EcoRoute",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0a0a0a" />
      </head>
      <body className={inter.className}>
        <Providers>
          <div className="bg-gradient-radial-top"></div>
          <Navbar />
          <main className="pt-24 min-h-screen">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}