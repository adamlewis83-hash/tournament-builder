"use client";

import { GOLF_MODE_LABELS, GolfMode, Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import { computeGolf, formatToPar } from "@/lib/golf";
import { colorFor } from "@/lib/colors";
import { Card } from "./ui";

const SWITCHABLE: GolfMode[] = ["stroke", "stableford", "skins"];

export function GolfView({ t }: { t: Tournament }) {
  const patch = useStore((s) => s.patchTournament);
  const setGolfScore = useStore((s) => s.setGolfScore);
  const g = t.golf;
  if (!g) return null;

  const isScramble = t.config.golfMode === "scramble";
  const mode: GolfMode = isScramble
    ? "scramble"
    : SWITCHABLE.includes(t.config.golfMode)
      ? t.config.golfMode
      : "stroke";
  const strokeLike = mode === "stroke" || mode === "scramble";
  const rows = computeGolf(t, mode);
  const holes = Array.from({ length: g.holes }, (_, i) => i);
  const totalPar = g.pars.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5">
      {isScramble ? (
        <div className="inline-flex rounded-lg border border-[var(--border)] bg-cyan-400/10 px-3.5 py-1.5 text-sm font-semibold text-cyan-300">
          {GOLF_MODE_LABELS.scramble}
        </div>
      ) : (
        <div className="no-print inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
          {SWITCHABLE.map((m) => (
            <button
              key={m}
              onClick={() => patch(t.id, { config: { ...t.config, golfMode: m } })}
              className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                mode === m
                  ? "bg-gradient-to-r from-cyan-400 to-indigo-400 text-slate-950"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {GOLF_MODE_LABELS[m]}
            </button>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60">
        <div className="px-4 py-2.5 border-b border-[var(--border)] font-bold text-sm">
          {GOLF_MODE_LABELS[mode]} · Leaderboard
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--muted)] border-b border-[var(--border)] bg-white/[0.03]">
              <th className="px-3 py-2 w-10">#</th>
              <th className="px-3 py-2">Player</th>
              <th className="px-2 py-2 text-center w-14">Thru</th>
              {strokeLike && <th className="px-2 py-2 text-center w-16">To Par</th>}
              {mode === "stableford" && <th className="px-2 py-2 text-center w-16">Points</th>}
              {mode === "skins" && <th className="px-2 py-2 text-center w-14">Skins</th>}
              <th className="px-2 py-2 text-center w-16">Gross</th>
              {strokeLike && <th className="px-2 py-2 text-center w-14">Net</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.participantId} className={`border-b border-[var(--border)] last:border-0 ${i === 0 ? "bg-lime-400/[0.07]" : ""}`}>
                <td className="px-3 py-2 font-bold text-[var(--muted)]">{r.thru ? i + 1 : "–"}</td>
                <td className="px-3 py-2 font-medium">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full ring-1 ring-black/40 shrink-0"
                      style={{ background: colorFor(t.participants, r.participantId) }}
                    />
                    {r.name}
                    {r.handicap > 0 && <span className="text-xs text-[var(--muted)]">({r.handicap})</span>}
                  </span>
                </td>
                <td className="px-2 py-2 text-center tabular-nums">{r.thru ? `${r.thru}` : "–"}</td>
                {strokeLike && (
                  <td className="px-2 py-2 text-center tabular-nums font-bold">
                    {r.thru ? formatToPar(r.toPar) : "–"}
                  </td>
                )}
                {mode === "stableford" && (
                  <td className="px-2 py-2 text-center tabular-nums font-bold">{r.stableford}</td>
                )}
                {mode === "skins" && (
                  <td className="px-2 py-2 text-center tabular-nums font-bold">{r.skins}</td>
                )}
                <td className="px-2 py-2 text-center tabular-nums">{r.thru ? r.gross : "–"}</td>
                {strokeLike && (
                  <td className="px-2 py-2 text-center tabular-nums">{r.thru ? r.net : "–"}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Scorecard */}
      <Card className="p-3 overflow-x-auto">
        <table className="text-sm border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-[var(--surface)] px-2 py-1.5 text-left text-xs text-[var(--muted)]">
                Hole
              </th>
              {holes.map((h) => (
                <th key={h} className="px-1 py-1.5 text-center w-9 text-xs text-[var(--muted)]">
                  {h + 1}
                </th>
              ))}
              <th className="px-2 py-1.5 text-center text-xs text-[var(--muted)]">Tot</th>
            </tr>
            <tr>
              <th className="sticky left-0 z-10 bg-[var(--surface)] px-2 py-1 text-left text-xs font-normal text-[var(--muted)]">
                Par
              </th>
              {holes.map((h) => (
                <th key={h} className="px-1 py-1 text-center text-xs font-normal text-[var(--muted)]">
                  {g.pars[h]}
                </th>
              ))}
              <th className="px-2 py-1 text-center text-xs font-normal text-[var(--muted)]">{totalPar}</th>
            </tr>
          </thead>
          <tbody>
            {t.participants.map((p) => {
              const card = g.scores[p.id] ?? [];
              const tot = card.reduce<number>((a, s) => a + (s ?? 0), 0);
              return (
                <tr key={p.id}>
                  <td className="sticky left-0 z-10 bg-[var(--surface)] px-2 py-1 font-medium whitespace-nowrap border-t border-[var(--border)]">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: colorFor(t.participants, p.id) }}
                      />
                      {p.name}
                    </span>
                  </td>
                  {holes.map((h) => (
                    <td key={h} className="px-0.5 py-1 text-center border-t border-[var(--border)]">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={card[h] ?? ""}
                        onChange={(e) =>
                          setGolfScore(t.id, p.id, h, e.target.value === "" ? null : Number(e.target.value))
                        }
                        className="w-8 rounded border border-[var(--border)] bg-black/30 px-0.5 py-1 text-center text-sm tabular-nums outline-none focus:border-cyan-400/60"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1 text-center font-bold tabular-nums border-t border-[var(--border)]">
                    {tot || "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
