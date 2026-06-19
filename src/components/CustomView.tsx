"use client";

import { useState } from "react";
import { Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import { MatchCard } from "./MatchCard";
import { StandingsTable } from "./StandingsTable";
import { BracketDiagram } from "./BracketDiagram";
import { Champion } from "./Champion";
import { Button, Card } from "./ui";

export function CustomView({ t }: { t: Tournament }) {
  const addCustomMatch = useStore((s) => s.addCustomMatch);
  const removeMatch = useStore((s) => s.removeMatch);
  const spectator = t.spectator === true;

  const [tab, setTab] = useState<"schedule" | "bracket" | "standings">("schedule");
  // Each player can be assigned to Side A, Side B, or neither — so any pairing/matchup is possible.
  const [assign, setAssign] = useState<Record<string, "A" | "B">>({});

  const rounds = Array.from(new Set(t.matches.map((m) => m.round))).sort((x, y) => x - y);
  const maxRound = rounds.length ? rounds[rounds.length - 1] : 1;
  // Keep the round field as raw text so it can be cleared/retyped; clamp to a real round only when used.
  const [roundStr, setRoundStr] = useState(String(maxRound));
  const round = Math.max(1, Number(roundStr) || 1);

  const aIds = t.participants.filter((p) => assign[p.id] === "A").map((p) => p.id);
  const bIds = t.participants.filter((p) => assign[p.id] === "B").map((p) => p.id);
  const nameOf = (id: string) => t.participants.find((p) => p.id === id)?.name ?? "";

  // Players already scheduled in the selected round, and those still free.
  const inRound = new Set(
    t.matches.filter((m) => m.round === round).flatMap((m) => [...m.sideA, ...m.sideB]),
  );
  const remaining = t.participants.filter((p) => !inRound.has(p.id));
  const roundMatchCount = t.matches.filter((m) => m.round === round).length;
  const autoPairCount = Math.floor(remaining.length / 2);

  function setSide(id: string, side: "A" | "B") {
    setAssign((prev) => {
      const next = { ...prev };
      if (next[id] === side) delete next[id];
      else next[id] = side;
      return next;
    });
  }

  function add() {
    if (!aIds.length || !bIds.length) return;
    addCustomMatch(t.id, { sideA: aIds, sideB: bIds, round });
    setAssign({});
  }

  // Pair every still-free player into 1v1 matchups in the current round.
  function autoPair() {
    const ids = remaining.map((p) => p.id);
    for (let i = 0; i + 1 < ids.length; i += 2) {
      addCustomMatch(t.id, { sideA: [ids[i]], sideB: [ids[i + 1]], round });
    }
    setAssign({});
  }

  return (
    <div className="space-y-4">
      <Champion matches={t.matches} participants={t.participants} />

      <div className="inline-flex rounded-lg border bg-[var(--surface)] p-1">
        <TabBtn active={tab === "schedule"} onClick={() => setTab("schedule")}>
          Matches
        </TabBtn>
        <TabBtn active={tab === "bracket"} onClick={() => setTab("bracket")}>
          Bracket
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
      ) : tab === "bracket" ? (
        t.matches.length === 0 ? (
          <Card className="p-6 text-center text-sm text-[var(--muted)]">
            No matches yet —{" "}
            {spectator
              ? "the host hasn't added any."
              : "build matchups in the Matches tab and they'll lay out here as a bracket."}
          </Card>
        ) : (
          <Card className="p-5 space-y-3">
            <p className="text-xs text-[var(--muted)]">
              Your rounds laid out as a bracket — each round becomes a column. Add matchups and
              enter scores in the{" "}
              <button
                onClick={() => setTab("schedule")}
                className="text-[var(--brand)] underline underline-offset-2"
              >
                Matches
              </button>{" "}
              tab.
            </p>
            <BracketDiagram
              matches={t.matches}
              participants={t.participants}
              matchFilter={() => true}
            />
          </Card>
        )
      ) : (
        <>
          {!spectator && (
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">Build a match</h3>
              <p className="text-xs text-[var(--muted)]">
                Tap each player onto <b className="text-[var(--brand)]">A</b> or{" "}
                <b className="text-rose-400">B</b> — any singles, doubles, or team combination —
                then <b>Add match</b>. Add as many matchups as you want to the same round.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {t.participants.map((p) => (
                  <span
                    key={p.id}
                    className={`inline-flex items-center gap-1 rounded-full border pl-2.5 pr-1 py-1 text-sm ${
                      assign[p.id] === "A"
                        ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                        : assign[p.id] === "B"
                          ? "border-rose-400/60 bg-rose-400/10"
                          : "border-[var(--border)]"
                    }`}
                  >
                    <span className="font-medium">{p.name}</span>
                    <button
                      onClick={() => setSide(p.id, "A")}
                      className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        assign[p.id] === "A"
                          ? "bg-[var(--brand)] text-[var(--on-brand)]"
                          : "text-[var(--muted)] hover:bg-[var(--hover)]"
                      }`}
                    >
                      A
                    </button>
                    <button
                      onClick={() => setSide(p.id, "B")}
                      className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        assign[p.id] === "B"
                          ? "bg-rose-400 text-white"
                          : "text-[var(--muted)] hover:bg-[var(--hover)]"
                      }`}
                    >
                      B
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span>
                  <b className="text-[var(--brand)]">Side A:</b> {aIds.map(nameOf).join(" / ") || "—"}
                </span>
                <span className="text-[var(--muted)]">vs</span>
                <span>
                  <b className="text-rose-400">Side B:</b> {bIds.map(nameOf).join(" / ") || "—"}
                </span>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <label className="block">
                  <span className="text-xs font-medium text-[var(--muted)]">Round</span>
                  <input
                    type="number"
                    min={1}
                    value={roundStr}
                    onChange={(e) => setRoundStr(e.target.value)}
                    onBlur={() => setRoundStr(String(round))}
                    className="mt-1 w-16 rounded-lg border border-[var(--border)] px-2 py-2 text-sm bg-[var(--surface)]"
                  />
                </label>
                <Button onClick={add} disabled={!aIds.length || !bIds.length}>
                  Add match
                </Button>
                {autoPairCount > 0 && (
                  <Button variant="outline" onClick={autoPair}>
                    Auto-pair {autoPairCount} more 1v1{autoPairCount > 1 ? "s" : ""}
                  </Button>
                )}
              </div>

              <p className="text-xs text-[var(--muted)]">
                <b>Round {round}:</b> {roundMatchCount} matchup{roundMatchCount === 1 ? "" : "s"} so far
                {remaining.length > 0 &&
                  ` · ${remaining.length} player${remaining.length === 1 ? "" : "s"} not yet playing this round`}
              </p>
            </Card>
          )}

          {t.matches.length === 0 ? (
            <Card className="p-6 text-center text-sm text-[var(--muted)]">
              No matches yet — {spectator ? "the host hasn't added any." : "build your first matchup above."}
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
