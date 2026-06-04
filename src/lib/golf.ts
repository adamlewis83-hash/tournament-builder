import { GolfData, GolfMode, GolfSegment, Participant, Tournament } from "./types";

export const isSideGame = (m: GolfMode) => m === "bingo" || m === "wolf";

export interface HoleRange {
  from: number; // 1-based inclusive
  to: number;
}

export function segmentForHole(segments: GolfSegment[] | undefined, holeIdx0: number): GolfSegment | undefined {
  const h = holeIdx0 + 1;
  return segments?.find((s) => h >= s.from && h <= s.to);
}

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
export function computeBbb(t: Tournament, range?: HoleRange): PointRow[] {
  const g = t.golf;
  const lo = range ? range.from - 1 : 0;
  const hi = range ? range.to - 1 : (g?.holes ?? 1) - 1;
  const counts = new Map<string, { points: number; bi: number; ba: number; bo: number }>();
  t.participants.forEach((p) => counts.set(p.id, { points: 0, bi: 0, ba: 0, bo: 0 }));
  if (g?.bbb) {
    const tally = (arr: (string | null)[], key: "bi" | "ba" | "bo") => {
      for (let h = lo; h <= hi; h++) {
        const id = arr[h];
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
export function defaultCourse(holes: number): { pars: number[]; strokeIndex: number[] } {
  const g = defaultGolf(holes, []);
  return { pars: g.pars, strokeIndex: g.strokeIndex };
}

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

export function computeGolf(t: Tournament, mode: GolfMode = "stroke", range?: HoleRange): GolfRow[] {
  const g = t.golf;
  if (!g) return [];
  const players = t.participants;
  const lo = range ? range.from - 1 : 0;
  const hi = range ? range.to - 1 : g.holes - 1;

  // Skins (gross) with carryover — resolved only over consecutive completed holes.
  const skinsMap = new Map<string, number>();
  players.forEach((p) => skinsMap.set(p.id, 0));
  {
    let pot = 1;
    for (let h = lo; h <= hi; h++) {
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
    for (let h = lo; h <= hi; h++) {
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

export interface OverallRow {
  participantId: string;
  name: string;
  points: number; // segment points (1 per segment won; split on ties)
  segmentsLed: number;
}

/** Overall standing for Build Your Own: each played segment awards 1 point to its
 *  leader (split on ties), summed across segments. */
export function computeMixedOverall(t: Tournament, segments: GolfSegment[]): OverallRow[] {
  const points = new Map<string, number>();
  const led = new Map<string, number>();
  t.participants.forEach((p) => {
    points.set(p.id, 0);
    led.set(p.id, 0);
  });

  for (const seg of segments) {
    const range = { from: seg.from, to: seg.to };
    let winners: string[] = [];

    if (seg.format === "bingo") {
      const rows = computeBbb(t, range);
      const best = Math.max(0, ...rows.map((r) => r.points));
      if (best <= 0) continue;
      winners = rows.filter((r) => r.points === best).map((r) => r.participantId);
    } else {
      const rows = computeGolf(t, seg.format, range).filter((r) => r.thru > 0);
      if (!rows.length) continue;
      if (seg.format === "stroke") {
        const best = Math.min(...rows.map((r) => r.net));
        winners = rows.filter((r) => r.net === best).map((r) => r.participantId);
      } else if (seg.format === "stableford") {
        const best = Math.max(...rows.map((r) => r.stableford));
        winners = rows.filter((r) => r.stableford === best).map((r) => r.participantId);
      } else {
        // skins
        const best = Math.max(...rows.map((r) => r.skins));
        if (best <= 0) continue;
        winners = rows.filter((r) => r.skins === best).map((r) => r.participantId);
      }
    }
    const share = 1 / winners.length;
    for (const id of winners) {
      points.set(id, (points.get(id) ?? 0) + share);
      led.set(id, (led.get(id) ?? 0) + 1);
    }
  }

  return t.participants
    .map((p) => ({
      participantId: p.id,
      name: p.name,
      points: points.get(p.id) ?? 0,
      segmentsLed: led.get(p.id) ?? 0,
    }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}

/** True once every non-bingo segment hole is filled for all players. */
export function mixedComplete(t: Tournament, segments: GolfSegment[]): boolean {
  const g = t.golf;
  if (!g) return false;
  const strokeSegs = segments.filter((s) => s.format !== "bingo");
  if (!strokeSegs.length) return false;
  for (const seg of strokeSegs) {
    for (let h = seg.from - 1; h <= seg.to - 1; h++) {
      for (const p of t.participants) {
        if (g.scores[p.id]?.[h] == null) return false;
      }
    }
  }
  return true;
}

export function formatToPar(toPar: number): string {
  if (toPar === 0) return "E";
  return toPar > 0 ? `+${toPar}` : `${toPar}`;
}
