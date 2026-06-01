"use client";

import { Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Button, Card } from "./ui";
import { StandingsTable } from "./StandingsTable";
import { BracketView } from "./BracketView";
import { Champion } from "./Champion";

export function FinalsPanel({ t }: { t: Tournament }) {
  const generateFinals = useStore((s) => s.generateFinals);
  const clearFinals = useStore((s) => s.clearFinals);

  const rrMatches = t.matches.filter((m) => m.phase === "rr");
  const finals = t.matches.filter(
    (m) => m.phase === "winners" || m.phase === "losers" || m.phase === "final" || m.phase === "championship",
  );
  const rrComplete =
    rrMatches.length > 0 && rrMatches.every((m) => m.scoreA !== null && m.scoreB !== null);
  const hasFinals = finals.length > 0;

  return (
    <div className="space-y-5">
      <StandingsTable
        participants={t.participants}
        matches={rrMatches}
        highlightTop={t.config.advanceCount}
        title="Round Robin Standings"
        tiebreaker={t.config.tiebreaker}
      />

      {!hasFinals && (
        <Card className="p-5 text-center">
          <p className="font-medium">Finals: top {t.config.advanceCount} advance</p>
          <p className="text-sm text-[var(--muted)] mt-1 mb-3">
            {t.playStyle === "doubles"
              ? `Seeds will be paired best-with-worst (e.g. 1 & ${t.config.advanceCount} vs 2 & ${t.config.advanceCount - 1}).`
              : "Seeds drawn from the standings above."}
            {!rrComplete && " You can generate now or wait until every round-robin game is in."}
          </p>
          <Button onClick={() => generateFinals(t.id)}>Generate finals →</Button>
        </Card>
      )}

      {hasFinals && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Finals</h3>
            <Button variant="outline" onClick={() => generateFinals(t.id)} title="Rebuild from current standings">
              Re-seed
            </Button>
          </div>
          <Champion matches={t.matches} participants={t.participants} />
          <BracketView matches={finals} participants={t.participants} tournamentId={t.id} />
          <div className="text-right">
            <Button variant="danger" onClick={() => clearFinals(t.id)}>
              Clear finals
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
