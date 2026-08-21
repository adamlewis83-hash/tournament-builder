"use client";

import { useState } from "react";
import { Match, Participant, RYDER_METHOD_LABELS, RyderMethod, Tournament } from "@/lib/types";
import {
  CUP_SCORING_LABELS,
  RYDER_SESSION_BLURBS,
  RyderScoring,
  RyderSessionType,
} from "@/lib/ryder";
import { Trophy } from "@/components/icons";
import {
  cupScore,
  cupWeights,
  entitiesForMatch,
  entityStrokes,
  holeNets,
  matchOutcome,
  methodForMatch,
  methodIsChoosable,
  sessionCard,
} from "@/lib/ryderGolf";
import { useStore } from "@/lib/store";
import { canEditScores } from "@/lib/perms";
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
  const st = matchOutcome(t, m);
  const card = sessionCard(t, m.round) ?? g;
  const sc = g.scores[m.id] ?? {};
  const nameOf = (id: string) => t.participants.find((p) => p.id === id)?.name ?? "?";
  const sideNames = (ids: string[]) => ids.map(nameOf).join(" / ");
  const colLabel = (key: string) =>
    key === "A" ? teamNames[0] : key === "B" ? teamNames[1] : nameOf(key).split(" ")[0];
  const holes = Array.from({ length: card.holes }, (_, i) => i);
  const statusColor =
    st.a > st.b ? "text-[var(--brand)]" : st.b > st.a ? "text-rose-300" : "text-[var(--muted)]";

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
          <div className={`text-sm font-bold ${statusColor}`}>{st.text}</div>
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
                      {card.pars[h]}
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
            {m.label === "Foursomes" || m.label === "Team Alt Shot"
              ? " · partners share one ball, alternating shots"
              : m.label === "Scramble" || m.label === "Team Scramble"
                ? " · everyone hits, team plays the best shot — one team score"
                : m.label === "Fourball" || m.label === "Best Ball"
                  ? " · best net of the pair"
                  : m.label === "Shamble"
                    ? " · best drive, own balls in — best net counts"
                    : m.label === "Vegas"
                      ? " · scores combine low-first (4 & 5 → 45), lower number wins the hole — played gross"
                      : m.label === "Team Stableford"
                        ? " · team's combined Stableford points — most points wins the hole"
                        : ""}
          </p>
        </div>
      )}
    </Card>
  );
}

// Multi-course cups: pick which course (and which nine) one session plays on.
// Options come from the cup's default course plus the host's saved courses;
// save the day's courses in /courses (or via Course search in Edit setup) first.
/** How this session is read off the scorecard. Interpretive only — switching it
 *  re-settles the session's matches without touching a single hole. */
function SessionMethodControl({ t, round }: { t: Tournament; round: number }) {
  const setMethod = useStore((s) => s.setRyderSessionMethod);
  const ms = t.matches.filter((m) => m.phase === "ryder" && m.round === round);
  // Vegas and Team Stableford carry their own comparison — nothing to choose.
  if (!ms.length || !methodIsChoosable(ms[0].label)) return null;
  const current = methodForMatch(t, ms[0]);
  return (
    <select
      value={current}
      onChange={(e) => setMethod(t.id, round, e.target.value as RyderMethod)}
      title={RYDER_METHOD_LABELS[current].hint}
      className="max-w-[160px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs outline-none focus:border-[var(--brand)]"
    >
      {(Object.keys(RYDER_METHOD_LABELS) as RyderMethod[]).map((k) => (
        <option key={k} value={k}>
          🎯 {RYDER_METHOD_LABELS[k].label}
        </option>
      ))}
    </select>
  );
}

