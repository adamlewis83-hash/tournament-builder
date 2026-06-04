import { GolfData, GolfMode, Participant, Tournament } from "./types";

export const isSideGame = (m: GolfMode) => m === "bingo" || m === "wolf";

// Standard par-72 layout + a spread stroke index (front nine odd, back nine even).
const PAR_18 = [4, 4, 5, 3, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 5];
const SI_18 = [1, 3, 5, 7, 9, 11, 13, 15, 17, 2, 4, 6, 8, 10, 12, 14, 16, 18];

export function defaultGolf(holes: number, participantIds: string[]): GolfData {
  const n = holes === 9 ? 9 : 18;
  const pars = PAR_18.slice(0, n);
  const strokeIndex = n === 18 ? SI_18 : Array.from({ length: 9 }, (_, i) => i + 1);
  const scores: Record<string, (number | null)[]> = {};
  for (const id of participantIds) scores[id] = Array(n).fill(null);
  return {
    holes: n,
    pars,
    strokeIndex,
    scores,
    bbb: { bingo: Array(n).fill(null), bango: Array(n).fill(null), bongo: Array(n).fill(null) },
    wolf: { partner: Array(n).fill(null) },
  };
}

export interface PointRow {
  participantId: string;
  name: string;
  points: number;
  detail: string; // small breakdown, e.g. award counts
}

/** Bingo Bango Bongo: 1 point per award (first on, closest, first in). */
export function computeBbb(t: Tournament): PointRow[] {
  const g = t.golf;
  const counts = new Map<string, { points: number; bi: number; ba: number; bo: number }>();
  t.participants.forEach((p) => counts.set(p.id, { points: 0, bi: 0, ba: 0, bo: 0 }));
  if (g?.bbb) {
    const tally = (arr: (string | null)[], key: "bi" | "ba" | "bo") => {
      for (const id of arr) {
        if (id && counts.has(id)) {
          const c = counts.get(id)!;
          c.points += 1;
          c[key] += 1;
        }
      }
    };
    tally(g.bbb.bingo, "bi");
    tally(g.bbb.bango, "ba");
    tally(g.bbb.bongo, "bo");
  }
  return t.participants
    .map((p) => {
      const c = counts.get(p.id)!;
      return {
        participantId: p.id,
        name: p.name,
        points: c.points,
        detail: `${c.bi} / ${c.ba} / ${c.bo}`,
      };
    })
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}

/** The wolf for a given hole (0-based), by fixed rotation through the field. */
export function wolfForHole(participantIds: string[], hole: number): string | undefined {
  if (!participantIds.length) return undefined;
  return participantIds[hole % participantIds.length];
}

/**
 * Wolf scoring from the scorecard + per-hole partner choice.
 * Partnered win: wolf & partner +1 each. Lone win: wolf +3.
 * Partnered loss: each opponent +2. Lone loss: each opponent +1. Ties: no points.
 */
