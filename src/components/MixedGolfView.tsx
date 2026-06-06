"use client";

import { useState } from "react";
import { GOLF_MODE_LABELS, GolfSegment, Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import {
  computeBbb,
  computeGolf,
  computeMixedOverall,
  formatToPar,
  mixedComplete,
  segmentForHole,
} from "@/lib/golf";
import { colorFor } from "@/lib/colors";
import { Avatar } from "./Avatar";
import { Button, Card } from "./ui";
import { Confetti } from "./Confetti";

const AWARDS: { key: "bingo" | "bango" | "bongo"; label: string }[] = [
  { key: "bingo", label: "Bingo" },
  { key: "bango", label: "Bango" },
  { key: "bongo", label: "Bongo" },
];

function SegmentBoard({ t, seg }: { t: Tournament; seg: GolfSegment }) {
  const range = { from: seg.from, to: seg.to };
  const isBingo = seg.format === "bingo";
  const rows = isBingo ? computeBbb(t, range) : computeGolf(t, seg.format, range);

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60">
      <div className="px-4 py-2.5 border-b border-[var(--border)] font-bold text-sm">
        Holes {seg.from}–{seg.to} · {GOLF_MODE_LABELS[seg.format]}
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.participantId} className={`border-b border-[var(--border)] last:border-0 ${i === 0 ? "bg-[var(--win-bg)]" : ""}`}>
              <td className="px-3 py-2 font-medium">
                <span className="flex items-center gap-2">
                  <Avatar name={r.name} color={colorFor(t.participants, r.participantId)} />
                  {r.name}
                </span>
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-bold">
                {isBingo
                  ? `${("points" in r ? r.points : 0)} pts`
                  : seg.format === "stableford"
                    ? `${(r as { stableford: number }).stableford} pts`
                    : seg.format === "skins"
                      ? `${(r as { skins: number }).skins} skins`
                      : (r as { thru: number; toPar: number }).thru
                        ? formatToPar((r as { toPar: number }).toPar)
                        : "–"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MixedGolfView({ t }: { t: Tournament }) {
  const setGolfScore = useStore((s) => s.setGolfScore);
  const setGolfAward = useStore((s) => s.setGolfAward);
  const [hole, setHole] = useState(0);
  const g = t.golf;
  if (!g) return null;
  const segments: GolfSegment[] = g.segments?.length
    ? g.segments
    : [{ from: 1, to: g.holes, format: "stroke" }];

  const h = Math.min(hole, g.holes - 1);
  const seg = segmentForHole(segments, h) ?? segments[0];
  const isBingo = seg?.format === "bingo";

  const adj = (pid: string, delta: number) => {
    const cur = g.scores[pid]?.[h];
    const next = cur === null || cur === undefined ? g.pars[h] : Math.max(1, cur + delta);
    setGolfScore(t.id, pid, h, next);
  };

  const overall = computeMixedOverall(t, segments);
  const anyPoints = overall.some((r) => r.points > 0);
  const complete = mixedComplete(t, segments);
  const champ = complete && overall[0]?.points > 0 ? overall[0] : null;
  const fmtPts = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

  return (
    <div className="space-y-5">
      {champ && (
        <>
          <Confetti trigger={champ.name} />
          <div className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/15 to-[var(--brand-soft)] p-6 text-center glow-brand">
            <div className="text-5xl">🏆</div>
            <div className="mt-2 text-xs uppercase tracking-[0.3em] text-amber-300 font-bold">
              Overall Champion
            </div>
            <div className="mt-1 text-2xl font-extrabold">
              {champ.name} · {fmtPts(champ.points)} pts
            </div>
          </div>
        </>
      )}

      {/* Overall segment points */}
      {anyPoints && (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60">
          <div className="px-4 py-2.5 border-b border-[var(--border)] font-bold text-sm">
            Overall · Segments won {complete ? "" : "(so far)"}
          </div>
          <table className="w-full text-sm">
            <tbody>
              {overall.map((r, i) => (
                <tr key={r.participantId} className={`border-b border-[var(--border)] last:border-0 ${i === 0 && r.points > 0 ? "bg-[var(--win-bg)]" : ""}`}>
                  <td className="px-3 py-2 font-bold text-[var(--muted)] w-10">{r.points > 0 ? i + 1 : "–"}</td>
                  <td className="px-3 py-2 font-medium">
                    <span className="flex items-center gap-2">
                      <Avatar name={r.name} color={colorFor(t.participants, r.participantId)} />
                      {r.name}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold">{fmtPts(r.points)} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 text-xs text-[var(--muted)] border-t border-[var(--border)]">
            1 point per segment won · ties split the point
          </div>
        </div>
      )}
      {/* Hole entry */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" className="px-3 py-1.5" disabled={h === 0} onClick={() => setHole(h - 1)}>
            ‹ Prev
          </Button>
          <div className="text-center">
            <div className="text-xs text-[var(--muted)]">
              {g.courseName ? `${g.courseName} · ` : ""}Hole {h + 1} of {g.holes}
            </div>
            <div className="text-lg font-bold">
              Par {g.pars[h]} <span className="text-[var(--muted)] font-normal text-sm">· {GOLF_MODE_LABELS[seg.format]}</span>
            </div>
          </div>
          <Button variant="outline" className="px-3 py-1.5" disabled={h >= g.holes - 1} onClick={() => setHole(h + 1)}>
            Next ›
          </Button>
        </div>

        {isBingo ? (
          <div className="mt-3 space-y-2">
            {AWARDS.map((a) => (
              <div key={a.key} className="flex items-center justify-between gap-3">
                <span className="text-sm w-16">{a.label}</span>
                <select
                  value={g.bbb?.[a.key][h] ?? ""}
                  onChange={(e) => setGolfAward(t.id, a.key, h, e.target.value || null)}
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--input)] px-2 py-1.5 text-sm outline-none focus:border-[var(--brand)]"
                >
                  <option value="">—</option>
                  {t.participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {t.participants.map((p) => {
              const v = g.scores[p.id]?.[h];
              const rel = v != null ? v - g.pars[h] : null;
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg bg-[var(--subtle)] px-3 py-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <Avatar name={p.name} color={colorFor(t.participants, p.id)} className="h-6 w-6 text-[10px]" />
                    <span className="truncate">{p.name}</span>
                    {(p.handicap ?? 0) > 0 && <span className="text-xs text-[var(--muted)]">({p.handicap})</span>}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    {rel != null && (
                      <span className={`text-xs w-8 text-right ${rel < 0 ? "text-[var(--win)]" : rel > 0 ? "text-[var(--muted)]" : ""}`}>
                        {rel === 0 ? "E" : rel > 0 ? `+${rel}` : rel}
                      </span>
                    )}
                    <button onClick={() => adj(p.id, -1)} className="h-9 w-9 rounded-lg border border-[var(--border)] bg-[var(--hover)] text-lg font-bold hover:bg-[var(--hover-strong)]">−</button>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={v ?? ""}
                      onChange={(e) => setGolfScore(t.id, p.id, h, e.target.value === "" ? null : Number(e.target.value))}
                      placeholder="–"
                      className="w-12 rounded-lg border border-[var(--border)] bg-[var(--input)] px-1 py-1.5 text-center text-lg font-bold tabular-nums outline-none focus:border-[var(--brand)]"
                    />
                    <button onClick={() => adj(p.id, 1)} className="h-9 w-9 rounded-lg border border-[var(--border)] bg-[var(--hover)] text-lg font-bold hover:bg-[var(--hover-strong)]">+</button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Per-segment leaderboards */}
      <div className="grid md:grid-cols-2 gap-4">
        {segments.map((s, i) => (
          <SegmentBoard key={i} t={t} seg={s} />
        ))}
      </div>
    </div>
  );
}
