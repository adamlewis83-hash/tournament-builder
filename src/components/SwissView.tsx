"use client";

import { Trophy } from "@/components/icons";
import { Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import { computeStandings } from "@/lib/standings";
import { colorFor } from "@/lib/colors";
import { Button, Card } from "./ui";
import { ScheduleView } from "./ScheduleView";
import { StandingsTable } from "./StandingsTable";
import { Confetti } from "./Confetti";

export function SwissView({ t }: { t: Tournament }) {
  const generateNextRound = useStore((s) => s.generateNextRound);

  const matches = t.matches.filter((m) => m.phase === "rr");
  const maxRound = matches.reduce((mx, m) => Math.max(mx, m.round), 0);
  const cur = matches.filter((m) => m.round === maxRound);
  const curComplete = cur.length > 0 && cur.every((m) => m.scoreA !== null && m.scoreB !== null);
  const moreRounds = maxRound < t.config.rounds;
  const allDone = !moreRounds && curComplete;

  const standings = computeStandings(t.participants, matches, t.config.tiebreaker);
  const winner = standings[0];
  const playersWithBye = t.participants.length % 2 === 1;

  return (
    <div className="space-y-5">
      {allDone && winner && (
        <>
          <Confetti trigger={winner.name} />
          <div className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/15 to-[var(--brand-soft)] p-6 text-center glow-brand">
            <Trophy className="h-12 w-12 mx-auto text-amber-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
            <div className="mt-2 text-xs uppercase tracking-[0.3em] text-amber-300 font-bold">
              Swiss Winner
            </div>
            <div className="mt-1 flex items-center justify-center gap-2 text-2xl font-extrabold">
              <span
                className="h-3.5 w-3.5 rounded-full ring-2 ring-black/40"
                style={{ background: colorFor(t.participants, winner.participantId) }}
              />
              {winner.name}
            </div>
          </div>
        </>
      )}

      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <span className="font-semibold">
            Round {maxRound} of {t.config.rounds}
          </span>
          <span className="text-[var(--muted)]">
            {" "}
            · {curComplete ? "complete" : "in progress"}
            {playersWithBye && " · odd player count → one bye per round"}
          </span>
        </div>
        {moreRounds && (
          <Button onClick={() => generateNextRound(t.id)} disabled={!curComplete}>
            {curComplete ? `Generate Round ${maxRound + 1} →` : `Finish Round ${maxRound} to continue`}
          </Button>
        )}
        {allDone && <span className="text-sm font-medium text-[var(--win)]">All rounds played 🎉</span>}
      </Card>

      <StandingsTable
        participants={t.participants}
        matches={matches}
        title="Standings"
        tiebreaker={t.config.tiebreaker}
      />

      <ScheduleView matches={matches} participants={t.participants} tournamentId={t.id} />
    </div>
  );
}
