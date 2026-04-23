import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap"
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://localseotracker.app"),
  title: "Local SEO Rank Tracker | Track Neighborhood Rankings for Small Businesses",
  description:
    "Track Google local rankings neighborhood-by-neighborhood, monitor competitors, and send weekly SEO reports without enterprise pricing.",
  openGraph: {
    title: "Local SEO Rank Tracker",
    description:
      "Monitor where your business appears in local search and get weekly competitor analysis for every neighborhood you serve.",
    url: "https://localseotracker.app",
    siteName: "Local SEO Rank Tracker",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Local SEO Rank Tracker",
    description:
      "Affordable local ranking intelligence for small businesses and agencies."
  },
  keywords: [
    "local SEO tracker",
    "google my business rankings",
    "near me seo",
    "local keyword tracking",
    "competitor analysis"
  ]
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-[#0d1117]">
      <body
        className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} min-h-screen bg-[#0d1117] text-slate-100 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
