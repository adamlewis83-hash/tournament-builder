"use client";

import { useEffect, useState } from "react";

const APP_STORE_ID = "6787539978";
const WRITE_REVIEW_URL = `https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`;
const DISMISSED_KEY = "sporos-rate-prompted";

type CapacitorGlobal = {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    Plugins?: { InAppReview?: { requestReview?: () => Promise<void> } };
  };
};

// One-shot "enjoying Sporos?" card under the crown moment. Only inside the
// native iOS shell (web visitors may not even have the app), and only once —
// whichever button they tap, we never ask again. Prefers the native in-app
// review sheet when a future shell ships the plugin; today's 1.0 shell falls
// back to the App Store's write-review page, which needs no plugin.
export function RatePrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const w = window as CapacitorGlobal;
    if (!w.Capacitor?.isNativePlatform?.()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    setShow(true);
  }, []);

  if (!show) return null;

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShow(false);
  }

  async function rate() {
    const w = window as CapacitorGlobal;
    dismiss();
    const native = w.Capacitor?.Plugins?.InAppReview?.requestReview;
    if (native) {
      try {
        await native();
        return;
      } catch {
        /* fall through to the store page */
      }
    }
    window.open(WRITE_REVIEW_URL, "_blank");
  }

  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
      <p className="text-sm font-semibold">Enjoying Sporos?</p>
      <p className="mt-0.5 text-xs text-[var(--muted)]">
        A quick rating helps other organizers find it.
      </p>
      <div className="mt-3 flex items-center justify-center gap-3">
        <button
          onClick={rate}
          className="rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white hover:brightness-105"
        >
          Rate Sporos ★
        </button>
        <button onClick={dismiss} className="text-sm text-[var(--muted)] hover:underline">
          No thanks
        </button>
      </div>
    </div>
  );
}
