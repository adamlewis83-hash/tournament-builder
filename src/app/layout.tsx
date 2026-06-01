import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bracket Lab — Tournament Builder",
  description: "Build round robins, brackets, and pool-play tournaments for any sport.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Bracket Lab" },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#060a14",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="no-print sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/70 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 font-extrabold text-xl tracking-tight">
              <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 text-slate-950 text-lg shadow-[0_0_20px_-4px_rgba(34,211,238,0.7)]">
                🏆
              </span>
              <span className="brand-text">BRACKET LAB</span>
            </Link>
            <Link
              href="/"
              className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition"
            >
              My Tournaments
            </Link>
          </div>
        </header>
        <main className="relative z-10 flex-1 mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
        <footer className="no-print relative z-10 border-t border-[var(--border)] py-4 text-center text-xs text-[var(--muted)]">
          Bracket Lab · plays offline · saved on your device
        </footer>
      </body>
    </html>
  );
}
