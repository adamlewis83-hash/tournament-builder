import {
  GolfData,
  GolfMode,
  GolfScoring,
  VegasRules,
  GolfSegment,
  Participant,
  SegmentFormat,
  TeeSet,
  Tournament,
} from "./types";

/** USGA course handicap for a tee set: index × slope/113 + (rating − par), rounded. */
export function courseHandicap(index: number, tee: TeeSet): number {
  if (!tee.slope || !tee.rating || !tee.par) return Math.round(index);
  return Math.round(index * (tee.slope / 113) + (tee.rating - tee.par));
}

/** The handicap used for stroke allocation: the player's index adjusted for the tee
 *  set they play (when the course has tees), else the raw index. Clamped at 0. */
export function effectiveHandicap(g: GolfData | undefined, p: Participant): number {
  const idx = p.handicap ?? 0;
  if (!idx || !g?.tees?.length) return idx;
  const tee = g.tees.find((t) => t.name === p.tee) ?? g.tees[0];
  const ch = courseHandicap(idx, tee);
  // Tee ratings are 18-hole values — a 9-hole round plays off half the course handicap.
  return Math.max(0, g.holes <= 9 ? Math.round(ch / 2) : ch);
}

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

export function computeGolf(
  t: Tournament,
  mode: GolfMode | SegmentFormat = "stroke",
  range?: HoleRange,
): GolfRow[] {
  const g = t.golf;
  if (!g) return [];
  const players = t.participants;
  const lo = range ? range.from - 1 : 0;
  const hi = range ? range.to - 1 : g.holes - 1;

  // Skins (net, handicap-adjusted) with carryover — resolved over consecutive completed holes.
  const skinsMap = new Map<string, number>();
  players.forEach((p) => skinsMap.set(p.id, 0));
  {
    let pot = 1;
    for (let h = lo; h <= hi; h++) {
      const entries = players.map((p) => {
        const s = g.scores[p.id]?.[h];
        return {
          id: p.id,
          v: s == null ? null : s - holeStrokes(effectiveHandicap(g, p), g.strokeIndex[h], g.holes),
        };
      });
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
    const hcp = effectiveHandicap(g, p); // tee-adjusted course handicap when tees are set
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
      if (seg.format === "stableford") {
        const best = Math.max(...rows.map((r) => r.stableford));
        winners = rows.filter((r) => r.stableford === best).map((r) => r.participantId);
      } else if (seg.format === "skins") {
        const best = Math.max(...rows.map((r) => r.skins));
        if (best <= 0) continue;
        winners = rows.filter((r) => r.skins === best).map((r) => r.participantId);
      } else {
        // stroke, scramble, best ball, alternate shot → lowest net wins
        const best = Math.min(...rows.map((r) => r.net));
        winners = rows.filter((r) => r.net === best).map((r) => r.participantId);
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

export interface VegasRow {
  participantId: string;
  name: string;
  points: number;
  thru: number;
  opponent: string | null; // duel partner's name (pairs matched in entry order)
}

/**
 * Vegas (2v2): each participant row is a PAIR whose entered hole score is the
 * combined team number — low ball first (4 & 5 → 45). Pairs duel in entry
 * order (1st vs 2nd, 3rd vs 4th…); on each hole both pairs have scored, the
 * lower number takes the difference in points. An unmatched trailing pair
 * (odd count) just keeps a card.
 */
export function computeVegas(t: Tournament): VegasRow[] {
  const g = t.golf;
  const teams = t.participants;
  const pts = new Map<string, number>();
  teams.forEach((p) => pts.set(p.id, 0));

  if (g) {
    for (let d = 0; d + 1 < teams.length; d += 2) {
      const A = teams[d];
      const B = teams[d + 1];
      for (let h = 0; h < g.holes; h++) {
        const a = g.scores[A.id]?.[h];
        const b = g.scores[B.id]?.[h];
        if (a == null || b == null) continue;
        if (a < b) pts.set(A.id, (pts.get(A.id) ?? 0) + (b - a));
        else if (b < a) pts.set(B.id, (pts.get(B.id) ?? 0) + (a - b));
      }
    }
  }

  return teams
    .map((p, i) => {
      const mate = i % 2 === 0 ? teams[i + 1] : teams[i - 1];
      return {
        participantId: p.id,
        name: p.name,
        points: pts.get(p.id) ?? 0,
        thru: g ? (g.scores[p.id] ?? []).filter((s) => s != null).length : 0,
        opponent: mate?.name ?? null,
      };
    })
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}


// ---- Reading a golf card as a match ------------------------------------------

export interface GolfMatchStatus {
  a: GolfRow;
  b: GolfRow;
  upA: number;
  upB: number;
  halved: number;
  thru: number;
  holes: number;
  decided: boolean;
  /** Per-hole winner over the scored range: "A", "B", or null for a halve/unplayed. */
  holeWinners: ("A" | "B" | null)[];
  text: string;
}

/**
 * Net match play off an ordinary golf card. Only defined when exactly two sides are
 * on it — two players, or two pairs in a team game, where each participant row is
 * already the side. With three or more there is no single match to report.
 */
export function computeGolfMatch(t: Tournament, range?: HoleRange): GolfMatchStatus | null {
  const g = t.golf;
  if (!g || t.participants.length !== 2) return null;
  const rows = computeGolf(t, "stroke", range);
  const [pa, pb] = t.participants;
  const rowOf = (id: string) => rows.find((r) => r.participantId === id);
  const a = rowOf(pa.id);
  const b = rowOf(pb.id);
  if (!a || !b) return null;

  const lo = range ? range.from - 1 : 0;
  const hi = range ? range.to - 1 : g.holes - 1;
  const net = (p: Participant, h: number) => {
    const sc = g.scores[p.id]?.[h];
    if (sc == null) return null;
    return sc - holeStrokes(effectiveHandicap(g, p), g.strokeIndex[h], g.holes);
  };

  let upA = 0;
  let upB = 0;
  let halved = 0;
  let thru = 0;
  const holeWinners: ("A" | "B" | null)[] = [];
  for (let h = lo; h <= hi; h++) {
    const na = net(pa, h);
    const nb = net(pb, h);
    if (na == null || nb == null) {
      holeWinners.push(null);
      continue;
    }
    thru++;
    if (na < nb) {
      upA++;
      holeWinners.push("A");
    } else if (nb < na) {
      upB++;
      holeWinners.push("B");
    } else {
      halved++;
      holeWinners.push(null);
    }
  }

  const holes = hi - lo + 1;
  const remaining = holes - thru;
  const diff = Math.abs(upA - upB);
  const decided = thru === holes || diff > remaining;
  const leader = upA > upB ? a : b;
  const text = !thru
    ? "—"
    : diff === 0
      ? thru === holes
        ? "Halved"
        : `All Square · thru ${thru}`
      : decided && remaining > 0
        ? `${leader.name} wins ${diff} & ${remaining}`
        : thru === holes
          ? `${leader.name} wins ${diff} up`
          : `${leader.name} ${diff} up · thru ${thru}`;

  return { a, b, upA, upB, halved, thru, holes, decided, holeWinners, text };
}

/** Can this card be read as a match? Two sides, and a game whose per-hole entry is a
 *  real stroke count (Vegas types a combined number, so it has no net to compare). */
export function golfMatchAvailable(t: Tournament): boolean {
  return t.participants.length === 2 && t.config.golfMode !== "vegas";
}

/** The scoring views this golf round can be read through, given how it is played. */
export function golfScoringOptions(t: Tournament): GolfScoring[] {
  if (t.config.golfMode === "vegas") return [];
  const base: GolfScoring[] = ["stroke", "stableford", "skins"];
  return golfMatchAvailable(t) ? [...base, "match"] : base;
}

// ---- Vegas: the full 4-man game ----------------------------------------------

/** Partners for a hole. Fixed keeps the entry order; rotate6 runs the three
 *  pairings six holes each; byHole follows the host's per-hole picks (true
 *  Vegas — tee shots decide), each pick carrying forward until the next. */
export function vegasTeamsForHole(
  ids: string[],
  hole: number,
  mode: VegasRules["teams"],
  pairs?: (0 | 1 | 2 | null)[],
): [string[], string[]] | null {
  if (ids.length !== 4) return null;
  const [p0, p1, p2, p3] = ids;
  const pairing = (c: number): [string[], string[]] =>
    c === 1 ? [[p0, p2], [p1, p3]] : c === 2 ? [[p0, p3], [p1, p2]] : [[p0, p1], [p2, p3]];
  if (mode === "fixed") return pairing(0);
  if (mode === "byHole") {
    let c = 0;
    for (let i = 0; i <= hole; i++) {
      const v = pairs?.[i];
      if (v != null) c = v;
    }
    return pairing(c);
  }
  return pairing(Math.floor(hole / 6) % 3);
}

/** A pair's Vegas number. Low ball first normally; flipped puts the high ball first.
 *  Balls cap at 9 so the number stays two digits — the usual "pick up at 9" rule. */
export function vegasNumber(balls: number[], flipped: boolean): number {
  const [lo, hi] = balls.map((b) => Math.min(9, b)).sort((x, y) => x - y);
  return flipped ? hi * 10 + lo : lo * 10 + hi;
}

export interface VegasHoleRow {
  hole: number; // 0-based index into the card
  par: number;
  ballsA: number[];
  ballsB: number[];
  rawA: number; // before any flip
  rawB: number;
  numA: number; // as played, flip included
  numB: number;
  birdieA: boolean; // A made birdie-or-better (per the flip setting)
  birdieB: boolean;
  flippedA: boolean; // A's number got flipped (because B made one)
  flippedB: boolean;
  winner: "A" | "B" | null;
  margin: number; // the raw difference between the two numbers
  carriedIn: number; // tied holes rolled into this one
  points: number; // margin × (1 + carriedIn) — what the hole actually paid
  pressesOpen: number; // presses live on this hole
}

export interface VegasPress {
  from: number; // 0-based hole the press starts on
  pointsA: number;
  pointsB: number;
}

export interface VegasLedger {
  rows: VegasHoleRow[];
  thru: number;
  /** Original-bet points. */
  pointsA: number;
  pointsB: number;
  presses: VegasPress[];
  /** Net money to team A across every bet — negative means A owes. */
  moneyA: number;
  namesA: string[];
  namesB: string[];
}

/**
 * Play the card out hole by hole under the chosen rules, keeping the running
 * ledger: numbers, flips, carries, presses and the money they add up to.
 *
 * Needs four players with their own scores — the flip can only be spotted from
 * individual balls, never from a pre-combined team number.
 */
export function computeVegasLedger(t: Tournament, rules: VegasRules): VegasLedger | null {
  const g = t.golf;
  const ids = t.participants.map((p) => p.id);
  if (!g || ids.length !== 4) return null;
  const nameOf = (id: string) => t.participants.find((p) => p.id === id)?.name ?? "?";

  const ballFor = (id: string, h: number): number | null => {
    const raw = g.scores[id]?.[h];
    if (raw == null) return null;
    if (!rules.net) return raw;
    const p = t.participants.find((x) => x.id === id)!;
    return raw - holeStrokes(effectiveHandicap(g, p), g.strokeIndex[h], g.holes);
  };

  const rows: VegasHoleRow[] = [];
  const presses: VegasPress[] = [];
  let pointsA = 0;
  let pointsB = 0;
  let carry = 0;
  let thru = 0;
  // Presses opened on a hole start paying from the NEXT one.
  let pendingPress: number | null = null;

  for (let h = 0; h < g.holes; h++) {
    if (pendingPress !== null) {
      presses.push({ from: pendingPress, pointsA: 0, pointsB: 0 });
      pendingPress = null;
    }
    const sides = vegasTeamsForHole(ids, h, rules.teams, g.vegasPairs);
    if (!sides) break;
    const [teamA, teamB] = sides;
    const ballsA = teamA.map((id) => ballFor(id, h));
    const ballsB = teamB.map((id) => ballFor(id, h));
    if (ballsA.some((b) => b == null) || ballsB.some((b) => b == null)) continue;

    const par = g.pars[h];
    const threshold = rules.flipOn === "eagle" ? par - 2 : par - 1;
    const made = (balls: number[]) => rules.flipOn !== "off" && balls.some((b) => b <= threshold);
    const birdieA = made(ballsA as number[]);
    const birdieB = made(ballsB as number[]);
    // You flip the opponent's number, never your own.
    const flippedA = birdieB;
    const flippedB = birdieA;

    const rawA = vegasNumber(ballsA as number[], false);
    const rawB = vegasNumber(ballsB as number[], false);
    const numA = vegasNumber(ballsA as number[], flippedA);
    const numB = vegasNumber(ballsB as number[], flippedB);

    thru++;
    const margin = Math.abs(numA - numB);
    const winner: "A" | "B" | null = numA < numB ? "A" : numB < numA ? "B" : null;
    const carriedIn = carry;
    const points = margin * (1 + carriedIn);

    if (winner === "A") pointsA += points;
    else if (winner === "B") pointsB += points;
    for (const pr of presses) {
      if (h < pr.from) continue;
      if (winner === "A") pr.pointsA += points;
      else if (winner === "B") pr.pointsB += points;
    }
    carry = rules.carryTies && winner === null ? carriedIn + 1 : 0;

    rows.push({
      hole: h, par,
      ballsA: ballsA as number[], ballsB: ballsB as number[],
      rawA, rawB, numA, numB,
      birdieA, birdieB, flippedA, flippedB,
      winner, margin, carriedIn, points,
      pressesOpen: presses.filter((pr) => h >= pr.from).length,
    });

    // Auto-press once the original bet's margin reaches the trigger.
    const capped = rules.maxPresses > 0 && presses.length >= rules.maxPresses;
    if (rules.pressAt > 0 && !capped && Math.abs(pointsA - pointsB) >= rules.pressAt) {
      const last = presses[presses.length - 1];
      // One press per margin milestone: don't reopen while the newest is still fresh.
      const already = last && Math.abs(last.pointsA - last.pointsB) < rules.pressAt && h >= last.from;
      if (!already && h + 1 < g.holes) pendingPress = h + 1;
    }
  }

  const moneyA =
    (pointsA - pointsB) * rules.pointValue +
    presses.reduce((sum, pr) => sum + (pr.pointsA - pr.pointsB) * rules.pressValue, 0);

  const sides0 = vegasTeamsForHole(ids, 0, rules.teams, g.vegasPairs)!;
  return {
    rows, thru, pointsA, pointsB, presses, moneyA,
    namesA: sides0[0].map(nameOf),
    namesB: sides0[1].map(nameOf),
  };
}
