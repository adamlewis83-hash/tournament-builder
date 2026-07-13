"use client";

import { Tournament } from "@/lib/types";
import { getResult } from "@/lib/result";

// SEED → PLAY → CROWN stage chips: the app's arc vocabulary on the tournament
// detail page. Derived purely from existing state — SEED = !generated,
// PLAY = generated & not complete, CROWN = complete. Formats with no real
// seeding step collapse to PLAY → CROWN.
const SEEDED_FORMATS = new Set([
  "round-robin",
  "swiss",
  "kotc",
  "single-elim",
  "double-elim",
  "pool-bracket",
  "ladder",
]);

type Stage = "seed" | "play" | "crown";
const LABELS: Record<Stage, string> = { seed: "SEED", play: "PLAY", crown: "CROWN" };

export function StageChips({ t }: { t: Tournament }) {
  const complete = getResult(t).complete;
  const stages: Stage[] = SEEDED_FORMATS.has(t.format)
    ? ["seed", "play", "crown"]
    : ["play", "crown"];
  const active: Stage = !t.generated ? (stages.includes("seed") ? "seed" : "play") : complete ? "crown" : "play";
  const activeIdx = stages.indexOf(active);

  return (
    <div className="mt-2 flex items-center gap-1.5" aria-label="Tournament stage">
      {stages.map((s, i) => {
        const base =
          "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide";
        const cls =
          i < activeIdx
            ? // completed stage — ✓ with win tint
              `${base} border-[var(--win)]/40 bg-[var(--win-bg)] text-[var(--win)]`
            : i === activeIdx
              ? s === "crown"
                ? // the crown moment is gold
                  `${base} border-amber-400 bg-amber-400 text-black/80`
                : `${base} border-[var(--brand)] bg-[var(--brand)] text-[var(--on-brand)]`
              : // upcoming
                `${base} border-[var(--border)] text-[var(--muted)]`;
        return (
          <span key={s} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-[10px] text-[var(--muted)]">→</span>}
            <span className={cls}>
              {i < activeIdx && <span aria-hidden>✓</span>}
              {s === "play" && i === activeIdx && t.liveCode && !complete && (
                <span className="h-1.5 w-1.5 rounded-full bg-rose-300 pulse-ring" />
              )}
              {LABELS[s]}
            </span>
          </span>
        );
      })}
    </div>
  );
}
