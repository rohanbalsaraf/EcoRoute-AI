import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from "../components/Providers";
import Navbar from "../components/Navbar";
import "../styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EcoRoute | Carbon-Aware Routing API",
  description: "Next-generation API-first platform for zero-emission logistics and carbon-aware routing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="bg-gradient-radial-top"></div>
          <Navbar />
          <main className="pt-24 min-h-screen">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}