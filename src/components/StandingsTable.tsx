"use client";

import { Match, Participant } from "@/lib/types";
import { computeStandings } from "@/lib/standings";

export function StandingsTable({
  participants,
  matches,
  highlightTop = 0,
  title,
}: {
  participants: Participant[];
  matches: Match[];
  highlightTop?: number;
  title?: string;
}) {
  const rows = computeStandings(participants, matches);
  return (
    <div className="overflow-hidden rounded-xl border bg-[var(--surface)]">
      {title && <div className="px-4 py-2.5 border-b font-semibold text-sm">{title}</div>}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[var(--muted)] border-b bg-slate-50">
            <th className="px-3 py-2 w-10">#</th>
            <th className="px-3 py-2">Player</th>
            <th className="px-2 py-2 text-center w-12">W</th>
            <th className="px-2 py-2 text-center w-12">L</th>
            <th className="px-2 py-2 text-center w-14" title="Point differential — breaks ties">
              Diff
            </th>
            <th className="px-2 py-2 text-center w-14 hidden sm:table-cell">PF</th>
            <th className="px-2 py-2 text-center w-14 hidden sm:table-cell">PA</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const advancing = highlightTop > 0 && r.rank <= highlightTop;
            return (
              <tr
                key={r.participantId}
                className={`border-b last:border-0 ${advancing ? "bg-emerald-50/60" : ""}`}
              >
                <td className="px-3 py-2 font-semibold text-[var(--muted)]">
                  {r.rank}
                  {advancing && <span className="text-emerald-600"> ●</span>}
                </td>
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-2 py-2 text-center tabular-nums">{r.wins}</td>
                <td className="px-2 py-2 text-center tabular-nums">{r.losses}</td>
                <td className="px-2 py-2 text-center tabular-nums font-semibold">
                  {r.diff > 0 ? `+${r.diff}` : r.diff}
                </td>
                <td className="px-2 py-2 text-center tabular-nums hidden sm:table-cell">
                  {r.pointsFor}
                </td>
                <td className="px-2 py-2 text-center tabular-nums hidden sm:table-cell">
                  {r.pointsAgainst}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {highlightTop > 0 && (
        <div className="px-4 py-2 text-xs text-[var(--muted)] border-t">
          ● Top {highlightTop} advance. Ties broken by point differential.
        </div>
      )}
    </div>
  );
}
