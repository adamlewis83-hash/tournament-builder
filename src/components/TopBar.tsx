"use client";

import Link from "next/link";
import { SporosMark } from "@/components/SporosMark";

// App title bar: brand logo + wordmark, pinned to the top on every screen.
// Mirrors BottomNav's translucent, blurred treatment and respects the phone's
// safe-area inset so it clears the status bar / Dynamic Island.
export function TopBar() {
  return (
    <header
      className="no-print sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur-xl"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Sporos — home">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--brand)] to-[var(--brand-strong)] text-[var(--on-brand)] shadow-sm">
            <SporosMark className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">Sporos</span>
        </Link>
      </div>
    </header>
  );
}
