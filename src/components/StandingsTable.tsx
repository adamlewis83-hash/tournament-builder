"use client";

import { Match, Participant, Tiebreaker, TIEBREAKER_LABELS } from "@/lib/types";
import { computeStandings } from "@/lib/standings";
import { colorFor, photoFor } from "@/lib/colors";
import { Avatar } from "./Avatar";

export function StandingsTable({
  participants,
  matches,
  highlightTop = 0,
  title,
  tiebreaker = "diff",
  footnote,
}: {
  participants: Participant[];
  matches: Match[];
  highlightTop?: number;
  title?: string;
  tiebreaker?: Tiebreaker;
  footnote?: string;
}) {
  const rows = computeStandings(participants, matches, tiebreaker);
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60">
      {title && (
        <div className="px-4 py-2.5 border-b border-[var(--border)] font-bold text-sm tracking-wide">
          {title}
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[var(--muted)] border-b border-[var(--border)] bg-[var(--subtle)]">
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
                className={`border-b border-[var(--border)] last:border-0 ${advancing ? "bg-[var(--win-bg)]" : ""}`}
              >
                <td className="px-3 py-2 font-bold text-[var(--muted)]">
                  {advancing ? <span className="text-[var(--win)]">{r.rank}</span> : r.rank}
                </td>
                <td className="px-3 py-2 font-medium">
                  <span className="flex items-center gap-2.5">
                    <Avatar
                      name={r.name}
                      color={colorFor(participants, r.participantId)}
                      photo={photoFor(participants, r.participantId)}
                    />
                    <span className="min-w-0">
                      <span className="block">{r.name}</span>
                      {(() => {
                        const members =
                          participants.find((p) => p.id === r.participantId)?.members ?? [];
                        return members.length > 0 ? (
                          <span className="block text-[11px] font-normal text-[var(--muted)]">
                            {members.join(" · ")}
                          </span>
                        ) : null;
                      })()}
                    </span>
                  </span>
                </td>
                <td className="px-2 py-2 text-center tabular-nums">{r.wins}</td>
                <td className="px-2 py-2 text-center tabular-nums text-[var(--muted)]">{r.losses}</td>
                <td
                  className={`px-2 py-2 text-center tabular-nums font-bold ${
                    r.diff > 0 ? "text-[var(--win)]" : r.diff < 0 ? "text-rose-400" : ""
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
      {(footnote || highlightTop > 0) && (
        <div className="px-4 py-2 text-xs text-[var(--muted)] border-t border-[var(--border)]">
          {footnote ??
            `Top ${highlightTop} advance · ties broken by ${TIEBREAKER_LABELS[tiebreaker].toLowerCase()}`}
        </div>
      )}
    </div>
  );
}
