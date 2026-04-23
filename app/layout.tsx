import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://localseoranktracker.com"),
  title: {
    default: "Local SEO Rank Tracker",
    template: "%s | Local SEO Rank Tracker",
  },
  description:
    "Track Google Maps rankings for every neighborhood you serve. Local SEO Rank Tracker shows your position, top competitors, and weekly wins in one dashboard.",
  keywords: [
    "local SEO tracker",
    "Google Maps ranking tracker",
    "near me SEO tool",
    "small business local SEO",
    "local competitor analysis",
  ],
  openGraph: {
    title: "Local SEO Rank Tracker",
    description:
      "Monitor local keyword rankings across neighborhoods and get weekly competitor analysis reports.",
    type: "website",
    url: "https://localseoranktracker.com",
    siteName: "Local SEO Rank Tracker",
  },
  twitter: {
    card: "summary_large_image",
    title: "Local SEO Rank Tracker",
    description:
      "Find out exactly where your business ranks in Google Maps and beat local competitors.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetBrainsMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0d1117] text-slate-100">
        {children}
      </body>
    </html>
  );
}
