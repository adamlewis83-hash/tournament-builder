"use client";

import { Match, Participant } from "@/lib/types";
import { useStore } from "@/lib/store";
import { MatchCard, MasterClock } from "./MatchCard";

export function ScheduleView({
  matches,
  participants,
  tournamentId,
}: {
  matches: Match[];
  participants: Participant[];
  tournamentId: string;
}) {
  const timeLimitMin = useStore(
    (s) => s.tournaments.find((t) => t.id === tournamentId)?.config.timeLimitMin ?? 0
  );
  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);

  // A match shows a clock when both sides are set and it isn't decided yet.
  const hasLiveTimer = (m: Match) =>
    m.sideA.length > 0 &&
    m.sideB.length > 0 &&
    !(m.scoreA !== null && m.scoreB !== null && m.scoreA !== m.scoreB);

  return (
    <div className="space-y-6">
      {rounds.map((r) => {
        const roundMatches = matches
          .filter((m) => m.round === r)
          .sort((a, b) => (a.court ?? 0) - (b.court ?? 0));
        const showMaster = timeLimitMin > 0 && roundMatches.some(hasLiveTimer);
        return (
          <div key={r}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--brand-strong)] text-[var(--on-brand)] text-xs font-bold">
                  {r}
                </span>
                Round {r}
              </h3>
              {showMaster && <MasterClock tournamentId={tournamentId} round={r} />}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {roundMatches.map((m) => (
                <MatchCard
                  key={m.id}
                  tournamentId={tournamentId}
                  participants={participants}
                  match={m}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
