"use client";

import { useState } from "react";
import { Match, Participant } from "@/lib/types";
import { MatchCard } from "./MatchCard";
import { BracketDiagram } from "./BracketDiagram";

function ModeToggle({
  mode,
  setMode,
}: {
  mode: "round" | "full";
  setMode: (m: "round" | "full") => void;
}) {
  const labels: Record<"round" | "full", string> = { round: "This round", full: "Full bracket" };
  return (
    <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
      {(["round", "full"] as const).map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
            mode === m
              ? "bg-gradient-to-r from-[var(--brand)] to-[var(--brand-strong)] text-[var(--on-brand)]"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {labels[m]}
        </button>
      ))}
    </div>
  );
}

function Column({
  title,
  matches,
  participants,
  tournamentId,
}: {
  title: string;
  matches: Match[];
  participants: Participant[];
  tournamentId: string;
}) {
  return (
    <div className="flex flex-col gap-3 min-w-[210px]">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] text-center">
        {title}
      </div>
      <div className="flex flex-col gap-3 justify-around flex-1">
        {matches
          .sort((a, b) => a.order - b.order)
          .map((m) => (
            <MatchCard key={m.id} tournamentId={tournamentId} participants={participants} match={m} />
          ))}
      </div>
    </div>
  );
}

function Section({
  label,
  phaseMatches,
  participants,
  tournamentId,
  roundLabel,
}: {
  label?: string;
  phaseMatches: Match[];
  participants: Participant[];
  tournamentId: string;
  roundLabel: (round: number, count: number) => string;
}) {
  if (phaseMatches.length === 0) return null;
  const rounds = Array.from(new Set(phaseMatches.map((m) => m.round))).sort((a, b) => a - b);
  return (
    <div>
      {label && <h3 className="font-semibold mb-3">{label}</h3>}
      <div className="flex gap-4 overflow-x-auto pb-3">
        {rounds.map((r) => {
          const col = phaseMatches.filter((m) => m.round === r);
          return (
            <Column
              key={r}
              title={roundLabel(r, col.length)}
              matches={col}
              participants={participants}
              tournamentId={tournamentId}
            />
          );
        })}
      </div>
    </div>
  );
}

export function BracketView({
  matches,
  participants,
  tournamentId,
}: {
  matches: Match[];
  participants: Participant[];
  tournamentId: string;
}) {
  const winners = matches.filter((m) => m.phase === "winners");
  const losers = matches.filter((m) => m.phase === "losers");
  const finals = matches.filter((m) => m.phase === "final" || m.phase === "championship");
  const placement = matches.filter((m) => m.phase === "placement");
  const hasLosers = losers.length > 0;
  const tree = [...winners, ...finals]; // the single-elim winners → final tree

  const [mode, setMode] = useState<"round" | "full">("full");
  const [pinnedRound, setPinnedRound] = useState<number | null>(null);

  const decided = (m: Match) => m.scoreA != null && m.scoreB != null && m.scoreA !== m.scoreB;
  const ready = (m: Match) => m.sideA.length > 0 && m.sideB.length > 0;
  const roundName = (count: number) =>
    count === 1 ? "Final" : count === 2 ? "Semifinals" : count === 4 ? "Quarterfinals" : `Round of ${count * 2}`;

  const losersSection = hasLosers && (
    <Section
      label="Losers Bracket"
      phaseMatches={losers}
      participants={participants}
      tournamentId={tournamentId}
      roundLabel={(r) => `Losers R${r}`}
    />
  );
  const placementSection = placement.length > 0 && (
    <Section
      label="3rd-Place Game"
      phaseMatches={placement}
      participants={participants}
      tournamentId={tournamentId}
      roundLabel={() => "Bronze"}
    />
  );

  // No bracket tree (rare edge) — just show whatever exists as card sections.
  if (tree.length === 0) {
    return (
      <div className="space-y-6">
        {losersSection}
        {placementSection}
      </div>
    );
  }

  const treeRounds = Array.from(new Set(tree.map((m) => m.round))).sort((a, b) => a - b);
  // The live round: earliest round with a ready-but-undecided match; else the last round (champion).
  const currentRound =
    treeRounds.find((r) => tree.some((m) => m.round === r && ready(m) && !decided(m))) ??
    treeRounds[treeRounds.length - 1];
  // Auto-follow the live round unless the user has pinned one via the arrows.
  const shownRound = pinnedRound != null && treeRounds.includes(pinnedRound) ? pinnedRound : currentRound;
  const idx = treeRounds.indexOf(shownRound);
  const shownMatches = tree.filter((m) => m.round === shownRound).sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <ModeToggle mode={mode} setMode={setMode} />
        {mode === "round" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={idx <= 0}
              onClick={() => setPinnedRound(treeRounds[idx - 1])}
              className="h-7 w-7 grid place-items-center rounded-md border border-[var(--border)] text-[var(--muted)] disabled:opacity-30 hover:bg-[var(--hover)]"
            >
              ◀
            </button>
            <span className="text-sm font-semibold flex items-center gap-1.5">
              {roundName(shownMatches.length)}
              {shownRound === currentRound && (
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--win)] pulse-ring" title="Live round" />
              )}
            </span>
            <button
              type="button"
              disabled={idx >= treeRounds.length - 1}
              onClick={() => setPinnedRound(treeRounds[idx + 1])}
              className="h-7 w-7 grid place-items-center rounded-md border border-[var(--border)] text-[var(--muted)] disabled:opacity-30 hover:bg-[var(--hover)]"
            >
              ▶
            </button>
          </div>
        )}
      </div>

      {mode === "round" ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shownMatches.map((m) => (
            <MatchCard key={m.id} tournamentId={tournamentId} participants={participants} match={m} />
          ))}
        </div>
      ) : (
        <BracketDiagram matches={matches} participants={participants} />
      )}

      {losersSection}
      {placementSection}
    </div>
  );
}
