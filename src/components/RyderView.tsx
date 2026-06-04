"use client";

import { useState } from "react";
import { Match, Participant, Tournament } from "@/lib/types";
import { ryderScore } from "@/lib/ryder";
import { useStore } from "@/lib/store";
import { Button, Card } from "./ui";
import { MatchCard } from "./MatchCard";
import { Confetti } from "./Confetti";

function PairingEditor({
  t,
  match,
  teamA,
  teamB,
}: {
  t: Tournament;
  match: Match;
  teamA: Participant[];
  teamB: Participant[];
}) {
  const setMatchSides = useStore((s) => s.setMatchSides);
  const slots = Math.max(match.sideA.length, 1);

  const setSlot = (side: "A" | "B", idx: number, value: string) => {
    const a = [...match.sideA];
    const b = [...match.sideB];
    const arr = side === "A" ? a : b;
    while (arr.length < slots) arr.push("");
    arr[idx] = value;
    setMatchSides(t.id, match.id, a.filter(Boolean), b.filter(Boolean));
  };

  const Select = ({ side, idx, options }: { side: "A" | "B"; idx: number; options: Participant[] }) => {
    const cur = (side === "A" ? match.sideA : match.sideB)[idx] ?? "";
    return (
      <select
        value={cur}
        onChange={(e) => setSlot(side, idx, e.target.value)}
        className="w-full rounded border border-[var(--border)] bg-black/30 px-1.5 py-1 text-sm outline-none focus:border-cyan-400/60"
      >
        <option value="">—</option>
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    );
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-2.5">
      <div className="text-[10px] uppercase tracking-widest text-[var(--muted)] font-bold mb-1.5">
        {match.label}
      </div>
      <div className="space-y-1.5">
        <div className="space-y-1">
          {Array.from({ length: slots }, (_, i) => (
            <Select key={`a${i}`} side="A" idx={i} options={teamA} />
          ))}
        </div>
        <div className="text-center text-[10px] text-[var(--muted)] font-bold">vs</div>
        <div className="space-y-1">
          {Array.from({ length: slots }, (_, i) => (
            <Select key={`b${i}`} side="B" idx={i} options={teamB} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function RyderView({ t }: { t: Tournament }) {
  // Default into captain's-picks mode until scoring has started.
  const [editing, setEditing] = useState(
    () => !t.matches.some((m) => m.phase === "ryder" && m.scoreA !== null),
  );
  const [nameA, nameB] = t.config.teamNames ?? ["Team A", "Team B"];
  const score = ryderScore(t.matches);
  const ryder = t.matches.filter((m) => m.phase === "ryder");
  const rounds = Array.from(new Set(ryder.map((m) => m.round))).sort((a, b) => a - b);
  const teamA = t.participants.filter((p) => p.team === 0);
  const teamB = t.participants.filter((p) => p.team === 1);

  const winnerName = score.status === "a-wins" ? nameA : score.status === "b-wins" ? nameB : null;
  const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

  return (
    <div className="space-y-5">
      {!editing && (winnerName || score.status === "tie") && (
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
            <div className="text-sm font-semibold text-cyan-300 truncate flex items-center justify-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              {nameA}
            </div>
            <div className="text-4xl font-extrabold tabular-nums">{fmt(score.a)}</div>
          </div>
          <div className="text-[var(--muted)] text-sm font-bold">vs</div>
          <div className="flex-1 text-center">
            <div className="text-sm font-semibold text-rose-300 truncate flex items-center justify-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              {nameB}
            </div>
            <div className="text-4xl font-extrabold tabular-nums">{fmt(score.b)}</div>
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-rose-400/30 overflow-hidden">
          <div className="h-full bg-cyan-400" style={{ width: `${score.total ? (score.a / score.total) * 100 : 50}%` }} />
        </div>
        <p className="text-center text-xs text-[var(--muted)] mt-2">
          {score.status === "in-progress"
            ? `${fmt(score.clinch)} points wins the cup · ${score.played}/${score.total} matches played`
            : "Final result"}
        </p>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--muted)]">
          {editing
            ? `Set partners & matchups — ${nameA} on top, ${nameB} on bottom.`
            : "Captain's picks: edit who partners whom and the matchups."}
        </p>
        <Button variant={editing ? "primary" : "outline"} className="px-3 py-1.5" onClick={() => setEditing((v) => !v)}>
          {editing ? "Done" : "Set pairings"}
        </Button>
      </div>

      {rounds.map((round) => {
        const ms = ryder.filter((m) => m.round === round).sort((a, b) => a.order - b.order);
        if (!ms.length) return null;
        const label = ms[0].label ?? `Round ${round}`;
        return (
          <div key={round}>
            <h3 className="font-semibold mb-2">{label}</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ms.map((m) =>
                editing ? (
                  <PairingEditor key={m.id} t={t} match={m} teamA={teamA} teamB={teamB} />
                ) : (
                  <MatchCard key={m.id} tournamentId={t.id} participants={t.participants} match={m} />
                ),
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
