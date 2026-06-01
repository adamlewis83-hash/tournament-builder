"use client";

import { Match, Participant } from "@/lib/types";
import { computeStandings } from "@/lib/standings";
import { colorFor } from "@/lib/colors";

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
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60">
      {title && (
        <div className="px-4 py-2.5 border-b border-[var(--border)] font-bold text-sm tracking-wide">
          {title}
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[var(--muted)] border-b border-[var(--border)] bg-white/[0.03]">
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
                className={`border-b border-[var(--border)] last:border-0 ${advancing ? "bg-lime-400/[0.07]" : ""}`}
              >
                <td className="px-3 py-2 font-bold text-[var(--muted)]">
                  {advancing ? <span className="text-lime-400">{r.rank}</span> : r.rank}
                </td>
                <td className="px-3 py-2 font-medium">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full ring-1 ring-black/40 shrink-0"
                      style={{ background: colorFor(participants, r.participantId) }}
                    />
                    {r.name}
                  </span>
                </td>
                <td className="px-2 py-2 text-center tabular-nums">{r.wins}</td>
                <td className="px-2 py-2 text-center tabular-nums text-[var(--muted)]">{r.losses}</td>
                <td
                  className={`px-2 py-2 text-center tabular-nums font-bold ${
                    r.diff > 0 ? "text-lime-400" : r.diff < 0 ? "text-rose-400" : ""
                  }`}
                >
                  {r.diff > 0 ? `+${r.diff}` : r.diff}
                </td>
                <td className="px-2 py-2 text-center tabular-nums hidden sm:table-cell text-[var(--muted)]">
                  {r.pointsFor}
                </td>
                <td className="px-2 py-2 text-center tabular-nums hidden sm:table-cell text-[var(--muted)]">
                  {r.pointsAgainst}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {highlightTop > 0 && (
        <div className="px-4 py-2 text-xs text-[var(--muted)] border-t border-[var(--border)]">
          Top {highlightTop} advance · ties broken by point differential
        </div>
      )}
    </div>
  );
}
