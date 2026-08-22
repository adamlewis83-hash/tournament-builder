import {
  CUP_VEGAS_DEFAULTS,
  Match,
  Participant,
  RyderMethod,
  Tournament,
  VegasRules,
} from "./types";
import { holeStrokes, vegasNumber } from "./golf";
import { matchWeights, RyderScore, ryderScore } from "./ryder";

export interface MatchEntity {
  key: string; // participantId or "A"/"B"
  ids: string[]; // participant ids represented
  side: "A" | "B";
}

// One ball per side (alternate shot / scramble variants): score entry is a
// single team column. Everything else is per-player balls.
export const ONE_BALL_SESSIONS = [
  "Foursomes",
  "Alt Shot",
  "Scramble",
  "Team Scramble",
  "Team Alt Shot",
];
const oneBall = (label?: string) => ONE_BALL_SESSIONS.includes(label ?? "");

/** The score-entry columns for a match: one team score, or per player. */
export function entitiesForMatch(m: Match): MatchEntity[] {
  if (oneBall(m.label)) {
    return [
      { key: "A", ids: m.sideA, side: "A" },
      { key: "B", ids: m.sideB, side: "B" },
    ];
  }
  return [
    ...m.sideA.map((id) => ({ key: id, ids: [id], side: "A" as const })),
    ...m.sideB.map((id) => ({ key: id, ids: [id], side: "B" as const })),
  ];
}

const hcpOf = (p: Participant[], id: string) => p.find((x) => x.id === id)?.handicap ?? 0;
const teamHcp = (p: Participant[], ids: string[]) =>
  ids.length ? Math.round(ids.reduce((s, id) => s + hcpOf(p, id), 0) / ids.length) : 0;

/** The card a given session (round) is played on: its assigned course/nine if
 *  set (multi-course cups), else the cup's default course. */
export function sessionCard(
  t: Tournament,
  round: number,
): { holes: number; pars: number[]; strokeIndex: number[]; courseName?: string; nine?: "front" | "back" } | null {
  const g = t.ryderGolf;
  if (!g) return null;
  const sc = g.sessionCourses?.[round];
  if (sc) return { holes: sc.pars.length, pars: sc.pars, strokeIndex: sc.strokeIndex, courseName: sc.courseName, nine: sc.nine };
  return { holes: g.holes, pars: g.pars, strokeIndex: g.strokeIndex, courseName: g.courseName };
}

/** How many handicap strokes an entity (player, or a team ball) gets on a hole. */
export function entityStrokes(t: Tournament, m: Match, key: string, h: number): number {
  const g = t.ryderGolf;
  const card = sessionCard(t, m.round);
  if (!g || !card) return 0;
  const si = card.strokeIndex[h];
  if (oneBall(m.label)) {
    const ids = key === "A" ? m.sideA : m.sideB;
    return holeStrokes(teamHcp(t.participants, ids), si, card.holes);
  }
  // Vegas is gross by default — the combined number is its own equalizer — but
  // house rules can switch it to net, and then strokes show like anywhere else.
  if (m.label === "Vegas" && !cupVegasRules(t).net) return 0;
  return holeStrokes(hcpOf(t.participants, key), si, card.holes);
}

/** The cup's Vegas house rules. Only `net` and `flipOn` apply here — presses and
 *  money are side bets that belong to the standalone Vegas game, never to cup points.
 *  A host's saved choice always wins over the default, including an explicit "off". */
export function cupVegasRules(t: Tournament): VegasRules {
  return { ...CUP_VEGAS_DEFAULTS, ...(t.config.vegasRules ?? {}) };
}

/**
 * Per-hole result value for each side (lower wins the hole), or null until the
 * hole is fully entered. One-ball sessions compare team-ball nets; Vegas
 * compares the pair's combined gross number (low ball first, balls capped at 9);
 * Team Stableford compares negated team points (so lower still wins); everything
 * else is best net of the side's balls.
 */
