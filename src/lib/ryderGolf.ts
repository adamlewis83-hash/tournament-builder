import { Match, Participant, Tournament } from "./types";
import { holeStrokes } from "./golf";

export interface MatchEntity {
  key: string; // participantId or "A"/"B"
  ids: string[]; // participant ids represented
  side: "A" | "B";
}

// One ball per side (alternate shot / scramble variants): score entry is a
// single team column. Everything else is per-player balls.
export const ONE_BALL_SESSIONS = ["Foursomes", "Scramble", "Team Scramble", "Team Alt Shot"];
const oneBall = (label?: string) => ONE_BALL_SESSIONS.includes(label ?? "");

/** The score-entry columns for a match: one ball per team, or per player. */
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
  // Vegas is played gross — the combined number is its own equalizer by custom.
  if (m.label === "Vegas") return 0;
  return holeStrokes(hcpOf(t.participants, key), si, card.holes);
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
    const combined = (ids: string[]) => {
      const balls = ids.map((id) => Math.min(9, sc[id]![h] as number)).sort((a, b) => a - b);
      return balls.reduce((n, b) => n * 10 + b, 0); // low ball first: 4 & 5 → 45
    };
    return { netA: combined(m.sideA), netB: combined(m.sideB) };
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
