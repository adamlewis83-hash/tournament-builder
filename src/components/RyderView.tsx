"use client";

import { Tournament } from "@/lib/types";
import { ryderScore } from "@/lib/ryder";
import { Card } from "./ui";
import { MatchCard } from "./MatchCard";
import { Confetti } from "./Confetti";

export function RyderView({ t }: { t: Tournament }) {
  const [nameA, nameB] = t.config.teamNames ?? ["Team A", "Team B"];
  const score = ryderScore(t.matches);
  const ryder = t.matches.filter((m) => m.phase === "ryder");
  const rounds = Array.from(new Set(ryder.map((m) => m.round))).sort((a, b) => a - b);

  const winnerName =
    score.status === "a-wins" ? nameA : score.status === "b-wins" ? nameB : null;

  const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

  return (
    <div className="space-y-5">
      {(winnerName || score.status === "tie") && (
        <>
          {winnerName && <Confetti trigger={winnerName} />}
          <div className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/15 to-cyan-400/10 p-6 text-center glow-brand">
            <div className="text-5xl">🏆</div>
            <div className="mt-2 text-xs uppercase tracking-[0.3em] text-amber-300 font-bold">
              {score.status === "tie" ? "Cup Retained — Tie" : "Cup Winner"}
            </div>
            <div className="mt-1 text-2xl font-extrabold">
              {winnerName ?? `${nameA} ${fmt(score.a)} – ${fmt(score.b)} ${nameB}`}
            </div>
          </div>
        </>
      )}

      {/* Scoreboard */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            <div className="text-sm font-semibold text-cyan-300 truncate">{nameA}</div>
            <div className="text-4xl font-extrabold tabular-nums">{fmt(score.a)}</div>
          </div>
          <div className="text-[var(--muted)] text-sm font-bold">vs</div>
          <div className="flex-1 text-center">
            <div className="text-sm font-semibold text-rose-300 truncate">{nameB}</div>
            <div className="text-4xl font-extrabold tabular-nums">{fmt(score.b)}</div>
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-rose-400/30 overflow-hidden">
          <div
            className="h-full bg-cyan-400"
            style={{ width: `${score.total ? (score.a / score.total) * 100 : 50}%` }}
          />
        </div>
        <p className="text-center text-xs text-[var(--muted)] mt-2">
          {score.status === "in-progress"
            ? `${fmt(score.clinch)} points wins the cup · ${score.played}/${score.total} matches played`
            : "Final result"}
        </p>
      </Card>

      {rounds.map((round) => {
        const ms = ryder.filter((m) => m.round === round).sort((a, b) => a.order - b.order);
        if (!ms.length) return null;
        const label = ms[0].label ?? `Round ${round}`;
        return (
          <div key={round}>
            <h3 className="font-semibold mb-2">{label}</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ms.map((m) => (
                <MatchCard key={m.id} tournamentId={t.id} participants={t.participants} match={m} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
