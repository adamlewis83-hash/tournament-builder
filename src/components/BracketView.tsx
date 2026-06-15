"use client";

import { useState } from "react";
import { Match, Participant } from "@/lib/types";
import { MatchCard } from "./MatchCard";
import { BracketDiagram } from "./BracketDiagram";

function ViewToggle({
  view,
  setView,
}: {
  view: "bracket" | "cards";
  setView: (v: "bracket" | "cards") => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
      {(["bracket", "cards"] as const).map((v) => (
        <button
          key={v}
          onClick={() => setView(v)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize transition ${
            view === v
              ? "bg-gradient-to-r from-[var(--brand)] to-[var(--brand-strong)] text-[var(--on-brand)]"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {v}
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

  const winnerLabel = (_r: number, count: number) =>
    count === 1 ? "Final" : count === 2 ? "Semifinals" : count === 4 ? "Quarterfinals" : `Round of ${count * 2}`;

  const hasTree = winners.length + finals.length > 0;
  const [view, setView] = useState<"bracket" | "cards">("bracket");

  // Visual bracket diagram (the winners/final tree). Losers + 3rd-place always show as cards below.
  if (hasTree && view === "bracket") {
    return (
      <div className="space-y-5">
        <ViewToggle view={view} setView={setView} />
        <BracketDiagram matches={matches} participants={participants} />
        {hasLosers && (
          <Section
            label="Losers Bracket"
            phaseMatches={losers}
            participants={participants}
            tournamentId={tournamentId}
            roundLabel={(r) => `Losers R${r}`}
          />
        )}
        {placement.length > 0 && (
          <Section
            label="3rd-Place Game"
            phaseMatches={placement}
            participants={participants}
            tournamentId={tournamentId}
            roundLabel={() => "Bronze"}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {hasTree && <ViewToggle view={view} setView={setView} />}
      <Section
        label={hasLosers ? "Winners Bracket" : undefined}
        phaseMatches={winners}
        participants={participants}
        tournamentId={tournamentId}
        roundLabel={(r, c) => (hasLosers ? `Winners R${r}` : winnerLabel(r, c))}
      />
      {hasLosers && (
        <Section
          label="Losers Bracket"
          phaseMatches={losers}
          participants={participants}
          tournamentId={tournamentId}
          roundLabel={(r) => `Losers R${r}`}
        />
      )}
      {finals.length > 0 && (
        <Section
          label="Grand Final"
          phaseMatches={finals}
          participants={participants}
          tournamentId={tournamentId}
          roundLabel={(r) => (r === 1 ? "Grand Final" : "Reset (if needed)")}
        />
      )}
      {placement.length > 0 && (
        <Section
          label="3rd-Place Game"
          phaseMatches={placement}
          participants={participants}
          tournamentId={tournamentId}
          roundLabel={() => "Bronze"}
        />
      )}
    </div>
  );
}
