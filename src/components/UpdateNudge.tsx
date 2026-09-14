"use client";

import { useEffect, useRef, useState } from "react";

// The iOS shell loads sporos.app once and can then live in the background for
// days — reopening it from the app switcher is NOT a page load, so the phone
// quietly falls behind the web. This remembers which deploy the page booted
// with and, whenever the app comes back to the foreground (throttled), asks
// the server which deploy is live now. A mismatch offers a refresh — never
// forces one, because someone may be mid-scoring.
const CHECK_EVERY = 15 * 60_000;

export function UpdateNudge() {
  const [updateReady, setUpdateReady] = useState(false);
  const bootSha = useRef<string | null>(null);
  const lastCheck = useRef(0);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      if (Date.now() - lastCheck.current < CHECK_EVERY) return;
      lastCheck.current = Date.now();
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        if (!r.ok) return;
        const { sha } = (await r.json()) as { sha: string | null };
        if (!alive || !sha) return; // dev, or Vercel didn't stamp a sha
        if (bootSha.current === null) bootSha.current = sha;
        else if (sha !== bootSha.current) setUpdateReady(true);
      } catch {
        /* offline — try again next resume */
      }
    };
    check(); // learn the boot sha right away
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!updateReady) return null;
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="no-print fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 rounded-full border border-[var(--brand)]/40 bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--brand)] shadow-lg backdrop-blur transition hover:bg-[var(--brand-soft)]"
    >
      ↻ Update ready — tap to refresh
    </button>
  );
}
