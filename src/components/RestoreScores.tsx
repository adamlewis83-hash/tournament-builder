"use client";

import { Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import { scoreCount } from "@/lib/snapshot";
import { Button } from "./ui";

/**
 * The way back from a setup save that cost you scores.
 *
 * Setup saves now carry scores forward wherever they still apply, but some changes
 * genuinely have to rebuild — a fresh draw, a different program — and those used to
 * be silent and final. An undo point is taken first, and this offers it back for as
 * long as the tournament is holding less scoring than the snapshot was.
 */
export function RestoreScores({ t }: { t: Tournament }) {
  const snap = useStore((s) => s.snapshot);
  const restore = useStore((s) => s.restoreSnapshot);
  const dismiss = useStore((s) => s.dismissSnapshot);
  if (!snap || snap.tournamentId !== t.id || t.spectator) return null;

  // Nothing was actually lost — the save carried everything through. Don't nag.
  const lost = snap.scores - scoreCount(t);
  if (lost <= 0) return null;

  return (
    <div className="no-print rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">
            {lost} score{lost === 1 ? "" : "s"} cleared by that setup change
          </div>
          <div className="text-xs text-[var(--muted)]">
            {snap.label} · everything can go back exactly as it was.
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => dismiss(t.id)}
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Dismiss
          </button>
          <Button
            className="px-3 py-1.5"
            onClick={() => {
              if (confirm(`Put back the ${snap.scores} scores from before that change?`))
                restore(t.id);
            }}
          >
            Undo · restore scores
          </Button>
        </div>
      </div>
    </div>
  );
}
