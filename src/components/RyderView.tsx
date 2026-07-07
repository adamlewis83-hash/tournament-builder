"use client";

import { useState } from "react";
import { Match, Participant, Tournament } from "@/lib/types";
import { ryderScore, RyderSessionType } from "@/lib/ryder";
import { Trophy } from "@/components/icons";
import { entitiesForMatch, entityStrokes, holeNets, matchStatus, matchText } from "@/lib/ryderGolf";
import { useStore } from "@/lib/store";
import { Button, Card } from "./ui";
import { Confetti } from "./Confetti";

function RyderMatchCard({
  t,
  m,
  teamNames,
}: {
  t: Tournament;
  m: Match;
  teamNames: [string, string];
}) {
  const setScore = useStore((s) => s.setRyderHoleScore);
  const [open, setOpen] = useState(false);
  const g = t.ryderGolf;
  if (!g) return null;

  const ents = entitiesForMatch(m);
  const st = matchStatus(t, m);
  const sc = g.scores[m.id] ?? {};
  const nameOf = (id: string) => t.participants.find((p) => p.id === id)?.name ?? "?";
  const sideNames = (ids: string[]) => ids.map(nameOf).join(" / ");
  const colLabel = (key: string) =>
    key === "A" ? teamNames[0] : key === "B" ? teamNames[1] : nameOf(key).split(" ")[0];
  const holes = Array.from({ length: g.holes }, (_, i) => i);
  const statusColor =
    st.upA > st.upB ? "text-[var(--brand)]" : st.upB > st.upA ? "text-rose-300" : "text-[var(--muted)]";

  return (
    <Card className="p-0 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--hover)]"
      >
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-[var(--muted)] font-bold">
            {m.label}
          </div>
          <div className="font-semibold truncate">
            <span className="text-[var(--brand)]">{sideNames(m.sideA)}</span>
            <span className="text-[var(--muted)]"> vs </span>
            <span className="text-rose-300">{sideNames(m.sideB)}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-sm font-bold ${statusColor}`}>{matchText(st)}</div>
          <div className="text-[10px] text-[var(--muted)]">{open ? "Hide ▴" : "Score ▾"}</div>
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 overflow-x-auto border-t border-[var(--border)]">
          <table className="text-sm border-separate border-spacing-0 mt-2">
            <thead>
              <tr className="text-xs text-[var(--muted)]">
                <th className="px-2 py-1 text-left sticky left-0 bg-[var(--surface)]">Hole</th>
                <th className="px-1 py-1">Par</th>
                {ents.map((e) => (
                  <th
                    key={e.key}
                    className={`px-1 py-1 ${e.side === "A" ? "text-[var(--brand)]" : "text-rose-300"}`}
                  >
                    {colLabel(e.key)}
                  </th>
                ))}
                <th className="px-1 py-1"></th>
              </tr>
            </thead>
            <tbody>
              {holes.map((h) => {
                const nets = holeNets(t, m, h);
                const res = nets
                  ? nets.netA < nets.netB
                    ? "A"
                    : nets.netB < nets.netA
                      ? "B"
                      : "–"
                  : "";
                return (
                  <tr key={h}>
                    <td className="px-2 py-1 sticky left-0 bg-[var(--surface)] border-t border-[var(--border)] font-medium">
                      {h + 1}
                    </td>
                    <td className="px-1 py-1 text-center text-[var(--muted)] border-t border-[var(--border)]">
                      {g.pars[h]}
                    </td>
                    {ents.map((e) => {
                      const strokes = entityStrokes(t, m, e.key, h);
                      return (
                        <td key={e.key} className="px-0.5 py-1 border-t border-[var(--border)] align-bottom">
                          <div className="flex justify-center items-center gap-0.5 h-1.5 mb-0.5">
                            {Array.from({ length: strokes }).map((_, i) => (
                              <span key={i} className="h-1 w-1 rounded-full bg-amber-400" />
                            ))}
                          </div>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={sc[e.key]?.[h] ?? ""}
                            onChange={(ev) =>
                              setScore(
                                t.id,
                                m.id,
                                e.key,
                                h,
                                ev.target.value === "" ? null : Number(ev.target.value),
                              )
                            }
                            className="w-9 rounded border border-[var(--border)] bg-[var(--input)] px-0.5 py-1 text-center tabular-nums outline-none focus:border-[var(--brand)]"
                          />
                        </td>
                      );
                    })}
                    <td
                      className={`px-1 py-1 text-center border-t border-[var(--border)] font-bold ${
                        res === "A" ? "text-[var(--brand)]" : res === "B" ? "text-rose-300" : "text-[var(--muted)]"
                      }`}
                    >
                      {res === "A" ? "▲" : res === "B" ? "▼" : res}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[10px] text-[var(--muted)] mt-1.5">
            <span className="inline-block h-1 w-1 rounded-full bg-amber-400 align-middle" /> = a handicap
            stroke on that hole · net result per hole
            {m.label === "Foursomes"
              ? " · one ball per team (alternate shot)"
              : m.label === "Fourball"
                ? " · best net of the pair"
                : ""}
          </p>
        </div>
      )}
    </Card>
  );
}

function PairingEditor({
  t,
  match,
  teamA,
  teamB,
}: {
  t: Tournament;
  match: Match;
  teamA: Participant[];
  teamB: Participant[];
}) {
  const setMatchSides = useStore((s) => s.setMatchSides);
  const slots = Math.max(match.sideA.length, 1);

  const setSlot = (side: "A" | "B", idx: number, value: string) => {
    const a = [...match.sideA];
    const b = [...match.sideB];
    const arr = side === "A" ? a : b;
    while (arr.length < slots) arr.push("");
    arr[idx] = value;
    setMatchSides(t.id, match.id, a.filter(Boolean), b.filter(Boolean));
  };

  const Select = ({ side, idx, options }: { side: "A" | "B"; idx: number; options: Participant[] }) => {
    const cur = (side === "A" ? match.sideA : match.sideB)[idx] ?? "";
    return (
      <select
        value={cur}
        onChange={(e) => setSlot(side, idx, e.target.value)}
        className="w-full rounded border border-[var(--border)] bg-[var(--input)] px-1.5 py-1 text-sm outline-none focus:border-[var(--brand)]"
      >
        <option value="">—</option>
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    );
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-2.5">
      <div className="text-[10px] uppercase tracking-widest text-[var(--muted)] font-bold mb-1.5">
        {match.label}
      </div>
      <div className="space-y-1.5">
        <div className="space-y-1">
          {Array.from({ length: slots }, (_, i) => (
            <Select key={`a${i}`} side="A" idx={i} options={teamA} />
          ))}
        </div>
        <div className="text-center text-[10px] text-[var(--muted)] font-bold">vs</div>
        <div className="space-y-1">
          {Array.from({ length: slots }, (_, i) => (
            <Select key={`b${i}`} side="B" idx={i} options={teamB} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function RyderView({ t }: { t: Tournament }) {
  // Default into captain's-picks mode until scoring has started.
  const [editing, setEditing] = useState(
    () => !(t.ryderGolf && Object.keys(t.ryderGolf.scores).length > 0),
  );
  const [shuffle, setShuffle] = useState(false);
  const addRyderSession = useStore((s) => s.addRyderSession);
  const removeRyderRound = useStore((s) => s.removeRyderRound);
  const [nameA, nameB] = t.config.teamNames ?? ["Team A", "Team B"];
  const score = ryderScore(t.matches);
  const ryder = t.matches.filter((m) => m.phase === "ryder");
  const rounds = Array.from(new Set(ryder.map((m) => m.round))).sort((a, b) => a - b);
  const teamA = t.participants.filter((p) => p.team === 0);
  const teamB = t.participants.filter((p) => p.team === 1);

  const winnerName = score.status === "a-wins" ? nameA : score.status === "b-wins" ? nameB : null;
  const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

  // Live projection: official points plus in-progress matches counted as they stand
  // now (leader gets the point, all-square splits) — updates hole by hole.
  let liveA = score.a;
  let liveB = score.b;
  let inPlay = 0;
  for (const m of ryder) {
    if (m.scoreA !== null || m.scoreB !== null) continue; // decided → already counted
    const st = matchStatus(t, m);
    if (st.thru === 0) continue; // not started
    inPlay++;
    if (st.upA > st.upB) liveA += 1;
    else if (st.upB > st.upA) liveB += 1;
    else {
      liveA += 0.5;
      liveB += 0.5;
    }
  }

  return (
    <div className="space-y-5">
      {!editing && (winnerName || score.status === "tie") && (
        <>
          {winnerName && <Confetti trigger={winnerName} />}
          <div className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/15 to-[var(--brand-soft)] p-6 text-center glow-brand">
            <Trophy className="h-12 w-12 mx-auto text-amber-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
            <div className="mt-2 text-xs uppercase tracking-[0.3em] text-amber-300 font-bold">
              {score.status === "tie" ? "Cup Retained — Tie" : "Cup Winner"}
            </div>
            <div className="mt-1 text-2xl font-extrabold">
              {winnerName ?? `${nameA} ${fmt(score.a)} – ${fmt(score.b)} ${nameB}`}
            </div>
          </div>
        </>
      )}

      {/* Scoreboard */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            <div className="text-sm font-semibold text-[var(--brand)] truncate flex items-center justify-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--brand)]" />
              {nameA}
            </div>
            <div className="text-4xl font-extrabold tabular-nums">{fmt(score.a)}</div>
          </div>
          <div className="text-[var(--muted)] text-sm font-bold">vs</div>
          <div className="flex-1 text-center">
            <div className="text-sm font-semibold text-rose-300 truncate flex items-center justify-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              {nameB}
            </div>
            <div className="text-4xl font-extrabold tabular-nums">{fmt(score.b)}</div>
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-rose-400/30 overflow-hidden">
          <div className="h-full bg-[var(--brand)]" style={{ width: `${score.total ? (score.a / score.total) * 100 : 50}%` }} />
        </div>
        {inPlay > 0 && (
          <p className="text-center text-sm mt-2.5 font-medium">
            <span className="text-[var(--muted)]">On the course now:</span>{" "}
            <span className="font-bold text-[var(--brand)] tabular-nums">{fmt(liveA)}</span>
            <span className="text-[var(--muted)]"> – </span>
            <span className="font-bold text-rose-300 tabular-nums">{fmt(liveB)}</span>{" "}
            <span className="text-xs text-[var(--muted)]">
              if the {inPlay} live match{inPlay > 1 ? "es hold" : " holds"}
            </span>
          </p>
        )}
        <p className="text-center text-xs text-[var(--muted)] mt-2">
          {score.status === "in-progress"
            ? `${fmt(score.clinch)} points wins the cup · ${score.played}/${score.total} matches played`
            : "Final result"}
        </p>
      </Card>

      {!t.spectator && (
        <Card className="no-print p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <span className="font-semibold">Add a session</span>
              <span className="text-[var(--muted)]"> — build the next round as the cup unfolds.</span>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-[var(--muted)] cursor-pointer">
              <input
                type="checkbox"
                checked={shuffle}
                onChange={(e) => setShuffle(e.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--brand)]"
              />
              🎲 Randomize pairings
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["Foursomes", "Fourball", "Singles"] as RyderSessionType[]).map((ty) => (
              <Button
                key={ty}
                variant="outline"
                className="px-3 py-1.5"
                onClick={() => addRyderSession(t.id, ty, shuffle)}
              >
                + {ty}
              </Button>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Pairings start in lineup order — tap <b>Set pairings</b> below to arrange them yourself,
            or tick Randomize to auto-shuffle.
          </p>
        </Card>
      )}

      {!t.spectator && rounds.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--muted)]">
            {editing
              ? `Set partners & matchups — ${nameA} on top, ${nameB} on bottom.`
              : "Captain's picks: edit who partners whom and the matchups."}
          </p>
          <Button
            variant={editing ? "primary" : "outline"}
            className="px-3 py-1.5"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? "Done" : "Set pairings"}
          </Button>
        </div>
      )}

      {rounds.map((round) => {
        const ms = ryder.filter((m) => m.round === round).sort((a, b) => a.order - b.order);
        if (!ms.length) return null;
        const label = ms[0].label ?? `Round ${round}`;
        return (
          <div key={round}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{label}</h3>
              {editing && !t.spectator && (
                <button
                  onClick={() => {
                    if (confirm(`Remove this ${label} session?`)) removeRyderRound(t.id, round);
                  }}
                  className="text-xs text-[var(--muted)] hover:text-rose-400"
                >
                  Remove
                </button>
              )}
            </div>
            {editing ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ms.map((m) => (
                  <PairingEditor key={m.id} t={t} match={m} teamA={teamA} teamB={teamB} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {ms.map((m) => (
                  <RyderMatchCard key={m.id} t={t} m={m} teamNames={[nameA, nameB]} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
