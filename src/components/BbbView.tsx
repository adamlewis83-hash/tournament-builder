"use client";

import { Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import { computeBbb } from "@/lib/golf";
import { colorFor, photoFor } from "@/lib/colors";
import { Avatar } from "./Avatar";
import { Card } from "./ui";

const KINDS: { key: "bingo" | "bango" | "bongo"; label: string; hint: string }[] = [
  { key: "bingo", label: "Bingo", hint: "first on green" },
  { key: "bango", label: "Bango", hint: "closest once all on" },
  { key: "bongo", label: "Bongo", hint: "first in the hole" },
];

export function BbbView({ t }: { t: Tournament }) {
  const setGolfAward = useStore((s) => s.setGolfAward);
  const g = t.golf;
  if (!g?.bbb) return null;
  const rows = computeBbb(t);
  const holes = Array.from({ length: g.holes }, (_, i) => i);

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60">
        <div className="px-4 py-2.5 border-b border-[var(--border)] font-bold text-sm">
          Bingo Bango Bongo · Leaderboard
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--muted)] border-b border-[var(--border)] bg-[var(--subtle)]">
              <th className="px-3 py-2 w-10">#</th>
              <th className="px-3 py-2">Player</th>
              <th className="px-2 py-2 text-center w-28">B / B / B</th>
              <th className="px-2 py-2 text-center w-16">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.participantId} className={`border-b border-[var(--border)] last:border-0 ${i === 0 && r.points > 0 ? "bg-[var(--win-bg)]" : ""}`}>
                <td className="px-3 py-2 font-bold text-[var(--muted)]">{r.points > 0 ? i + 1 : "–"}</td>
                <td className="px-3 py-2 font-medium">
                  <span className="flex items-center gap-2">
                    <Avatar name={r.name} color={colorFor(t.participants, r.participantId)} photo={photoFor(t.participants, r.participantId)} />
                    {r.name}
                  </span>
                </td>
                <td className="px-2 py-2 text-center tabular-nums text-[var(--muted)]">{r.detail}</td>
                <td className="px-2 py-2 text-center tabular-nums font-bold">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card className="p-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--muted)]">
              <th className="px-2 py-1.5 text-xs">Hole</th>
              {KINDS.map((k) => (
                <th key={k.key} className="px-2 py-1.5 text-xs">
                  {k.label} <span className="font-normal opacity-70">({k.hint})</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {holes.map((h) => (
              <tr key={h} className="border-t border-[var(--border)]">
                <td className="px-2 py-1 font-medium">{h + 1}</td>
                {KINDS.map((k) => (
                  <td key={k.key} className="px-2 py-1">
                    <select
                      value={g.bbb![k.key][h] ?? ""}
                      onChange={(e) => setGolfAward(t.id, k.key, h, e.target.value || null)}
                      className="w-full rounded border border-[var(--border)] bg-[var(--input)] px-1.5 py-1 text-sm outline-none focus:border-[var(--brand)]"
                    >
                      <option value="">—</option>
                      {t.participants.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
