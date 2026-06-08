"use client";

import { Trophy } from "@/components/icons";
import { Tournament } from "@/lib/types";
import { pointsLeaderboard } from "@/lib/standings";
import { colorFor } from "@/lib/colors";
import { useStore } from "@/lib/store";
import { Avatar } from "./Avatar";
import { Button, Card } from "./ui";
import { Confetti } from "./Confetti";
import { ScheduleView } from "./ScheduleView";

export function AmericanoView({ t }: { t: Tournament }) {
  const generateNextRound = useStore((s) => s.generateNextRound);
  const isMexicano = t.format === "mexicano";

  const matches = t.matches.filter((m) => m.phase === "rr");
  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);
  const maxRound = rounds.length ? rounds[rounds.length - 1] : 0;
  const curRound = matches.filter((m) => m.round === maxRound);
  const curComplete = curRound.length > 0 && curRound.every((m) => m.scoreA !== null && m.scoreB !== null);
  const allScored = matches.length > 0 && matches.every((m) => m.scoreA !== null && m.scoreB !== null);

  const board = pointsLeaderboard(t.participants, matches);
  const moreRounds = isMexicano && maxRound < t.config.rounds;
  const complete = isMexicano ? allScored && !moreRounds : allScored;
  const champ = complete && board[0]?.pointsFor > 0 ? board[0] : null;

  return (
    <div className="space-y-5">
      {champ && (
        <>
          <Confetti trigger={champ.name} />
          <div className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/15 to-[var(--brand-soft)] p-6 text-center glow-brand">
            <Trophy className="h-12 w-12 mx-auto text-amber-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
            <div className="mt-2 text-xs uppercase tracking-[0.3em] text-amber-300 font-bold">
              {isMexicano ? "Mexicano" : "Americano"} Champion
            </div>
            <div className="mt-1 text-2xl font-extrabold">
              {champ.name} · {champ.pointsFor} pts
            </div>
          </div>
        </>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60">
        <div className="px-4 py-2.5 border-b border-[var(--border)] font-bold text-sm">
          Points leaderboard
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--muted)] border-b border-[var(--border)] bg-[var(--subtle)]">
              <th className="px-3 py-2 w-10">#</th>
              <th className="px-3 py-2">Player</th>
              <th className="px-2 py-2 text-center w-16">Pts</th>
              <th className="px-2 py-2 text-center w-12">GP</th>
              <th className="px-2 py-2 text-center w-16 hidden sm:table-cell">W–L</th>
            </tr>
          </thead>
          <tbody>
            {board.map((r, i) => (
              <tr
                key={r.participantId}
                className={`border-b border-[var(--border)] last:border-0 ${i === 0 && r.pointsFor > 0 ? "bg-[var(--win-bg)]" : ""}`}
              >
                <td className="px-3 py-2 font-bold text-[var(--muted)]">{r.rank}</td>
                <td className="px-3 py-2 font-medium">
                  <span className="flex items-center gap-2.5">
                    <Avatar name={r.name} color={colorFor(t.participants, r.participantId)} />
                    {r.name}
                  </span>
                </td>
                <td className="px-2 py-2 text-center tabular-nums font-bold">{r.pointsFor}</td>
                <td className="px-2 py-2 text-center tabular-nums text-[var(--muted)]">{r.played}</td>
                <td className="px-2 py-2 text-center tabular-nums text-[var(--muted)] hidden sm:table-cell">
                  {r.wins}–{r.losses}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 text-xs text-[var(--muted)] border-t border-[var(--border)]">
          Ranked by total points scored across every game you play.
        </div>
      </div>

      {isMexicano && (
        <Card className="no-print p-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-[var(--muted)]">
            Round {maxRound} of {t.config.rounds} · pairings set by the standings each round.
          </span>
          {moreRounds ? (
            <Button onClick={() => generateNextRound(t.id)} disabled={!curComplete}>
              {curComplete ? `Generate Round ${maxRound + 1} →` : `Finish Round ${maxRound} to continue`}
            </Button>
          ) : (
            allScored && <span className="text-sm font-medium text-[var(--win)]">All rounds played 🎉</span>
          )}
        </Card>
      )}

      <ScheduleView matches={matches} participants={t.participants} tournamentId={t.id} />
    </div>
  );
}
