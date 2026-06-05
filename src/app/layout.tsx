import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CloudSync } from "@/components/CloudSync";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Seeded — Run & score any tournament",
  description:
    "Run round robins, brackets, pool play, golf and more — with live shared scoring on every phone.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Seeded" },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0f0d" },
    { media: "(prefers-color-scheme: light)", color: "#eef4f0" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Set the theme before paint to avoid a flash.
const themeScript = `(function(){try{var t=localStorage.getItem('seeded-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <CloudSync />
        <header className="no-print sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/70 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 font-extrabold text-xl tracking-tight">
              <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-strong)] text-[var(--on-brand)] text-lg shadow-[0_0_20px_-4px_var(--glow)]">
                🌱
              </span>
              <span className="brand-text">SEEDED</span>
            </Link>
            <div className="flex items-center gap-3 sm:gap-4">
              <ThemeToggle />
              <Link
                href="/records"
                className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition"
              >
                🏆 Records
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
        <main className="relative z-10 flex-1 mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
        <footer className="no-print relative z-10 border-t border-[var(--border)] py-4 text-center text-xs text-[var(--muted)]">
          Seeded · plays offline · saved on your device
        </footer>
      </body>
    </html>
  );
}
