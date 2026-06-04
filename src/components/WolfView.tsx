"use client";

import { Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import { computeWolf, wolfForHole } from "@/lib/golf";
import { colorFor } from "@/lib/colors";
import { Card } from "./ui";

export function WolfView({ t }: { t: Tournament }) {
  const setGolfScore = useStore((s) => s.setGolfScore);
  const setGolfWolf = useStore((s) => s.setGolfWolf);
  const g = t.golf;
  if (!g?.wolf) return null;
  const ids = t.participants.map((p) => p.id);
  const rows = computeWolf(t);
  const holes = Array.from({ length: g.holes }, (_, i) => i);
  const nameOf = (id: string) => t.participants.find((p) => p.id === id)?.name ?? "?";

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60">
        <div className="px-4 py-2.5 border-b border-[var(--border)] font-bold text-sm">Wolf · Points</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--muted)] border-b border-[var(--border)] bg-white/[0.03]">
              <th className="px-3 py-2 w-10">#</th>
              <th className="px-3 py-2">Player</th>
              <th className="px-2 py-2 text-center w-16">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.participantId} className={`border-b border-[var(--border)] last:border-0 ${i === 0 && r.points > 0 ? "bg-lime-400/[0.07]" : ""}`}>
                <td className="px-3 py-2 font-bold text-[var(--muted)]">{r.points > 0 ? i + 1 : "–"}</td>
                <td className="px-3 py-2 font-medium">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/40 shrink-0" style={{ background: colorFor(t.participants, r.participantId) }} />
                    {r.name}
                  </span>
                </td>
                <td className="px-2 py-2 text-center tabular-nums font-bold">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--muted)]">
        🐺 Each hole a different player is the Wolf (rotating). The Wolf picks a partner after the
        tee shots, or goes <b>Lone Wolf</b> for more points. Partnered win: +1 each · Lone win: +3 ·
        Partnered loss: opponents +2 · Lone loss: others +1. Enter strokes and the Wolf&apos;s pick.
      </p>

      <Card className="p-3 overflow-x-auto">
        <table className="text-sm border-separate border-spacing-0">
          <thead>
            <tr className="text-[var(--muted)]">
              <th className="sticky left-0 z-10 bg-[var(--surface)] px-2 py-1.5 text-left text-xs">Hole</th>
              <th className="px-1 py-1.5 text-center text-xs">Par</th>
              {t.participants.map((p) => (
                <th key={p.id} className="px-1 py-1.5 text-center text-xs">
                  {p.name.slice(0, 4)}
                </th>
              ))}
              <th className="px-2 py-1.5 text-left text-xs">Wolf</th>
              <th className="px-2 py-1.5 text-left text-xs">Pick</th>
            </tr>
          </thead>
          <tbody>
            {holes.map((h) => {
              const wolf = wolfForHole(ids, h)!;
              return (
                <tr key={h}>
                  <td className="sticky left-0 z-10 bg-[var(--surface)] px-2 py-1 font-medium border-t border-[var(--border)]">{h + 1}</td>
                  <td className="px-1 py-1 text-center text-[var(--muted)] border-t border-[var(--border)]">{g.pars[h]}</td>
                  {t.participants.map((p) => (
                    <td key={p.id} className={`px-0.5 py-1 text-center border-t border-[var(--border)] ${p.id === wolf ? "bg-amber-400/10" : ""}`}>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={g.scores[p.id]?.[h] ?? ""}
                        onChange={(e) => setGolfScore(t.id, p.id, h, e.target.value === "" ? null : Number(e.target.value))}
                        className="w-8 rounded border border-[var(--border)] bg-black/30 px-0.5 py-1 text-center text-sm tabular-nums outline-none focus:border-cyan-400/60"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1 border-t border-[var(--border)] whitespace-nowrap font-medium text-amber-300">
                    {nameOf(wolf)}
                  </td>
                  <td className="px-2 py-1 border-t border-[var(--border)]">
                    <select
                      value={g.wolf!.partner[h] ?? ""}
                      onChange={(e) => setGolfWolf(t.id, h, (e.target.value || null) as string | "lone" | null)}
                      className="rounded border border-[var(--border)] bg-black/30 px-1.5 py-1 text-sm outline-none focus:border-cyan-400/60"
                    >
                      <option value="">—</option>
                      <option value="lone">Lone Wolf</option>
                      {ids
                        .filter((id) => id !== wolf)
                        .map((id) => (
                          <option key={id} value={id}>
                            {nameOf(id)}
                          </option>
                        ))}
                    </select>
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
