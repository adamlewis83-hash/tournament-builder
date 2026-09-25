"use client";

import { useSyncExternalStore } from "react";

const APP_STORE_URL = "https://apps.apple.com/us/app/sporos-tournament-builder/id6787539978";

// Flip to true once an App Store build that registers the sporos:// scheme is
// live. Before that, iOS answers the button with "address is invalid".
export const APP_OPENS_SCHEME = false;

// A round joined in Safari lives in Safari's storage, not the app's, so the
// friend who opens the app afterwards finds the round gone. iOS decides on its
// own whether a sporos.app link opens the app, and once someone has picked
// Safari it keeps picking Safari. The sporos:// link doesn't go through that
// choice at all: on an iPhone browser this offers it first.
export function OpenInApp({ path }: { path: string }) {
  const show = useSyncExternalStore(
    () => () => {},
    () => {
      if (!APP_OPENS_SCHEME) return false;
      const w = window as { Capacitor?: { isNativePlatform?: () => boolean } };
      if (w.Capacitor?.isNativePlatform?.()) return false;
      return /iPhone|iPad|iPod/.test(navigator.userAgent);
    },
    () => false,
  );
  if (!show) return null;

  return (
    <div className="rounded-xl border border-[var(--brand)]/40 bg-[var(--brand-soft)] p-4 text-center space-y-2">
      <a
        href={`sporos:/${path}`}
        className="block rounded-xl bg-[var(--brand)] px-5 py-3 font-semibold text-[var(--on-brand)] hover:opacity-90"
      >
        Open in the Sporos app →
      </a>
      <p className="text-xs text-[var(--muted)]">
        You&apos;re in Safari. Your rounds live in the app, so open it there.{" "}
        <a href={APP_STORE_URL} className="text-[var(--brand)] underline">
          Don&apos;t have Sporos? Get it
        </a>
      </p>
    </div>
  );
}
