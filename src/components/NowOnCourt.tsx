"use client";

import { Match, Participant } from "@/lib/types";
import { useStore } from "@/lib/store";
import { canEditScores } from "@/lib/perms";
import { Side, MatchTimer } from "./MatchCard";
import { isFinal, winMargin } from "@/lib/score";

// The featured "on court now" match — big tappable scores + large steppers, a Leading badge,
// and the synced court timer. Used only in the round-robin schedule; the compact MatchCard
// still renders every other match. Read-only (no steppers) for spectators without scoring rights.
export function NowOnCourt({
  tournamentId,
  participants,
  match,
}: {
  tournamentId: string;
  participants: Participant[];
  match: Match;
}) {
  const t = useStore((s) => s.tournaments.find((x) => x.id === tournamentId));
  const scoreLive = useStore((s) => s.scoreLive);
  const bumpScore = useStore((s) => s.bumpScore);
  const endMatch = useStore((s) => s.endMatch);
  const timeLimitMin = t?.config.timeLimitMin ?? 0;
  const canEdit = t ? canEditScores(t) : false;

  const a = match.scoreA;
  const b = match.scoreB;
  const decided = isFinal(match) && a !== b;
  const started = a !== null || b !== null;
  const aLead = (a ?? 0) > (b ?? 0) && started;
  const bLead = (b ?? 0) > (a ?? 0) && started;
  const target = t?.config.pointsTo ?? 0;
  const margin = t ? winMargin(t.config) : 2;

  // Every edit here is live: the game keeps playing until it's won or the host
  // ends it, so a point-by-point score never reads as a final result.
  const commit = (side: "A" | "B", v: number | null) => {
    if (side === "A") scoreLive(tournamentId, match.id, v, match.scoreB);
    else scoreLive(tournamentId, match.id, match.scoreA, v);
  };
  // Steppers go through the store so rapid taps stay atomic (computing from the
  // prop here would let two quick taps both read the same stale score).
  const step = (side: "A" | "B", delta: number) => bumpScore(tournamentId, match.id, side, delta);

  return (
    <div className="rounded-2xl border border-[var(--brand)]/30 bg-[var(--surface)] shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--brand-soft)]/50 px-3 py-1.5">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--brand)]">
          {[match.label, match.court ? `Court ${match.court}` : "On court"].filter(Boolean).join(" · ")}
        </span>
        {timeLimitMin > 0 && !decided && (
          <MatchTimer minutes={timeLimitMin} tournamentId={tournamentId} match={match} />
        )}
      </div>

      <div className="divide-y divide-[var(--border)]">
        {(["A", "B"] as const).map((side) => {
          const ids = side === "A" ? match.sideA : match.sideB;
          const label = side === "A" ? match.sideALabel : match.sideBLabel;
          const score = side === "A" ? a : b;
          const lead = side === "A" ? aLead : bLead;
          return (
            <div
              key={side}
              className={`flex items-center gap-2 px-3 py-3 transition ${lead ? "bg-[var(--win-bg)]" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <Side ids={ids} label={label} participants={participants} />
                {lead && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[var(--win)]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--win)]">
                    {decided ? "Won" : "▲ Leading"}
                  </span>
                )}
              </div>

              {canEdit ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    aria-label={`Minus one for side ${side}`}
                    onClick={() => step(side, -1)}
                    disabled={(score ?? 0) <= 0}
                    className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--border)] text-xl font-bold text-[var(--muted)] transition hover:bg-[var(--hover)] disabled:opacity-30"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    aria-label={`Score for side ${side}`}
                    value={score ?? ""}
                    onChange={(e) => commit(side, e.target.value === "" ? null : Number(e.target.value))}
                    placeholder="–"
                    className={`w-16 rounded-xl border bg-[var(--input)] py-1.5 text-center text-3xl font-extrabold tabular-nums outline-none transition ${
                      lead
                        ? "border-[var(--win)] text-[var(--win)]"
                        : "border-[var(--border)] text-[var(--foreground)] focus:border-[var(--brand)]"
                    }`}
                  />
                  <button
                    type="button"
                    aria-label={`Plus one for side ${side}`}
                    onClick={() => step(side, 1)}
                    className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--brand)] text-xl font-bold text-[var(--on-brand)] transition hover:opacity-90"
                  >
                    +
                  </button>
                </div>
              ) : (
                <span
                  className={`w-16 text-center text-3xl font-extrabold tabular-nums ${
                    lead ? "text-[var(--win)]" : "text-[var(--foreground)]"
                  }`}
                >
                  {score ?? "–"}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {canEdit && (
        <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] px-3 py-2">
          <span className="text-[11px] text-[var(--muted)]">
            {isFinal(match)
              ? "Final"
              : target > 0
                ? `First to ${target}${margin > 1 ? `, win by ${margin}` : ""}`
                : "Tap End game when it's over"}
          </span>
          {isFinal(match) ? (
            <button
              type="button"
              onClick={() => endMatch(tournamentId, match.id, false)}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--muted)] transition hover:bg-[var(--hover)]"
            >
              Reopen
            </button>
          ) : (
            <button
              type="button"
              onClick={() => endMatch(tournamentId, match.id, true)}
              disabled={!started}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium transition hover:bg-[var(--hover)] disabled:opacity-40"
            >
              End game
            </button>
          )}
        </div>
      )}
    </div>
  );
}