export function holeNets(t: Tournament, m: Match, h: number): { netA: number; netB: number } | null {
  const g = t.ryderGolf;
  const card = sessionCard(t, m.round);
  if (!g || !card) return null;
  const P = t.participants;
  const si = card.strokeIndex[h];
  const sc = g.scores[m.id] ?? {};
  if (oneBall(m.label)) {
    const ga = sc["A"]?.[h];
    const gb = sc["B"]?.[h];
    if (ga == null || gb == null) return null;
    return {
      netA: ga - holeStrokes(teamHcp(P, m.sideA), si, card.holes),
      netB: gb - holeStrokes(teamHcp(P, m.sideB), si, card.holes),
    };
  }
  if (!m.sideA.every((id) => sc[id]?.[h] != null)) return null;
  if (!m.sideB.every((id) => sc[id]?.[h] != null)) return null;

  if (m.label === "Vegas") {
    // House rules (net balls, the flip) change the numbers — and therefore the
    // points and the cup point. Same semantics as the standalone Vegas ledger.
    const rules = cupVegasRules(t);
    const balls = (ids: string[]) =>
      ids.map((id) => {
        const raw = sc[id]![h] as number;
        return rules.net ? raw - holeStrokes(hcpOf(P, id), si, card.holes) : raw;
      });
    const ballsA = balls(m.sideA);
    const ballsB = balls(m.sideB);
    const par = card.pars[h];
    const threshold = rules.flipOn === "eagle" ? par - 2 : par - 1;
    const made = (bs: number[]) => rules.flipOn !== "off" && bs.some((b) => b <= threshold);
    // A birdie flips the OPPONENT's number (high ball first), never your own.
    return {
      netA: vegasNumber(ballsA, made(ballsB)),
      netB: vegasNumber(ballsB, made(ballsA)),
    };
  }

  if (m.label === "Team Stableford") {
    // Sum of each ball's net Stableford points; negated so "lower wins" holds.
    const pts = (ids: string[]) =>
      ids.reduce((sum, id) => {
        const net = (sc[id]![h] as number) - holeStrokes(hcpOf(P, id), si, card.holes);
        return sum + Math.max(0, card.pars[h] - net + 2);
      }, 0);
    return { netA: -pts(m.sideA), netB: -pts(m.sideB) };
  }

  const best = (ids: string[]) =>
    Math.min(...ids.map((id) => (sc[id]![h] as number) - holeStrokes(hcpOf(P, id), si, card.holes)));
  return { netA: best(m.sideA), netB: best(m.sideB) };
}

export interface MatchStatus {
  thru: number;
  upA: number;
  upB: number;
  decided: boolean;
  holes: number;
}

/** Net match-play status for a Ryder match. Foursomes use a team ball (50% combined
 *  handicap ≈ average); Fourball/Singles use each player's net, team takes the best. */
export function matchStatus(t: Tournament, m: Match): MatchStatus {
  const g = t.ryderGolf;
  const card = sessionCard(t, m.round);
  if (!g || !card) return { thru: 0, upA: 0, upB: 0, decided: false, holes: 0 };
  const holes = card.holes;
  let upA = 0;
  let upB = 0;
  let thru = 0;

  for (let h = 0; h < holes; h++) {
    const nets = holeNets(t, m, h);
    if (!nets) continue;
    thru++;
    if (nets.netA < nets.netB) upA++;
    else if (nets.netB < nets.netA) upB++;
  }

  const remaining = holes - thru;
  const decided = thru === holes || Math.abs(upA - upB) > remaining;
  return { thru, upA, upB, decided, holes };
}

/** Match-play result text, e.g. "2 UP thru 7", "3 & 2", "Halved". */
export function matchText(s: MatchStatus): string {
  if (s.thru === 0) return "—";
  const diff = Math.abs(s.upA - s.upB);
  const remaining = s.holes - s.thru;
  if (s.upA === s.upB) return s.thru === s.holes ? "Halved" : `All Square · thru ${s.thru}`;
  const leader = s.upA > s.upB ? "A" : "B";
  if (s.decided && remaining > 0) return `${leader === "A" ? "▲" : "▼"} ${diff} & ${remaining}`;
  if (s.thru === s.holes) return `${leader === "A" ? "▲" : "▼"} ${diff} up`;
  return `${leader === "A" ? "▲" : "▼"} ${diff} up · thru ${s.thru}`;
}

// ---- How a session is decided -------------------------------------------------

// Two games carry their own comparison, so there is nothing to re-score: Vegas is
// the combined-number duel, and Team Stableford already counts points. Everything
// else works off a real net stroke per hole and can be read three ways.
const FIXED_METHOD = new Set(["Vegas", "Team Stableford"]);
export const methodIsChoosable = (label?: string) => !FIXED_METHOD.has(label ?? "");

