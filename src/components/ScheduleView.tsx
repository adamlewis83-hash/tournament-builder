"use client";

import { Match, Participant } from "@/lib/types";
import { MatchCard } from "./MatchCard";

export function ScheduleView({
  matches,
  participants,
  tournamentId,
}: {
  matches: Match[];
  participants: Participant[];
  tournamentId: string;
}) {
  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);
  return (
    <div className="space-y-6">
      {rounds.map((r) => {
        const roundMatches = matches
          .filter((m) => m.round === r)
          .sort((a, b) => (a.court ?? 0) - (b.court ?? 0));
        return (
          <div key={r}>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 text-slate-950 text-xs font-bold">
                {r}
              </span>
              Round {r}
            </h3>
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
