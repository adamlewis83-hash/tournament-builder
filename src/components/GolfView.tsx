"use client";

import { useState } from "react";
import { GOLF_MODE_LABELS, GolfMode, Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import { computeGolf, formatToPar, holeStrokes } from "@/lib/golf";
import { colorFor, photoFor } from "@/lib/colors";
import { Button, Card } from "./ui";
import { Avatar } from "./Avatar";
import { StrokeDots } from "./StrokeDots";
import { BbbView } from "./BbbView";
import { WolfView } from "./WolfView";
import { MixedGolfView } from "./MixedGolfView";

const SWITCHABLE: GolfMode[] = ["stroke", "stableford", "skins", "nassau"];

export function GolfView({ t }: { t: Tournament }) {
  const patch = useStore((s) => s.patchTournament);
  const setGolfScore = useStore((s) => s.setGolfScore);
  const [hole, setHole] = useState(0);
  const [showCard, setShowCard] = useState(true);
  const g = t.golf;
  if (!g) return null;

  if (t.config.golfMode === "bingo") return <BbbView t={t} />;
  if (t.config.golfMode === "wolf") return <WolfView t={t} />;
  if (t.config.golfMode === "mixed") return <MixedGolfView t={t} />;

  const isScramble = t.config.golfMode === "scramble";
  const mode: GolfMode = isScramble
    ? "scramble"
    : SWITCHABLE.includes(t.config.golfMode)
      ? t.config.golfMode
      : "stroke";
  const strokeLike = mode === "stroke" || mode === "scramble";
  const isNassau = mode === "nassau";
  const rows = computeGolf(t, mode);
  const started = rows.filter((r) => r.thru > 0);
  const minFront = started.length ? Math.min(...started.map((r) => r.frontNet)) : 0;
  const minBack = started.length ? Math.min(...started.map((r) => r.backNet)) : 0;
  const minTotal = started.length ? Math.min(...started.map((r) => r.net)) : 0;
  const seg = (v: number, best: number, on: boolean) =>
    `px-2 py-2 text-center tabular-nums font-bold ${on && v === best ? "text-[var(--win)]" : ""}`;
  const holes = Array.from({ length: g.holes }, (_, i) => i);
  const totalPar = g.pars.reduce((a, b) => a + b, 0);
  const startHole = g.startHole ?? 1; // 10 for a back-9 round, else 1
  const holeNo = (i: number) => startHole + i; // display hole number

  return (
    <div className="space-y-5">
      {isScramble ? (
        <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--brand-soft)] px-3.5 py-1.5 text-sm font-semibold text-[var(--brand)]">
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
                  ? "bg-gradient-to-r from-[var(--brand)] to-[var(--brand-strong)] text-[var(--on-brand)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {GOLF_MODE_LABELS[m]}
            </button>
          ))}
        </div>
      )}

      {/* Hole-by-hole entry */}
      {(() => {
        const h = Math.min(hole, g.holes - 1);
        const adj = (pid: string, delta: number) => {
          const cur = g.scores[pid]?.[h];
          const next = cur === null || cur === undefined ? g.pars[h] : Math.max(1, cur + delta);
          setGolfScore(t.id, pid, h, next);
        };
        return (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                className="px-3 py-1.5"
                disabled={h === 0}
                onClick={() => setHole(h - 1)}
              >
                ‹ Prev
              </Button>
              <div className="text-center">
                <div className="text-xs text-[var(--muted)]">
                  {g.courseName ? `${g.courseName} · ` : ""}Hole {holeNo(h)}
                  {startHole > 1 ? "" : ` of ${g.holes}`}
                </div>
                <div className="text-lg font-bold">
                  Par {g.pars[h]} <span className="text-[var(--muted)] font-normal text-sm">· SI {g.strokeIndex[h]}</span>
                </div>
              </div>
              <Button
                variant="outline"
                className="px-3 py-1.5"
                disabled={h >= g.holes - 1}
                onClick={() => setHole(h + 1)}
              >
                Next ›
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {t.participants.map((p) => {
                const v = g.scores[p.id]?.[h];
                const rel = v != null ? v - g.pars[h] : null;
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg bg-[var(--subtle)] px-3 py-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <Avatar name={p.name} color={colorFor(t.participants, p.id)} photo={photoFor(t.participants, p.id)} className="h-6 w-6 text-[10px]" />
                      <span className="truncate">{p.name}</span>
                      {(p.handicap ?? 0) > 0 && (
                        <span className="text-xs text-[var(--muted)]">({p.handicap})</span>
                      )}
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      {rel != null && (
                        <span className={`text-xs w-8 text-right ${rel < 0 ? "text-[var(--win)]" : rel > 0 ? "text-[var(--muted)]" : ""}`}>
                          {rel === 0 ? "E" : rel > 0 ? `+${rel}` : rel}
                        </span>
                      )}
                      <button
                        onClick={() => adj(p.id, -1)}
                        className="h-9 w-9 rounded-lg border border-[var(--border)] bg-[var(--hover)] text-lg font-bold hover:bg-[var(--hover-strong)]"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={v ?? ""}
                        onChange={(e) => setGolfScore(t.id, p.id, h, e.target.value === "" ? null : Number(e.target.value))}
                        placeholder="–"
                        className="w-12 rounded-lg border border-[var(--border)] bg-[var(--input)] px-1 py-1.5 text-center text-lg font-bold tabular-nums outline-none focus:border-[var(--brand)]"
                      />
                      <button
                        onClick={() => adj(p.id, 1)}
                        className="h-9 w-9 rounded-lg border border-[var(--border)] bg-[var(--hover)] text-lg font-bold hover:bg-[var(--hover-strong)]"
                      >
                        +
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })()}

      {/* Leaderboard */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60">
        <div className="px-4 py-2.5 border-b border-[var(--border)] font-bold text-sm">
          {GOLF_MODE_LABELS[mode]} · Leaderboard
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--muted)] border-b border-[var(--border)] bg-[var(--subtle)]">
              <th className="px-3 py-2 w-10">#</th>
              <th className="px-3 py-2">Player</th>
              <th className="px-2 py-2 text-center w-14">Thru</th>
              {strokeLike && <th className="px-2 py-2 text-center w-16">To Par</th>}
              {mode === "stableford" && <th className="px-2 py-2 text-center w-16">Points</th>}
              {mode === "skins" && <th className="px-2 py-2 text-center w-14">Skins</th>}
              {isNassau && (
                <>
                  <th className="px-2 py-2 text-center w-14">Front</th>
                  <th className="px-2 py-2 text-center w-14">Back</th>
                  <th className="px-2 py-2 text-center w-14">Total</th>
                </>
              )}
              {!isNassau && <th className="px-2 py-2 text-center w-16">Gross</th>}
              {strokeLike && <th className="px-2 py-2 text-center w-14">Net</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.participantId} className={`border-b border-[var(--border)] last:border-0 ${i === 0 ? "bg-[var(--win-bg)]" : ""}`}>
                <td className="px-3 py-2 font-bold text-[var(--muted)]">{r.thru ? i + 1 : "–"}</td>
                <td className="px-3 py-2 font-medium">
                  <span className="flex items-center gap-2.5">
                    <Avatar name={r.name} color={colorFor(t.participants, r.participantId)} photo={photoFor(t.participants, r.participantId)} />
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
                {isNassau && (
                  <>
                    <td className={seg(r.frontNet, minFront, r.thru > 0)}>{r.thru ? r.frontNet : "–"}</td>
                    <td className={seg(r.backNet, minBack, r.thru > 9)}>{r.thru > 9 ? r.backNet : "–"}</td>
                    <td className={seg(r.net, minTotal, r.thru > 0)}>{r.thru ? r.net : "–"}</td>
                  </>
                )}
                {!isNassau && (
                  <td className="px-2 py-2 text-center tabular-nums">{r.thru ? r.gross : "–"}</td>
                )}
                {strokeLike && (
                  <td className="px-2 py-2 text-center tabular-nums">{r.thru ? r.net : "–"}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Full scorecard (toggle) */}
      <button
        onClick={() => setShowCard((v) => !v)}
        className="text-sm text-[var(--brand)] hover:text-[var(--brand-strong)]"
      >
        {showCard ? "▾ Hide" : "▸ Show"} full scorecard
      </button>
      {showCard && (
      <Card className="p-3 overflow-x-auto">
        <table className="text-sm border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-[var(--surface)] px-2 py-1.5 text-left text-xs text-[var(--muted)]">
                Hole
              </th>
              {holes.map((h) => (
                <th key={h} className="px-1 py-1.5 text-center w-9 text-xs text-[var(--muted)]">
                  {holeNo(h)}
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
                    <td key={h} className="px-0.5 py-1 align-bottom text-center border-t border-[var(--border)]">
                      <StrokeDots n={holeStrokes(p.handicap ?? 0, g.strokeIndex[h], g.holes)} />
                      <input
                        type="number"
                        inputMode="numeric"
                        value={card[h] ?? ""}
                        onChange={(e) =>
                          setGolfScore(t.id, p.id, h, e.target.value === "" ? null : Number(e.target.value))
                        }
                        className="mt-0.5 w-8 rounded border border-[var(--border)] bg-[var(--input)] px-0.5 py-1 text-center text-sm tabular-nums outline-none focus:border-[var(--brand)]"
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
        <p className="mt-2 px-1 text-[10px] text-[var(--muted)] flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> = a handicap stroke on that hole
        </p>
      </Card>
      )}
    </div>
  );
}
