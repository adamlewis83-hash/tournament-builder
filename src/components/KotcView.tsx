"use client";

import { Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import { computeStandings } from "@/lib/standings";
import { colorFor } from "@/lib/colors";
import { Button, Card } from "./ui";
import { MatchCard } from "./MatchCard";
import { StandingsTable } from "./StandingsTable";
import { Confetti } from "./Confetti";

export function KotcView({ t }: { t: Tournament }) {
  const generateNextRound = useStore((s) => s.generateNextRound);

  const games = [...t.matches].filter((m) => m.phase === "rr").sort((a, b) => a.round - b.round);
  const current = games[games.length - 1];
  const currentDecided =
    current && current.scoreA !== null && current.scoreB !== null && current.scoreA !== current.scoreB;

  const standings = computeStandings(t.participants, t.matches, t.config.tiebreaker);
  const topWins = standings.reduce((mx, r) => Math.max(mx, r.wins), 0);
  const target = t.config.advanceCount;
  const champ = topWins >= target ? standings[0] : null;

  return (
    <div className="space-y-5">
      {champ && (
        <>
          <Confetti trigger={champ.name} />
          <div className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/15 to-cyan-400/10 p-6 text-center glow-brand">
            <div className="text-5xl">👑</div>
            <div className="mt-2 text-xs uppercase tracking-[0.3em] text-amber-300 font-bold">
              King of the Court
            </div>
            <div className="mt-1 flex items-center justify-center gap-2 text-2xl font-extrabold">
              <span
                className="h-3.5 w-3.5 rounded-full ring-2 ring-black/40"
                style={{ background: colorFor(t.participants, champ.participantId) }}
              />
              {champ.name}
            </div>
            <div className="mt-1 text-sm text-[var(--muted)]">
              First to {target} wins
            </div>
          </div>
        </>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">On the court</h3>
            <span className="text-xs text-[var(--muted)]">Game {games.length}</span>
          </div>
          {current && (
            <MatchCard tournamentId={t.id} participants={t.participants} match={current} />
          )}
          <p className="text-xs text-[var(--muted)] mt-3">
            Winner stays on · loser goes to the back of the line · first to {target} wins takes the
            crown 👑
          </p>
          {!champ && (
            <Button
              onClick={() => generateNextRound(t.id)}
              disabled={!currentDecided}
              className="w-full mt-4"
            >
              {currentDecided ? "Next game →" : "Enter the score to continue"}
            </Button>
          )}
        </Card>

        <StandingsTable
          participants={t.participants}
          matches={t.matches}
          title="Leaderboard"
          highlightTop={1}
          tiebreaker={t.config.tiebreaker}
          footnote={`First to ${target} wins takes the crown · ties broken by point differential`}
        />
      </div>
    </div>
  );
}
