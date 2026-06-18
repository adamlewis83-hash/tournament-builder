"use client";

import { useState } from "react";
import { Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import { MatchCard } from "./MatchCard";
import { StandingsTable } from "./StandingsTable";
import { Champion } from "./Champion";
import { Button, Card } from "./ui";

export function CustomView({ t }: { t: Tournament }) {
  const addCustomMatch = useStore((s) => s.addCustomMatch);
  const removeMatch = useStore((s) => s.removeMatch);
  const spectator = t.spectator === true;

  const [tab, setTab] = useState<"schedule" | "standings">("schedule");
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  const rounds = Array.from(new Set(t.matches.map((m) => m.round))).sort((a, b) => a - b);
  const maxRound = rounds.length ? rounds[rounds.length - 1] : 1;
  const [round, setRound] = useState(maxRound);

  function add() {
    if (!a || !b || a === b) return;
    addCustomMatch(t.id, { sideA: [a], sideB: [b], round });
    setA("");
    setB("");
  }

  const nameOf = (id: string) => t.participants.find((p) => p.id === id)?.name ?? "";

  return (
    <div className="space-y-4">
      <Champion matches={t.matches} participants={t.participants} />

      <div className="inline-flex rounded-lg border bg-[var(--surface)] p-1">
        <TabBtn active={tab === "schedule"} onClick={() => setTab("schedule")}>
          Matches
        </TabBtn>
        <TabBtn active={tab === "standings"} onClick={() => setTab("standings")}>
          Leaderboard
        </TabBtn>
      </div>

      {tab === "standings" ? (
        <StandingsTable
          participants={t.participants}
          matches={t.matches}
          title="Leaderboard"
          tiebreaker={t.config.tiebreaker}
        />
      ) : (
        <>
          {!spectator && (
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">Add a match</h3>
              <div className="flex flex-wrap items-end gap-2">
                <PlayerPick label="Player / team" value={a} exclude={b} options={t.participants} onChange={setA} />
                <span className="pb-2 text-[var(--muted)]">vs</span>
                <PlayerPick label="" value={b} exclude={a} options={t.participants} onChange={setB} />
                <label className="block">
                  <span className="text-xs font-medium text-[var(--muted)]">Round</span>
                  <input
                    type="number"
                    min={1}
                    value={round}
                    onChange={(e) => setRound(Math.max(1, Number(e.target.value) || 1))}
                    className="mt-1 w-16 rounded-lg border border-[var(--border)] px-2 py-2 text-sm bg-[var(--surface)]"
                  />
                </label>
                <Button onClick={add} disabled={!a || !b || a === b}>
                  Add match
                </Button>
              </div>
              {a && b && a !== b && (
                <p className="text-xs text-[var(--muted)]">
                  {nameOf(a)} vs {nameOf(b)} → Round {round}
                </p>
              )}
            </Card>
          )}

          {t.matches.length === 0 ? (
            <Card className="p-6 text-center text-sm text-[var(--muted)]">
              No matches yet — {spectator ? "the host hasn't added any." : "add your first matchup above."}
            </Card>
          ) : (
            <div className="space-y-6">
              {rounds.map((r) => (
                <div key={r}>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--brand-strong)] text-[var(--on-brand)] text-xs font-bold">
                      {r}
                    </span>
                    Round {r}
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {t.matches
                      .filter((m) => m.round === r)
                      .sort((x, y) => x.order - y.order)
                      .map((m) => (
                        <div key={m.id} className="relative">
                          <MatchCard tournamentId={t.id} participants={t.participants} match={m} />
                          {!spectator && (
                            <button
                              onClick={() => removeMatch(t.id, m.id)}
                              title="Remove match"
                              className="absolute -top-2 -right-2 h-6 w-6 grid place-items-center rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-red-500 hover:border-red-500 shadow-sm text-sm"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
        active
          ? "bg-gradient-to-r from-[var(--brand)] to-[var(--brand-strong)] text-[var(--on-brand)]"
          : "text-[var(--muted)] hover:text-[var(--foreground)]"
      }`}
    >
      {children}
    </button>
  );
}

function PlayerPick({
  label,
  value,
  exclude,
  options,
  onChange,
}: {
  label: string;
  value: string;
  exclude: string;
  options: Tournament["participants"];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      {label && <span className="text-xs font-medium text-[var(--muted)]">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block rounded-lg border border-[var(--border)] px-2 py-2 text-sm bg-[var(--surface)] max-w-[10rem]"
      >
        <option value="">Select…</option>
        {options
          .filter((p) => p.id !== exclude)
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
      </select>
    </label>
  );
}
