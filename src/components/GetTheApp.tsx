"use client";

// Store links — set each to the live URL the moment that app is published, and the
// badge flips from "Coming soon" to a real link. No other change needed.
const PLAY_STORE_URL: string | null = null; // e.g. "https://play.google.com/store/apps/details?id=com.lewcrewlabs.sporos"
const APP_STORE_URL: string | null = null; // e.g. "https://apps.apple.com/app/idXXXXXXXXX"

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
      <path d="M16.36 12.78c.02 2.3 2.02 3.07 2.04 3.08-.02.05-.32 1.1-1.05 2.18-.63.94-1.29 1.87-2.33 1.89-1.02.02-1.35-.6-2.52-.6-1.16 0-1.53.58-2.5.62-1 .04-1.77-1.01-2.41-1.95-1.3-1.9-2.3-5.36-.96-7.7.66-1.16 1.85-1.9 3.14-1.92.99-.02 1.92.66 2.52.66.6 0 1.74-.82 2.93-.7.5.02 1.9.2 2.8 1.52-.07.05-1.67.98-1.65 2.92M14.6 6.42c.53-.64.89-1.53.79-2.42-.76.03-1.69.51-2.24 1.15-.49.56-.92 1.47-.8 2.33.85.07 1.71-.43 2.25-1.06"/>
    </svg>
  );
}

function PlayLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path d="M3.6 2.4 13.4 12 3.6 21.6c-.36-.2-.6-.6-.6-1.1V3.5c0-.5.24-.9.6-1.1Z" fill="#34d399" />
      <path d="m16.5 8.9 2.9 1.6c.9.5.9 1.7 0 2.2l-2.9 1.6L13.4 12l3.1-3.1Z" fill="#facc15" />
      <path d="M3.6 2.4c.3-.17.68-.18 1.02.02L16.5 8.9 13.4 12 3.6 2.4Z" fill="#38bdf8" />
      <path d="M3.6 21.6 13.4 12l3.1 3.1L4.62 21.58c-.34.2-.72.19-1.02.02Z" fill="#f87171" />
    </svg>
  );
}

function Badge({
  href,
  top,
  bottom,
  icon,
}: {
  href: string | null;
  top: string;
  bottom: string;
  icon: React.ReactNode;
}) {
  const soon = !href;
  const inner = (
    <div
      className={`inline-flex items-center gap-3 rounded-xl border px-4 py-2.5 transition ${
        soon
          ? "opacity-70 border-[var(--border)] bg-[var(--surface)]"
          : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover)]"
      }`}
    >
      <span className="shrink-0 text-[var(--foreground)]">{icon}</span>
      <span className="text-left leading-tight">
        <span className="block text-[10px] uppercase tracking-wide text-[var(--muted)]">
          {soon ? "Coming soon" : top}
        </span>
        <span className="block text-sm font-semibold">{bottom}</span>
      </span>
    </div>
  );
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  ) : (
    <span aria-disabled="true" title="Coming soon">
      {inner}
    </span>
  );
}

export function GetTheApp() {
  return (
    <section className="mt-10 text-center">
      <h2 className="text-lg font-bold">Get Sporos on your phone</h2>
      <p className="text-sm text-[var(--muted)] mt-1 mb-4">
        Install it like a native app — works offline, and live scores sync to everyone.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Badge href={APP_STORE_URL} top="Download on the" bottom="App Store" icon={<AppleLogo />} />
        <Badge href={PLAY_STORE_URL} top="Get it on" bottom="Google Play" icon={<PlayLogo />} />
      </div>
      <p className="text-xs text-[var(--muted)] mt-3">
        On iPhone today: open in Safari → <b>Share</b> → <b>Add to Home Screen</b>.
      </p>
    </section>
  );
}
