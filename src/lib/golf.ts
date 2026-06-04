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
  return { holes: n, pars, strokeIndex, scores };
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