/** The scoring method a match is decided by. */
export function methodForMatch(t: Tournament, m: Match): RyderMethod {
  if (m.label === "Vegas") return "vegas"; // points, not holes — 45 vs 55 pays 10
  if (!methodIsChoosable(m.label)) return "match";
  return t.ryderGolf?.sessionMethods?.[m.round] ?? "match";
}

/** Net Stableford points for a hole: 2 for a net par, +1 per stroke better, 0 floor. */
const stablefordPoints = (par: number, net: number) => Math.max(0, par - net + 2);

export interface MatchOutcome {
  method: RyderMethod;
  thru: number;
  holes: number;
  decided: boolean;
  /** Points this match awards each side — 1 / 0 for a win, ½ each when tied. The cup's
   *  per-session weighting is applied on top of this, never inside it. */
  a: number;
  b: number;
  /** Running margin in the method's own units (holes up, strokes, or points). */
  marginA: number;
  marginB: number;
  text: string;
}

/**
 * Decide a match from the same scorecard, the way its session is set to be read.
 * Match play can close out early; stroke and Stableford need every hole in.
 */
export function matchOutcome(t: Tournament, m: Match): MatchOutcome {
  const method = methodForMatch(t, m);
  const card = sessionCard(t, m.round);
  const holes = card?.holes ?? 0;

  if (method === "match") {
    const st = matchStatus(t, m);
    const a = st.upA > st.upB ? 1 : st.upB > st.upA ? 0 : 0.5;
    return {
      method,
      thru: st.thru,
      holes: st.holes,
      decided: st.decided,
      a,
      b: 1 - a,
      marginA: st.upA,
      marginB: st.upB,
      text: matchText(st),
    };
  }

  let thru = 0;
  let valA = 0;
  let valB = 0;
  for (let h = 0; h < holes; h++) {
    const nets = holeNets(t, m, h);
    if (!nets) continue;
    thru++;
    if (method === "vegas") {
      // The hole pays the DIFFERENCE to the lower combined number: 45 vs 55 → 10.
      if (nets.netA < nets.netB) valA += nets.netB - nets.netA;
      else if (nets.netB < nets.netA) valB += nets.netA - nets.netB;
    } else if (method === "stroke") {
      valA += nets.netA;
      valB += nets.netB;
    } else {
      const par = card!.pars[h];
      valA += stablefordPoints(par, nets.netA);
      valB += stablefordPoints(par, nets.netB);
    }
  }

  // Stroke play is won low, Stableford high. Neither can be clinched early — a
  // stroke deficit is recoverable to the last hole — so the result lands only
  // once the session is complete.
  const aAhead = method === "stroke" ? valA < valB : valA > valB;
  const bAhead = method === "stroke" ? valB < valA : valB > valA;
  const decided = holes > 0 && thru === holes;
  const a = aAhead ? 1 : bAhead ? 0 : 0.5;
  const diff = Math.abs(valA - valB);
  const unit = method === "stroke" ? (diff === 1 ? "stroke" : "strokes") : diff === 1 ? "pt" : "pts";
  const arrow = aAhead ? "▲" : "▼";
  const text = !thru
    ? "—"
    : diff === 0
      ? decided
        ? "Tied"
        : `All Square · thru ${thru}`
      : decided
        ? `${arrow} by ${diff} ${unit}`
        : `${arrow} ${diff} ${unit} · thru ${thru}`;

  return { method, thru, holes, decided, a, b: 1 - a, marginA: valA, marginB: valB, text };
}

/** Holes a given session plays — its own card if it has one, else the cup's. */
export const roundHoles = (t: Tournament) => (round: number) =>
  sessionCard(t, round)?.holes ?? t.ryderGolf?.holes ?? 18;

/** The cup scoreboard, with each session weighed on the card it is played on. */
export function cupScore(t: Tournament): RyderScore {
  return ryderScore(
    t.matches,
    t.config.ryderScoring,
    t.ryderGolf?.holes,
    roundHoles(t),
    t.config.ryderPointsPerSession,
  );
}

/** What each match is worth on this cup's scoreboard, by match id. */
export function cupWeights(t: Tournament): Map<string, number> {
  return matchWeights(
    t.matches,
    t.config.ryderScoring,
    t.ryderGolf?.holes,
    roundHoles(t),
    t.config.ryderPointsPerSession,
  );
}
