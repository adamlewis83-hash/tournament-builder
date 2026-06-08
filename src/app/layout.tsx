import type { Metadata, Viewport } from "next";
import { Geist, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import { Trophy } from "@/components/icons";
import { SporosMark } from "@/components/SporosMark";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CloudSync } from "@/components/CloudSync";
import { BottomNav } from "@/components/BottomNav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const display = Space_Grotesk({ variable: "--font-display", subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: "Sporos — Run & score any tournament",
  description:
    "Run round robins, brackets, pool play, golf and more — with live shared scoring on every phone.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Sporos" },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f5f6f8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Set the theme before paint to avoid a flash.
const themeScript = `(function(){try{var t=localStorage.getItem('seeded-theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans overflow-x-hidden">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <CloudSync />
        <header className="no-print sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/70 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 font-display font-bold text-xl tracking-tight">
              <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-strong)] text-[var(--on-brand)] shadow-[0_0_20px_-4px_var(--glow)]">
                <SporosMark className="h-7 w-7 text-[var(--on-brand)]" />
              </span>
              <span className="brand-text">Sporos</span>
            </Link>
            <div className="flex items-center gap-3 sm:gap-4">
              <ThemeToggle />
              <Link
                href="/records"
                className="flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition"
              >
                <Trophy className="h-4 w-4" /> Records
              </Link>
              <Link
                href="/"
                className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition"
              >
                My Tournaments
              </Link>
            </div>
          </div>
        </header>
        <main className="relative z-10 flex-1 mx-auto w-full max-w-6xl px-4 pt-6 pb-24 sm:pb-6">
          {children}
        </main>
        <footer className="no-print relative z-10 border-t border-[var(--border)] py-4 pb-24 sm:pb-4 text-center text-xs text-[var(--muted)]">
          Sporos · plays offline · saved on your device
        </footer>
        <BottomNav />
      </body>
    </html>
  );
}
