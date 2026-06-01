"use client";

import { Match, Participant } from "@/lib/types";
import { useStore } from "@/lib/store";
import { colorFor } from "@/lib/colors";

function Side({
  ids,
  label,
  participants,
}: {
  ids: string[];
  label?: string;
  participants: Participant[];
}) {
  if (!ids.length) {
    return <span className="text-sm text-[var(--muted)] italic truncate">{label || "TBD"}</span>;
  }
  return (
    <span className="flex items-center gap-1.5 min-w-0">
      <span className="flex -space-x-1 shrink-0">
        {ids.map((id) => (
          <span
            key={id}
            className="h-2.5 w-2.5 rounded-full ring-1 ring-black/40"
            style={{ background: colorFor(participants, id) }}
          />
        ))}
      </span>
      <span className="text-sm truncate">
        {ids.map((id) => participants.find((p) => p.id === id)?.name ?? "?").join(" / ")}
      </span>
    </span>
  );
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
      className={`w-12 shrink-0 rounded-md border px-1.5 py-1 text-center text-sm font-bold tabular-nums outline-none transition
        ${
          win
            ? "bg-lime-400/15 border-lime-400/50 text-lime-300"
            : "bg-black/30 border-[var(--border)] text-[var(--foreground)] focus:border-cyan-400/60"
        }
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
  const both = match.sideA.length > 0 && match.sideB.length > 0;
  const decided =
    match.scoreA !== null && match.scoreB !== null && match.scoreA !== match.scoreB;
  const aWin = decided && (match.scoreA as number) > (match.scoreB as number);
  const bWin = decided && (match.scoreB as number) > (match.scoreA as number);

  function commit(side: "A" | "B", v: number | null) {
    if (side === "A") setScore(tournamentId, match.id, v, match.scoreB);
    else setScore(tournamentId, match.id, match.scoreA, v);
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80">
      {match.label && (
        <div className="px-3 pt-2 text-[10px] uppercase tracking-widest text-[var(--muted)] font-bold">
          {match.label}
          {match.court ? ` · Court ${match.court}` : ""}
        </div>
      )}
      <div className="p-2.5 space-y-1.5">
        <div className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1 ${aWin ? "ring-win bg-lime-400/5" : ""}`}>
          <Side ids={match.sideA} label={match.sideALabel} participants={participants} />
          <ScoreBox value={match.scoreA} onCommit={(v) => commit("A", v)} disabled={!both} win={aWin} />
        </div>
        <div className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1 ${bWin ? "ring-win bg-lime-400/5" : ""}`}>
          <Side ids={match.sideB} label={match.sideBLabel} participants={participants} />
          <ScoreBox value={match.scoreB} onCommit={(v) => commit("B", v)} disabled={!both} win={bWin} />
        </div>
      </div>
    </div>
  );
}
