import { Match, Participant } from "./types";
import { uid } from "./id";

const pairKey = (a: string, b: string) => [a, b].sort().join("|");

function makeMatch(p: Partial<Match>): Match {
  return {
    id: uid(),
    phase: "rr",
    round: 1,
    order: 0,
    sideA: [],
    sideB: [],
    scoreA: null,
    scoreB: null,
    ...p,
  };
}

/**
 * Full single round robin (everyone plays everyone once) via the circle method.
 * Used for singles and team play styles. Produces N-1 rounds (one bye/round if odd).
 */
export function genSinglesRR(
  ids: string[],
  courts: number,
  phase: "rr" | "pool" = "rr",
  poolId?: string,
): Match[] {
  const players = [...ids];
  if (players.length % 2 === 1) players.push("__BYE__");
  const n = players.length;
  const rounds = n - 1;
  const half = n / 2;
  const matches: Match[] = [];
  const arr = [...players];

  for (let r = 0; r < rounds; r++) {
    let courtNo = 0;
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a === "__BYE__" || b === "__BYE__") continue;
      matches.push(
        makeMatch({
          phase,
          poolId,
          round: r + 1,
          order: courtNo,
          court: (courtNo % Math.max(1, courts)) + 1,
          sideA: [a],
          sideB: [b],
        }),
      );
      courtNo++;
    }
    // rotate (keep first fixed)
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop() as string);
    arr.splice(0, arr.length, fixed, ...rest);
  }
  return matches;
}

/**
 * Rotating-partner doubles round robin. Individuals are paired into fresh teams
 * each round and matched against opponents they've met least. Greedy + deterministic.
 * Standings are tracked per individual.
 */
export function genDoublesRR(ids: string[], rounds: number, courts: number): Match[] {
  const n = ids.length;
  const gamesPerRound = Math.min(Math.max(1, courts), Math.floor(n / 4));
  if (gamesPerRound < 1) return []; // need at least 4 players

  const playCount = new Map<string, number>(ids.map((p) => [p, 0]));
  const partnerCount = new Map<string, number>();
  const oppCount = new Map<string, number>();
  const inc = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) || 0) + 1);
  const get = (m: Map<string, number>, k: string) => m.get(k) || 0;

  const matches: Match[] = [];
  const indexOf = new Map(ids.map((p, i) => [p, i]));

  for (let r = 0; r < rounds; r++) {
    // Pick who plays this round: fewest games so far; rotate ties by round.
    const order = [...ids].sort((a, b) => {
      const d = playCount.get(a)! - playCount.get(b)!;
      if (d !== 0) return d;
      const ra = (indexOf.get(a)! + r) % n;
      const rb = (indexOf.get(b)! + r) % n;
      return ra - rb;
    });
    const active = order.slice(0, gamesPerRound * 4);

    // Form teams: greedily pair players who've partnered least.
    const remaining = [...active];
    const teams: [string, string][] = [];
    while (remaining.length >= 2) {
      const a = remaining.shift()!;
      let best = 0;
      let bestScore = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const b = remaining[i];
        const s = get(partnerCount, pairKey(a, b)) * 100 + i;
        if (s < bestScore) {
          bestScore = s;
          best = i;
        }
      }
      const b = remaining.splice(best, 1)[0];
      teams.push([a, b]);
      inc(partnerCount, pairKey(a, b));
    }

    // Pair teams into matches minimizing repeat opponents.
    const tRemaining = [...teams];
    let court = 0;
    while (tRemaining.length >= 2) {
      const tA = tRemaining.shift()!;
      let best = 0;
      let bestScore = Infinity;
      for (let i = 0; i < tRemaining.length; i++) {
        const tB = tRemaining[i];
        let s = 0;
        for (const x of tA) for (const y of tB) s += get(oppCount, pairKey(x, y));
        s = s * 100 + i;
        if (s < bestScore) {
          bestScore = s;
          best = i;
        }
      }
      const tB = tRemaining.splice(best, 1)[0];
      for (const x of tA) for (const y of tB) inc(oppCount, pairKey(x, y));
      matches.push(
        makeMatch({
          phase: "rr",
          round: r + 1,
          order: court,
          court: court + 1,
          sideA: [...tA],
          sideB: [...tB],
        }),
      );
      court++;
    }

    active.forEach((p) => playCount.set(p, playCount.get(p)! + 1));
  }
  return matches;
}

/**
 * Generate one Swiss round. Players are paired down an ordering (seed order for
 * round 1, standings order afterward), skipping opponents they've already faced.
 * An odd player out gets a bye (sits the round out). 1v1 (singles/teams).
 */
