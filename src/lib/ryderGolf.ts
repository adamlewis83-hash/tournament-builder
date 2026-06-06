import { Match, Participant, Tournament } from "./types";
import { holeStrokes } from "./golf";

export interface MatchEntity {
  key: string; // participantId or "A"/"B"
  ids: string[]; // participant ids represented
  side: "A" | "B";
}

/** The score-entry columns for a match: one ball per team for Foursomes, else per player. */
export function entitiesForMatch(m: Match): MatchEntity[] {
  if (m.label === "Foursomes") {
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

/** Net score for each side on a single hole, or null if not fully entered yet. */
export function holeNets(t: Tournament, m: Match, h: number): { netA: number; netB: number } | null {
  const g = t.ryderGolf;
  if (!g) return null;
  const P = t.participants;
  const si = g.strokeIndex[h];
  const sc = g.scores[m.id] ?? {};
  if (m.label === "Foursomes") {
    const ga = sc["A"]?.[h];
    const gb = sc["B"]?.[h];
    if (ga == null || gb == null) return null;
    return {
      netA: ga - holeStrokes(teamHcp(P, m.sideA), si, g.holes),
      netB: gb - holeStrokes(teamHcp(P, m.sideB), si, g.holes),
    };
  }
  if (!m.sideA.every((id) => sc[id]?.[h] != null)) return null;
  if (!m.sideB.every((id) => sc[id]?.[h] != null)) return null;
  const best = (ids: string[]) =>
    Math.min(...ids.map((id) => (sc[id]![h] as number) - holeStrokes(hcpOf(P, id), si, g.holes)));
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
  if (!g) return { thru: 0, upA: 0, upB: 0, decided: false, holes: 0 };
  const holes = g.holes;
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
