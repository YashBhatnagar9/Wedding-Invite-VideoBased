import type { Metadata, Viewport } from "next";
import { Cormorant_Infant, Cormorant_Garamond, Jost } from "next/font/google";
import { SITE } from "@/lib/wedding";
import MusicPlayer from "@/components/MusicPlayer";
import "./globals.css";

// Reference card font (missing-piece-city-3): event/card names use
// 'Cormorant Infant' (--font-hero). Wired to --font-script so every
// existing `font-script` usage picks it up with no component edits.
const cormorantInfant = Cormorant_Infant({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-script",
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#2b0609",
};

export const metadata: Metadata = {
  // Resolves relative OG/Twitter image URLs to absolute ones and silences the
  // Next.js "metadataBase is not set" build warning. Override in production
  // with NEXT_PUBLIC_SITE_URL.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: SITE.title,
  description: SITE.description,
  openGraph: {
    title: SITE.title,
    description: SITE.description,
    type: "website",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${cormorantInfant.variable} ${cormorantGaramond.variable} ${jost.variable} h-full antialiased`}
    >
      {/* Outside the phone-frame: deep maroon backdrop on desktop */}
      <body className="min-h-full overflow-x-clip bg-[#2b0609] font-sans text-ink-900">
        {/* Mobile-first wrapper: 430px phone frame, centred with premium shadow */}
        <div className="relative mx-auto min-h-svh w-full max-w-[430px] overflow-x-clip bg-cream-50 text-ink-900 shadow-2xl shadow-black/60">
          {children}
          <MusicPlayer />
        </div>
      </body>
    </html>
  );
}
