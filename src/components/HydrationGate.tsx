"use client";

import { ReactNode, useEffect, useState } from "react";

export function HydrationGate({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div className="py-20 text-center text-sm text-[var(--muted)]">Loading your tournaments…</div>
    );
  }
  return <>{children}</>;
}
