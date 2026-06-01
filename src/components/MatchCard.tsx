"use client";

import { Match, Participant } from "@/lib/types";
import { useStore } from "@/lib/store";

function names(participants: Participant[], ids: string[]): string {
  if (!ids.length) return "";
  return ids.map((id) => participants.find((p) => p.id === id)?.name ?? "?").join(" / ");
}

function ScoreBox({
  value,
  onCommit,
  disabled,
  win,
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
  disabled: boolean;
  win: boolean;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      disabled={disabled}
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value;
        onCommit(raw === "" ? null : Number(raw));
      }}
      className={`w-12 shrink-0 rounded-md border px-1.5 py-1 text-center text-sm font-semibold tabular-nums
        ${win ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-[var(--surface)]"}
        ${disabled ? "opacity-40" : ""}`}
      placeholder="–"
    />
  );
}

export function MatchCard({
  tournamentId,
  participants,
  match,
}: {
  tournamentId: string;
  participants: Participant[];
  match: Match;
}) {
  const setScore = useStore((s) => s.setScore);
  const aReady = match.sideA.length > 0;
  const bReady = match.sideB.length > 0;
  const both = aReady && bReady;
  const decided =
    match.scoreA !== null && match.scoreB !== null && match.scoreA !== match.scoreB;
  const aWin = decided && (match.scoreA as number) > (match.scoreB as number);
  const bWin = decided && (match.scoreB as number) > (match.scoreA as number);

  const sideA = aReady ? names(participants, match.sideA) : match.sideALabel || "TBD";
  const sideB = bReady ? names(participants, match.sideB) : match.sideBLabel || "TBD";

  function commit(side: "A" | "B", v: number | null) {
    if (side === "A") setScore(tournamentId, match.id, v, match.scoreB);
    else setScore(tournamentId, match.id, match.scoreA, v);
  }

  return (
    <div className="rounded-lg border bg-[var(--surface)]">
      {match.label && (
        <div className="px-3 pt-2 text-[11px] uppercase tracking-wide text-[var(--muted)] font-semibold">
          {match.label}
          {match.court ? ` · Court ${match.court}` : ""}
        </div>
      )}
      <div className="p-2.5 space-y-1.5">
        <div
          className={`flex items-center justify-between gap-2 rounded-md px-2 py-1 ${
            aWin ? "bg-emerald-50" : ""
          }`}
        >
          <span className={`text-sm truncate ${aReady ? "" : "text-[var(--muted)] italic"} ${aWin ? "font-semibold" : ""}`}>
            {sideA}
          </span>
          <ScoreBox value={match.scoreA} onCommit={(v) => commit("A", v)} disabled={!both} win={aWin} />
        </div>
        <div
          className={`flex items-center justify-between gap-2 rounded-md px-2 py-1 ${
            bWin ? "bg-emerald-50" : ""
          }`}
        >
          <span className={`text-sm truncate ${bReady ? "" : "text-[var(--muted)] italic"} ${bWin ? "font-semibold" : ""}`}>
            {sideB}
          </span>
          <ScoreBox value={match.scoreB} onCommit={(v) => commit("B", v)} disabled={!both} win={bWin} />
        </div>
      </div>
    </div>
  );
}
