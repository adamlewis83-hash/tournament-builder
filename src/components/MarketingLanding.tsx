import Link from "next/link";
import { GetTheApp } from "./GetTheApp";

// Server-rendered SEO landing template for the free-tool pages
// (/bracket-maker, /pickleball-round-robin, …). All copy is real HTML at
// request time so search engines index it; the interactive app stays at /new.
// These pages are web-marketing only — the native shell never navigates here.

export type Faq = { q: string; a: string };

export function MarketingLanding({
  kicker,
  title,
  intro,
  bullets,
  steps,
  faqs,
  related,
}: {
  kicker: string;
  title: string;
  intro: string;
  bullets: string[];
  steps: [string, string][];
  faqs: Faq[];
  related: { href: string; label: string }[];
}) {
  return (
    <div className="mx-auto max-w-2xl py-6">
      <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.22em] text-[var(--brand)] uppercase">
        <span className="h-2 w-2 rounded-full bg-[var(--win)]" />
        {kicker}
      </span>
      <h1 className="mt-3 text-3xl sm:text-4xl font-display font-bold tracking-tight leading-tight">
        {title}
      </h1>
      <p className="mt-3 text-lg text-[var(--muted)]">{intro}</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href="/new"
          className="rounded-xl bg-[var(--brand)] px-6 py-3 text-base font-bold text-white hover:brightness-105"
        >
          Start free — no sign-up
        </Link>
        <span className="text-sm text-[var(--muted)]">Works in your browser. Free.</span>
      </div>

      <ul className="mt-8 space-y-2.5">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2.5 text-[var(--foreground)]">
            <span className="mt-0.5 shrink-0 text-[var(--win)] font-bold">✓</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 mb-3 text-xl font-display font-bold">How it works</h2>
      <ol className="space-y-3">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-sm font-bold text-white">
              {i + 1}
            </span>
            <div>
              <p className="font-semibold">{t}</p>
              <p className="text-sm text-[var(--muted)]">{d}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className="mt-10 mb-3 text-xl font-display font-bold">Common questions</h2>
      <div className="space-y-4">
        {faqs.map((f) => (
          <div key={f.q}>
            <h3 className="font-semibold">{f.q}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">{f.a}</p>
          </div>
        ))}
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />

      <GetTheApp />

      <p className="mt-10 text-sm text-[var(--muted)]">
        More free tools:{" "}
        {related.map((r, i) => (
          <span key={r.href}>
            {i > 0 && " · "}
            <Link href={r.href} className="text-[var(--brand)] hover:underline">
              {r.label}
            </Link>
          </span>
        ))}
      </p>
    </div>
  );
}
