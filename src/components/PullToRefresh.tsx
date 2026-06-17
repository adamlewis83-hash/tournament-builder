"use client";

import { useEffect, useRef, useState } from "react";

const THRESHOLD = 70; // px of pull needed to trigger a refresh

// Pull down at the top of the page to reload + pull the latest version.
// Especially useful in the installed app, which has no browser refresh button.
export function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      startY.current =
        window.scrollY <= 0 && e.touches.length === 1 ? e.touches[0].clientY : null;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current == null || refreshingRef.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && window.scrollY <= 0) {
        const p = Math.min(dy * 0.5, 120); // resistance + cap
        pullRef.current = p;
        setPull(p);
        if (p > 4 && e.cancelable) e.preventDefault(); // take over the gesture
      } else {
        pullRef.current = 0;
        setPull(0);
      }
    };
    const onEnd = async () => {
      if (startY.current == null) return;
      startY.current = null;
      if (pullRef.current >= THRESHOLD && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPull(THRESHOLD);
        try {
          const reg = await navigator.serviceWorker?.getRegistration();
          await reg?.update();
        } catch {
          /* ignore */
        }
        window.location.reload();
      } else {
        pullRef.current = 0;
        setPull(0);
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

  if (pull <= 0 && !refreshing) return null;
  const y = refreshing ? THRESHOLD : pull;
  return (
    <div
      className="no-print fixed top-0 inset-x-0 z-[60] flex justify-center pointer-events-none"
      style={{
        transform: `translateY(${y - 46}px)`,
        transition: startY.current == null ? "transform 0.25s ease" : "none",
      }}
    >
      <div className="mt-3 h-9 w-9 grid place-items-center rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-md">
        <svg
          viewBox="0 0 24 24"
          className={`h-5 w-5 text-[var(--brand)] ${refreshing ? "animate-spin" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={refreshing ? undefined : { transform: `rotate(${Math.min(pull * 3, 270)}deg)` }}
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round" />
          <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