// Backtracking: find a pairing of `pool` with zero rematches, or null if impossible.
// Pairs the first player with each unplayed candidate (in order) and recurses.
function matchNoRematch(pool: string[], played: Set<string>): [string, string][] | null {
  if (pool.length === 0) return [];
  const [a, ...rest] = pool;
  for (let i = 0; i < rest.length; i++) {
    const b = rest[i];
    if (played.has(pairKey(a, b))) continue;
    const remaining = rest.slice(0, i).concat(rest.slice(i + 1));
    const sub = matchNoRematch(remaining, played);
    if (sub) return [[a, b], ...sub];
  }
  return null;
}

function greedyPairs(pool: string[], played: Set<string>): [string, string][] {
  const remaining = [...pool];
  const pairs: [string, string][] = [];
  while (remaining.length > 1) {
    const a = remaining.shift()!;
    let idx = remaining.findIndex((q) => !played.has(pairKey(a, q)));
    if (idx === -1) idx = 0;
    const b = remaining.splice(idx, 1)[0];
    pairs.push([a, b]);
  }
  return pairs;
}

export function genSwissRound(
  orderedIds: string[],
  existing: Match[],
  roundNumber: number,
  courts: number,
): Match[] {
  const played = new Set<string>();
  const games = new Map<string, number>();
  for (const m of existing) {
    for (const id of [...m.sideA, ...m.sideB]) games.set(id, (games.get(id) ?? 0) + 1);
    if (m.sideA[0] && m.sideB[0]) played.add(pairKey(m.sideA[0], m.sideB[0]));
  }

  let pool = [...orderedIds];
  // Odd field: one player gets a bye. Prefer whoever's played most (fewest prior byes),
  // breaking ties toward the lower-ranked end, and only if the rest can still avoid rematches.
  if (pool.length % 2 === 1) {
    const cand = [...pool].sort(
      (a, b) => (games.get(b) ?? 0) - (games.get(a) ?? 0) || pool.indexOf(b) - pool.indexOf(a),
    );
    let bye = cand[0];
    if (pool.length <= 17) {
      for (const c of cand) {
        if (matchNoRematch(pool.filter((x) => x !== c), played)) {
          bye = c;
          break;
        }
      }
    }
    pool = pool.filter((x) => x !== bye);
  }

  const pairs =
    (pool.length <= 16 ? matchNoRematch(pool, played) : null) ?? greedyPairs(pool, played);

  return pairs.map(([a, b], i) =>
    makeMatch({
      phase: "rr",
      round: roundNumber,
      order: i,
      court: (i % Math.max(1, courts)) + 1,
      sideA: [a],
      sideB: [b],
    }),
  );
}

/**
 * King of the Court: winner stays on, loser goes to the back of the line, next
 * challenger comes on. The rotation is replayed deterministically from results,
 * so this returns the NEXT game (or null if the current one isn't decided yet).
 */
export function genKotcNext(ids: string[], existing: Match[], court = 1): Match | null {
  if (ids.length < 2) return null;
  const ordered = [...existing].sort((a, b) => a.round - b.round);
  const queue = [...ids];
  let onCourt: string | null = null;

  for (const m of ordered) {
    const decided = m.scoreA !== null && m.scoreB !== null && m.scoreA !== m.scoreB;
    if (!decided) return null; // finish the current game before drawing the next
    let a: string, b: string;
    if (onCourt === null) {
      a = queue.shift()!;
      b = queue.shift()!;
    } else {
      a = onCourt;
      b = queue.shift()!;
    }
    const aWin = (m.scoreA as number) > (m.scoreB as number);
    onCourt = aWin ? a : b;
    queue.push(aWin ? b : a);
  }

  let a: string, b: string;
  if (onCourt === null) {
    a = queue.shift()!;
    b = queue.shift()!;
  } else {
    a = onCourt;
    b = queue.shift()!;
  }
  if (a === undefined || b === undefined) return null;

  const gameNumber = ordered.length + 1;
  return makeMatch({
    phase: "rr",
    round: gameNumber,
    order: 0,
    court,
    sideA: [a],
    sideB: [b],
    label: `Game ${gameNumber}`,
  });
}

export function nameOf(participants: Participant[], id: string): string {
  return participants.find((p) => p.id === id)?.name ?? "—";
}

export function sideNames(participants: Participant[], ids: string[]): string {
  if (!ids.length) return "—";
  return ids.map((id) => nameOf(participants, id)).join(" / ");
}
