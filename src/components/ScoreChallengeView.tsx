"use client";

import { useState } from "react";
import { Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import { colorFor, photoFor } from "@/lib/colors";
import { Avatar } from "./Avatar";
import { Card } from "./ui";

export function ScoreChallengeView({ t }: { t: Tournament }) {
  const setScore = useStore((s) => s.setScoreChallengeScore);
  const spectator = t.spectator === true;
  const [tab, setTab] = useState<"card" | "board">("card");

  const rounds = Math.max(1, t.config.rounds);
  const lowWins = t.config.scoreLowWins;
  const scores = t.scoreChallenge?.scores ?? {};

  const rowFor = (pid: string) => {
    const card = scores[pid] ?? [];
    const vals = card.slice(0, rounds).filter((v): v is number => v != null);
    return { total: vals.reduce((s, v) => s + v, 0), played: vals.length, card };
  };

  const ranked = [...t.participants]
    .map((p) => ({ p, ...rowFor(p.id) }))
    .sort((a, b) => {
      if (a.played === 0 && b.played === 0) return 0;
      if (a.played === 0) return 1;
      if (b.played === 0) return -1;
      return lowWins ? a.total - b.total : b.total - a.total;
    });

  const allDone =
    t.participants.length > 0 &&
    t.participants.every((p) => (scores[p.id]?.filter((v) => v != null).length ?? 0) >= rounds);
  const champ = allDone ? ranked[0]?.p : null;

  return (
    <div className="space-y-4">
      {champ && (
        <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/15 to-[var(--brand-soft)] p-5 text-center glow-brand">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-500 font-bold">Champion</p>
          <p className="text-2xl font-display font-bold flex items-center justify-center gap-2 mt-1">
            <Avatar name={champ.name} color={colorFor(t.participants, champ.id)} photo={champ.photo} className="h-8 w-8 text-sm" />
            {champ.name}
          </p>
          <p className="text-sm text-[var(--muted)] mt-1">
            {lowWins ? "Lowest" : "Highest"} total: {rowFor(champ.id).total}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex rounded-lg border bg-[var(--surface)] p-1">
          <TabBtn active={tab === "card"} onClick={() => setTab("card")}>Scorecard</TabBtn>
          <TabBtn active={tab === "board"} onClick={() => setTab("board")}>Leaderboard</TabBtn>
        </div>
        <span className="text-sm text-[var(--muted)]">
          {lowWins ? "Lowest" : "Highest"} total wins · {rounds} rounds
        </span>
      </div>

      {tab === "card" ? (
        <Card bare className="overflow-x-auto rounded-2xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--muted)] border-b border-[var(--border)]">
                <th className="text-left px-3 py-2 sticky left-0 bg-[var(--surface)]">Player</th>
                {Array.from({ length: rounds }, (_, r) => (
                  <th key={r} className="px-2 py-2 text-center w-14">
                    R{r + 1}
                  </th>
                ))}
                <th className="px-3 py-2 text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {t.participants.map((p) => {
                const row = rowFor(p.id);
                return (
                  <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-3 py-2 sticky left-0 bg-[var(--surface)]">
                      <span className="flex items-center gap-2">
                        <Avatar name={p.name} color={colorFor(t.participants, p.id)} photo={p.photo} className="h-6 w-6 text-[10px]" />
                        <span className="font-medium">{p.name}</span>
                      </span>
                    </td>
                    {Array.from({ length: rounds }, (_, r) => (
                      <td key={r} className="px-1 py-1 text-center">
                        <input
                          type="number"
                          inputMode="numeric"
                          disabled={spectator}
                          value={row.card[r] ?? ""}
                          onChange={(e) =>
                            setScore(t.id, p.id, r, e.target.value === "" ? null : Number(e.target.value))
                          }
                          className="w-12 rounded-md border border-[var(--border)] bg-[var(--input)] px-1 py-1 text-center tabular-nums outline-none focus:border-[var(--brand)] disabled:opacity-50"
                          placeholder="–"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-bold tabular-nums">{row.total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card bare className="overflow-hidden rounded-2xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--muted)] border-b border-[var(--border)]">
                <th className="text-left px-3 py-2 w-10">#</th>
                <th className="text-left px-3 py-2">Player</th>
                <th className="px-3 py-2 text-center">Played</th>
                <th className="px-3 py-2 text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r, i) => (
                <tr key={r.p.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-3 py-2 font-bold text-[var(--muted)]">{r.played ? i + 1 : "–"}</td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      <Avatar name={r.p.name} color={colorFor(t.participants, r.p.id)} photo={r.p.photo} className="h-6 w-6 text-[10px]" />
                      <span className="font-medium">{r.p.name}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums text-[var(--muted)]">
                    {r.played}/{rounds}
                  </td>
                  <td className="px-3 py-2 text-center font-bold tabular-nums">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
        active
          ? "bg-gradient-to-r from-[var(--brand)] to-[var(--brand-strong)] text-[var(--on-brand)]"
          : "text-[var(--muted)] hover:text-[var(--foreground)]"
      }`}
    >
      {children}
    </button>
  );
}