export function computeWolf(t: Tournament): PointRow[] {
  const g = t.golf;
  const ids = t.participants.map((p) => p.id);
  const pts = new Map<string, number>();
  ids.forEach((id) => pts.set(id, 0));
  const add = (id: string, n: number) => pts.set(id, (pts.get(id) ?? 0) + n);

  if (g?.wolf) {
    for (let h = 0; h < g.holes; h++) {
      const wolf = wolfForHole(ids, h);
      const choice = g.wolf.partner[h];
      if (!wolf || !choice) continue;
      const score = (id: string) => g.scores[id]?.[h];
      if (ids.some((id) => score(id) === null || score(id) === undefined)) continue; // need all scores

      if (choice === "lone") {
        const others = ids.filter((id) => id !== wolf);
        const wolfScore = score(wolf) as number;
        const oppBest = Math.min(...others.map((id) => score(id) as number));
        if (wolfScore < oppBest) add(wolf, 3);
        else if (wolfScore > oppBest) others.forEach((id) => add(id, 1));
      } else {
        const team = [wolf, choice];
        const opps = ids.filter((id) => id !== wolf && id !== choice);
        const teamBest = Math.min(...team.map((id) => score(id) as number));
        const oppBest = Math.min(...opps.map((id) => score(id) as number));
        if (teamBest < oppBest) team.forEach((id) => add(id, 1));
        else if (teamBest > oppBest) opps.forEach((id) => add(id, 2));
      }
    }
  }
  return t.participants
    .map((p) => ({ participantId: p.id, name: p.name, points: pts.get(p.id) ?? 0, detail: "" }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}

/** Handicap strokes received on a hole of the given stroke index. */
export function holeStrokes(handicap: number, si: number, holes: number): number {
  const h = Math.max(0, Math.round(handicap));
  const base = Math.floor(h / holes);
  const rem = h % holes;
  return base + (si <= rem ? 1 : 0);
}

export interface GolfRow {
  participantId: string;
  name: string;
  handicap: number;
  thru: number; // holes completed
  gross: number;
  net: number;
  toPar: number; // gross vs par of holes played
  stableford: number;
  skins: number;
  frontNet: number; // Nassau front 9 (net)
  backNet: number; // Nassau back 9 (net)
}

export function computeGolf(t: Tournament, mode: GolfMode = "stroke"): GolfRow[] {
  const g = t.golf;
  if (!g) return [];
  const players = t.participants;

  // Skins (gross) with carryover — resolved only over consecutive completed holes.
  const skinsMap = new Map<string, number>();
  players.forEach((p) => skinsMap.set(p.id, 0));
  {
    let pot = 1;
    for (let h = 0; h < g.holes; h++) {
      const entries = players.map((p) => ({ id: p.id, v: g.scores[p.id]?.[h] ?? null }));
      if (entries.some((e) => e.v === null)) break; // can't resolve this/later holes yet
      const min = Math.min(...entries.map((e) => e.v as number));
      const winners = entries.filter((e) => e.v === min);
      if (winners.length === 1) {
        skinsMap.set(winners[0].id, (skinsMap.get(winners[0].id) ?? 0) + pot);
        pot = 1;
      } else {
        pot += 1;
      }
    }
  }

  const rows: GolfRow[] = players.map((p: Participant) => {
    const card = g.scores[p.id] ?? [];
    const hcp = p.handicap ?? 0;
    let gross = 0;
    let net = 0;
    let parPlayed = 0;
    let thru = 0;
    let stableford = 0;
    let frontNet = 0;
    let backNet = 0;
    for (let h = 0; h < g.holes; h++) {
      const s = card[h];
      if (s === null || s === undefined) continue;
      thru++;
      gross += s;
      parPlayed += g.pars[h];
      const received = holeStrokes(hcp, g.strokeIndex[h], g.holes);
      const netHole = s - received;
      net += netHole;
      stableford += Math.max(0, g.pars[h] - netHole + 2);
      if (h < 9) frontNet += netHole;
      else backNet += netHole;
    }
    return {
      participantId: p.id,
      name: p.name,
      handicap: hcp,
      thru,
      gross,
      net,
      toPar: gross - parPlayed,
      stableford,
      skins: skinsMap.get(p.id) ?? 0,
      frontNet,
      backNet,
    };
  });

  const played = (r: GolfRow) => r.thru > 0;
  rows.sort((a, b) => {
    // players who've started rank above those who haven't
    if (played(a) !== played(b)) return played(a) ? -1 : 1;
    if (mode === "stableford") return b.stableford - a.stableford || a.name.localeCompare(b.name);
    if (mode === "skins") return b.skins - a.skins || a.net - b.net || a.name.localeCompare(b.name);
    // stroke: net ascending, then gross
    return a.net - b.net || a.gross - b.gross || a.name.localeCompare(b.name);
  });
  return rows;
}

export function formatToPar(toPar: number): string {
  if (toPar === 0) return "E";
  return toPar > 0 ? `+${toPar}` : `${toPar}`;
}
