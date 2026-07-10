"use client";

import { Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Button, Card } from "./ui";
import { ScheduleView } from "./ScheduleView";
import { StandingsTable } from "./StandingsTable";
import { BracketView } from "./BracketView";
import { Champion } from "./Champion";

export function PoolView({ t }: { t: Tournament }) {
  const generateFinals = useStore((s) => s.generateFinals);
  const clearFinals = useStore((s) => s.clearFinals);

  const poolMatches = t.matches.filter((m) => m.phase === "pool");
  const poolIds = Array.from(new Set(poolMatches.map((m) => m.poolId))).filter(Boolean) as string[];
  const finals = t.matches.filter(
    (m) => m.phase === "winners" || m.phase === "losers" || m.phase === "final" || m.phase === "championship",
  );
  const hasFinals = finals.length > 0;

  return (
    <div className="space-y-8">
      {poolIds.map((pid, i) => {
        const pm = poolMatches.filter((m) => m.poolId === pid);
        const ids = new Set(pm.flatMap((m) => [...m.sideA, ...m.sideB]));
        const poolParticipants = t.participants.filter((p) => ids.has(p.id));
        return (
          <div key={pid} className="space-y-3">
            <h2 className="text-lg font-bold">Pool {String.fromCharCode(65 + i)}</h2>
            <div className="grid lg:grid-cols-2 gap-4">
              <StandingsTable
                participants={poolParticipants}
                matches={pm}
                title="Standings"
                tiebreaker={t.config.tiebreaker}
          rankByWinPct={t.config.rankByWinPct}
              />
              <div>
                <ScheduleView matches={pm} participants={t.participants} tournamentId={t.id} />
              </div>
            </div>
          </div>
        );
      })}

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Championship Bracket</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => generateFinals(t.id)}>
              {hasFinals ? "Re-seed" : "Generate bracket"}
            </Button>
            {hasFinals && (
              <Button variant="danger" onClick={() => clearFinals(t.id)}>
                Clear
              </Button>
            )}
          </div>
        </div>
        {!hasFinals && (
          <p className="text-sm text-[var(--muted)]">
            Seeds the top finishers from each pool into a{" "}
            {t.config.bracketType === "double" ? "double" : "single"}-elimination bracket
            ({t.config.advanceCount} teams total).
          </p>
        )}
        {hasFinals && (
          <>
            <Champion matches={t.matches} participants={t.participants} />
            <BracketView matches={finals} participants={t.participants} tournamentId={t.id} />
          </>
        )}
      </Card>
    </div>
  );
}
