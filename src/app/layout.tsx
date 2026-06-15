import type { Metadata, Viewport } from "next";
import { Geist, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { CloudSync } from "@/components/CloudSync";
import { BottomNav } from "@/components/BottomNav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const display = Space_Grotesk({ variable: "--font-display", subsets: ["latin"], weight: ["500", "700"] });

const SITE_URL = "https://sporos.app";
const TITLE = "Sporos — Run & score any tournament";
const DESC =
  "Run round robins, brackets, pool play, golf and more — with live shared scoring on every phone.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESC,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Sporos" },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
  openGraph: {
    type: "website",
    siteName: "Sporos",
    title: TITLE,
    description: DESC,
    url: SITE_URL,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Sporos — Where competition takes root" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: "Run & score any tournament, live on every phone.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#f5f6f8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // lock zoom so the app can't be panned sideways (native-app feel)
  viewportFit: "cover",
};

// Set the theme before paint to avoid a flash.
const themeScript = `(function(){try{var t=localStorage.getItem('seeded-theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

// Register the service worker as early as possible so PWA tooling + browsers detect it on first paint.
const swScript = `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(){});}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans overflow-x-hidden">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: swScript }} />
        <CloudSync />
        <main className="relative z-10 flex-1 mx-auto w-full max-w-6xl px-4 pt-6 pb-24">
          {children}
        </main>
        <footer className="no-print relative z-10 border-t border-[var(--border)] py-4 pb-24 text-center text-xs text-[var(--muted)]">
          Sporos · plays offline · saved on your device ·{" "}
          <Link href="/privacy" className="hover:underline">
            Privacy
          </Link>
        </footer>
        <BottomNav />
      </body>
    </html>
  );
}
