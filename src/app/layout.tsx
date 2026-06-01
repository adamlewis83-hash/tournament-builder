import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bracket Lab — Tournament Builder",
  description: "Build round robins, brackets, and pool-play tournaments for any sport.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b bg-[var(--surface)] sticky top-0 z-20">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--brand)] text-white text-sm">
                🏆
              </span>
              Bracket Lab
            </Link>
            <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
              My Tournaments
            </Link>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
        <footer className="border-t py-4 text-center text-xs text-[var(--muted)]">
          Bracket Lab · saved locally in your browser
        </footer>
      </body>
    </html>
  );
}
