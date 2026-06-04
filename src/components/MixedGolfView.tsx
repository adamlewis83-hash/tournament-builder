"use client";

import { useState } from "react";
import { GOLF_MODE_LABELS, GolfSegment, Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import { computeBbb, computeGolf, formatToPar, segmentForHole } from "@/lib/golf";
import { colorFor } from "@/lib/colors";
import { Button, Card } from "./ui";

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
            <tr key={r.participantId} className={`border-b border-[var(--border)] last:border-0 ${i === 0 ? "bg-lime-400/[0.06]" : ""}`}>
              <td className="px-3 py-2 font-medium">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/40 shrink-0" style={{ background: colorFor(t.participants, r.participantId) }} />
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

  return (
    <div className="space-y-5">
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
                  className="flex-1 rounded-lg border border-[var(--border)] bg-black/30 px-2 py-1.5 text-sm outline-none focus:border-cyan-400/60"
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
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/40 shrink-0" style={{ background: colorFor(t.participants, p.id) }} />
                    <span className="truncate">{p.name}</span>
                    {(p.handicap ?? 0) > 0 && <span className="text-xs text-[var(--muted)]">({p.handicap})</span>}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    {rel != null && (
                      <span className={`text-xs w-8 text-right ${rel < 0 ? "text-lime-400" : rel > 0 ? "text-[var(--muted)]" : ""}`}>
                        {rel === 0 ? "E" : rel > 0 ? `+${rel}` : rel}
                      </span>
                    )}
                    <button onClick={() => adj(p.id, -1)} className="h-9 w-9 rounded-lg border border-[var(--border)] bg-white/5 text-lg font-bold hover:bg-white/10">−</button>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={v ?? ""}
                      onChange={(e) => setGolfScore(t.id, p.id, h, e.target.value === "" ? null : Number(e.target.value))}
                      placeholder="–"
                      className="w-12 rounded-lg border border-[var(--border)] bg-black/30 px-1 py-1.5 text-center text-lg font-bold tabular-nums outline-none focus:border-cyan-400/60"
                    />
                    <button onClick={() => adj(p.id, 1)} className="h-9 w-9 rounded-lg border border-[var(--border)] bg-white/5 text-lg font-bold hover:bg-white/10">+</button>
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