function SessionCourseControl({ t, round }: { t: Tournament; round: number }) {
  const savedCourses = useStore((s) => s.courses);
  const setSessionCourse = useStore((s) => s.setRyderSessionCourse);
  const g = t.ryderGolf;
  if (!g) return null;
  const nineHoles = g.holes <= 9;
  const current = g.sessionCourses?.[round];

  // Re-rank a nine's stroke indexes 1..9 (their 18-hole values would bunch the
  // handicap strokes when only nine are in play).
  const rerank = (si: number[]) => {
    const order = si.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
    const out = Array(si.length).fill(0);
    order.forEach(([, idx], rank) => (out[idx] = rank + 1));
    return out;
  };
  const slice = (pars: number[], si: number[], nine: "front" | "back") => {
    const from = nine === "back" ? 9 : 0;
    return { pars: pars.slice(from, from + 9), strokeIndex: rerank(si.slice(from, from + 9)) };
  };

  const apply = (v: string) => {
    if (v === "default") return setSessionCourse(t.id, round, null);
    const [cid, nine] = v.split("|") as [string, "front" | "back" | undefined];
    const c = savedCourses.find((x) => x.id === cid);
    if (!c) return;
    if (nineHoles && c.holes >= 18 && nine) {
      const cut = slice(c.pars, c.strokeIndex, nine);
      setSessionCourse(t.id, round, { courseName: c.name, nine, ...cut });
    } else {
      setSessionCourse(t.id, round, {
        courseName: c.name,
        pars: c.pars.slice(0, nineHoles ? 9 : c.holes),
        strokeIndex: nineHoles ? rerank(c.strokeIndex.slice(0, 9)) : c.strokeIndex.slice(0, c.holes),
      });
    }
  };

  const value = current
    ? (() => {
        const c = savedCourses.find((x) => x.name === current.courseName);
        return c ? `${c.id}${current.nine ? `|${current.nine}` : ""}` : "custom";
      })()
    : "default";

  return (
    <select
      value={value}
      onChange={(e) => apply(e.target.value)}
      className="max-w-[220px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs outline-none focus:border-[var(--brand)]"
      title="Course this session is played on"
    >
      <option value="default">⛳ {g.courseName ?? "Default course"}{nineHoles ? " · front 9" : ""}</option>
      {savedCourses.map((c) =>
        nineHoles && c.holes >= 18 ? (
          ["front", "back"].map((n) => (
            <option key={`${c.id}|${n}`} value={`${c.id}|${n}`}>
              ⛳ {c.name} · {n} 9
            </option>
          ))
        ) : (
          <option key={c.id} value={c.id}>
            ⛳ {c.name}
            {nineHoles && c.holes < 18 ? " · 9 holes (as saved)" : ""}
          </option>
        ),
      )}
      {value === "custom" && <option value="custom">⛳ {current?.courseName ?? "Custom"}</option>}
    </select>
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

/** Change how the cup is scored mid-cup. Re-weighing the matches is all this
 *  does — hole scores and results stay exactly where they are. */
function CupScoringControl({ t }: { t: Tournament }) {
  const setRyderScoring = useStore((s) => s.setRyderScoring);
  const setPoints = useStore((s) => s.setRyderPointsPerSession);
  const [open, setOpen] = useState(false);
  const current: RyderScoring = t.config.ryderScoring ?? "match";
  const typed = t.config.ryderPointsPerSession;
  const [draft, setDraft] = useState(typed != null ? String(typed) : "");

  // Matches in the session that is running (or the last one built) — what the points
  // typed here actually get divided by, spelled out so the split is never a surprise.
  const rounds = Array.from(
    new Set(t.matches.filter((m) => m.phase === "ryder").map((m) => m.round)),
  ).sort((a, b) => a - b);
  const lastRound = rounds[rounds.length - 1];
  const perSessionMatches = t.matches.filter(
    (m) => m.phase === "ryder" && m.round === lastRound,
  ).length;
  const onTheLine = typed ?? (current === "match" ? perSessionMatches : null);
  const each = onTheLine != null && perSessionMatches > 0 ? onTheLine / perSessionMatches : null;
  const num = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(3).replace(/\.?0+$/, ""));

  const commit = (raw: string) => {
    const v = parseFloat(raw);
    setPoints(t.id, Number.isFinite(v) && v > 0 ? v : undefined);
  };

  return (
    <div className="no-print mt-3 border-t border-[var(--border)] pt-2.5">
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs">
        <span className="text-[var(--muted)]">Scoring:</span>
        <span className="font-medium">{CUP_SCORING_LABELS[current].label}</span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-[var(--brand)] font-medium hover:underline"
        >
          {open ? "Close" : "Change"}
        </button>
      </div>
      {open && (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {(Object.keys(CUP_SCORING_LABELS) as RyderScoring[]).map((val) => (
            <button
              key={val}
              onClick={() => {
                setRyderScoring(t.id, val);
                setOpen(false);
              }}
              className={`rounded-lg border px-3 py-1.5 text-left text-xs transition ${
                current === val
                  ? "border-[var(--brand)] ring-1 ring-[var(--brand)] bg-[var(--brand-soft)]"
                  : "border-[var(--border)] hover:bg-[var(--hover)]"
              }`}
            >
              <span className="block font-medium">{CUP_SCORING_LABELS[val].label}</span>
              <span className="block text-[10px] text-[var(--muted)]">
                {CUP_SCORING_LABELS[val].hint}
              </span>
            </button>
          ))}
        </div>
      )}
      {open && (
        <div className="mt-3 border-t border-[var(--border)] pt-2.5">
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <label htmlFor="pps" className="text-[var(--muted)]">
              Or set points per session:
            </label>
            <input
              id="pps"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              value={draft}
              placeholder="auto"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={(e) => commit(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commit((e.target as HTMLInputElement).value)}
              className="w-20 rounded-lg border border-[var(--border)] bg-[var(--input)] px-2 py-1 text-center tabular-nums outline-none focus:border-[var(--brand)]"
            />
            {typed != null && (
              <button
                onClick={() => {
                  setDraft("");
                  setPoints(t.id, undefined);
                }}
                className="text-[var(--muted)] hover:text-rose-400"
              >
                clear
              </button>
            )}
          </div>
          {each != null && perSessionMatches > 0 && (
            <p className="mt-1.5 text-center text-[10px] text-[var(--muted)]">
              {num(onTheLine!)} point{onTheLine === 1 ? "" : "s"} on the line ·{" "}
              {perSessionMatches} match{perSessionMatches === 1 ? "" : "es"} this session →{" "}
              <span className="font-semibold text-[var(--foreground)]">{num(each)} each</span>
            </p>
          )}
          <p className="mt-1.5 text-center text-[10px] text-[var(--muted)]">
            Changing any of this only re-weighs the scoreboard — every hole and result
            you have entered stays put.
          </p>
        </div>
      )}
    </div>
  );
}

export function RyderView({ t }: { t: Tournament }) {
  const noEdit = !canEditScores(t); // spectator without scorekeeper rights
  // Default into captain's-picks mode until scoring has started — but never for a
  // spectator, who has no "Done" button to leave it with and whose pairing edits the
  // store drops anyway. They were being shown dead dropdowns instead of the match play.
  const [editing, setEditing] = useState(
    () => !noEdit && !(t.ryderGolf && Object.keys(t.ryderGolf.scores).length > 0),
  );
  const [shuffle, setShuffle] = useState(false);
  const [info, setInfo] = useState<RyderSessionType | null>(null);
  // Which session has its rules open. The blurb used to show only in the instant
  // after a session was added, and only for the host — so once play started, nobody
  // could look up how the game they were playing worked.
  const [rulesFor, setRulesFor] = useState<number | null>(null);
  const addRyderSession = useStore((s) => s.addRyderSession);
  const removeRyderRound = useStore((s) => s.removeRyderRound);
  const [nameA, nameB] = t.config.teamNames ?? ["Team A", "Team B"];
  const score = cupScore(t);
  const weights = cupWeights(t);
  const ryder = t.matches.filter((m) => m.phase === "ryder");
  const rounds = Array.from(new Set(ryder.map((m) => m.round))).sort((a, b) => a - b);
  const teamA = t.participants.filter((p) => p.team === 0);
  const teamB = t.participants.filter((p) => p.team === 1);

  const winnerName = score.status === "a-wins" ? nameA : score.status === "b-wins" ? nameB : null;
  const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(3).replace(/\.?0+$/, ""));

  // Live projection: official points plus in-progress matches counted as they stand
  // now (leader gets the match's point value, all-square splits it) — updates hole
  // by hole. It has to use the same point value the finished match will earn, or
  // the projection overshoots the cup whenever a match is worth less than a point.
  let liveA = score.a;
  let liveB = score.b;
  let inPlay = 0;
  for (const m of ryder) {
    if (m.scoreA !== null || m.scoreB !== null) continue; // decided → already counted
    const o = matchOutcome(t, m);
    if (o.thru === 0) continue; // not started
    inPlay++;
    const w = weights.get(m.id) ?? 1;
    liveA += w * o.a;
    liveB += w * o.b;
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
            ? `${fmt(score.clinch)} points wins the cup · ${fmt(score.a + score.b)}/${fmt(score.total)} points decided`
            : "Final result"}
        </p>
        {/* How the cup counts is the host's call, not a granted scorekeeper's. */}
        {!t.spectator && <CupScoringControl t={t} />}
      </Card>

      {!noEdit && (
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
          <div className="mt-3 space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Pairs (2v2)
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                ["Fourball", "Foursomes", "Best Ball", "Shamble", "Scramble", "Vegas"] as RyderSessionType[]
              ).map((ty) => (
                <Button
                  key={ty}
                  variant="outline"
                  className="px-3 py-1.5"
                  onClick={() => { addRyderSession(t.id, ty, shuffle); setInfo(ty); }}
                >
                  + {ty}
                </Button>
              ))}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Whole team &amp; singles
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                ["Team Scramble", "Team Alt Shot", "Team Stableford", "Singles"] as RyderSessionType[]
              ).map((ty) => (
                <Button
                  key={ty}
                  variant="outline"
                  className="px-3 py-1.5"
                  onClick={() => { addRyderSession(t.id, ty, shuffle); setInfo(ty); }}
                >
                  + {ty}
                </Button>
              ))}
            </div>
          </div>
          {info && (
            <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs">
              <span className="font-semibold">{info}:</span>{" "}
              <span className="text-[var(--muted)]">{RYDER_SESSION_BLURBS[info]}</span>
            </div>
          )}
          <p className="mt-2 text-xs text-[var(--muted)]">
            Pairings start in lineup order — tap <b>Set pairings</b> below to arrange them yourself,
            or tick Randomize to auto-shuffle. Change the game and the pairings every session — a
            9-hole session per game works great for team days.
          </p>
        </Card>
      )}

      {!noEdit && rounds.length > 0 && (
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
        const rules = RYDER_SESSION_BLURBS[label as RyderSessionType];
        return (
          <div key={round}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold">{label}</h3>
                {rules && (
                  <button
                    type="button"
                    onClick={() => setRulesFor((r) => (r === round ? null : round))}
                    aria-label={`How ${label} works`}
                    aria-expanded={rulesFor === round}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--border)] text-[11px] font-bold leading-none text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
                  >
                    ?
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {!noEdit && <SessionMethodControl t={t} round={round} />}
                {!noEdit && <SessionCourseControl t={t} round={round} />}
              </div>
              {editing && !noEdit && (
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
            {rulesFor === round && rules && (
              <div className="mb-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs">
                <span className="font-semibold">{label}:</span>{" "}
                <span className="text-[var(--muted)]">{rules}</span>
                {ms[0] && (
                  <div className="mt-1.5 border-t border-[var(--border)] pt-1.5">
                    <span className="font-semibold">
                      {RYDER_METHOD_LABELS[methodForMatch(t, ms[0])].label}:
                    </span>{" "}
                    <span className="text-[var(--muted)]">
                      {RYDER_METHOD_LABELS[methodForMatch(t, ms[0])].hint}
                    </span>
                  </div>
                )}
              </div>
            )}
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
