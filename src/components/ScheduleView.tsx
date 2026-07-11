"use client";

import { Match, Participant } from "@/lib/types";
import { useStore } from "@/lib/store";
import { MatchCard, MasterClock } from "./MatchCard";
import { NowOnCourt } from "./NowOnCourt";

const bothSides = (m: Match) => m.sideA.length > 0 && m.sideB.length > 0;
const recorded = (m: Match) => m.scoreA !== null && m.scoreB !== null; // a result is in
const needsPlay = (m: Match) => bothSides(m) && !recorded(m);
const byCourt = (a: Match, b: Match) => (a.court ?? 0) - (b.court ?? 0);

export function ScheduleView({
  matches,
  participants,
  tournamentId,
  hero = false,
}: {
  matches: Match[];
  participants: Participant[];
  tournamentId: string;
  // When set, the current round's live matches are promoted to big "On court now" hero cards
  // (round-robin only). Every other schedule view keeps the compact grid.
  hero?: boolean;
}) {
  const timeLimitMin = useStore(
    (s) => s.tournaments.find((t) => t.id === tournamentId)?.config.timeLimitMin ?? 0,
  );
  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);

  // The current round = the lowest round that still has a game without a result. Its games are
  // the "on court now" heroes (kept whole so steppers don't make a card vanish mid-game); the
  // round advances only once every game in it has a score.
  const roundDone = (r: number) => !matches.some((m) => m.round === r && needsPlay(m));
  const activeRound = hero
    ? rounds.find((r) => matches.some((m) => m.round === r && bothSides(m)) && !roundDone(r))
    : undefined;
  const heroes =
    activeRound != null
      ? matches.filter((m) => m.round === activeRound && bothSides(m)).sort(byCourt)
      : [];
  const heroIds = new Set(heroes.map((m) => m.id));

  return (
    <div className="space-y-6">
      {heroes.length > 0 && (
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--win)] pulse-ring" />
              On court now
              <span className="text-xs font-normal text-[var(--muted)]">· Round {activeRound}</span>
            </h3>
            {timeLimitMin > 0 && <MasterClock tournamentId={tournamentId} round={activeRound ?? null} />}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {heroes.map((m) => (
              <NowOnCourt
                key={m.id}
                tournamentId={tournamentId}
                participants={participants}
                match={m}
              />
            ))}
          </div>
        </div>
      )}

      {rounds.map((r) => {
        const roundMatches = matches
          .filter((m) => m.round === r && !heroIds.has(m.id))
          .sort(byCourt);
        if (roundMatches.length === 0) return null;
        // Master clock only for a round that isn't already the hero round and still has live games.
        const showMaster =
          timeLimitMin > 0 && r !== activeRound && roundMatches.some(needsPlay);
        return (
          <div key={r}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
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
