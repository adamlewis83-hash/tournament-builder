// The Sporos handicap ("Seed Index") — a WHS-style estimated index computed
// from rounds played in Sporos. Estimated on purpose: an official index
// requires a licensed club; settling your crew's games does not.

export interface RoundScore {
  at: number; // when the round finished (ms)
  holes: number; // 9 or 18
  gross: number; // total strokes
  rating: number; // course rating for the tees PLAYED (18-hole figure)
  slope: number; // slope for the tees played
}

export interface IndexResult {
  index: number | null; // null until 3 differentials exist
  differentials: number[]; // newest-first, the pool the index is drawn from
  used: number; // how many of them the WHS table averaged
  adjustment: number; // small-sample adjustment applied (0 for 9+ rounds)
  rounds: number; // 18-hole-equivalent rounds counted
  pendingNine: boolean; // an unpaired 9-hole round waiting for its partner
}

/** An 18-hole differential: (gross − rating) × 113 ÷ slope. */
export const differential = (gross: number, rating: number, slope: number): number =>
  ((gross - rating) * 113) / (slope || 113);

// WHS small-sample table: how many of the lowest differentials count, and the
// adjustment applied, by pool size (3..20+).
const WHS_TABLE: Record<number, { use: number; adj: number }> = {
  3: { use: 1, adj: -2 },
  4: { use: 1, adj: -1 },
  5: { use: 1, adj: 0 },
  6: { use: 2, adj: -1 },
  7: { use: 2, adj: 0 },
  8: { use: 2, adj: 0 },
  9: { use: 3, adj: 0 },
  10: { use: 3, adj: 0 },
  11: { use: 3, adj: 0 },
  12: { use: 4, adj: 0 },
  13: { use: 4, adj: 0 },
  14: { use: 4, adj: 0 },
  15: { use: 5, adj: 0 },
  16: { use: 5, adj: 0 },
  17: { use: 6, adj: 0 },
  18: { use: 6, adj: 0 },
  19: { use: 7, adj: 0 },
  20: { use: 8, adj: 0 },
};

/**
 * Compute the index from a player's rounds. Eighteens produce a differential
 * each; nines pair up chronologically (oldest first) into one combined
 * differential — scores and half-ratings add, slopes average. An odd nine
 * waits. Only the most recent 20 differentials form the pool; the WHS table
 * says how many of the lowest count and what adjustment applies.
 */
export function sporosIndex(rounds: RoundScore[]): IndexResult {
  const ordered = [...rounds].sort((a, b) => a.at - b.at);
  const diffs: { at: number; d: number }[] = [];
  let waiting: RoundScore | null = null;

  for (const r of ordered) {
    if (r.holes >= 18) {
      diffs.push({ at: r.at, d: differential(r.gross, r.rating, r.slope) });
    } else if (waiting) {
      const gross = waiting.gross + r.gross;
      const rating = waiting.rating / 2 + r.rating / 2; // tee ratings are 18-hole figures
      const slope = (waiting.slope + r.slope) / 2;
      diffs.push({ at: r.at, d: differential(gross, rating, slope) });
      waiting = null;
    } else {
      waiting = r;
    }
  }

  const pool = diffs
    .sort((a, b) => b.at - a.at)
    .slice(0, 20)
    .map((x) => Math.round(x.d * 10) / 10);

  if (pool.length < 3) {
    return {
      index: null,
      differentials: pool,
      used: 0,
      adjustment: 0,
      rounds: diffs.length,
      pendingNine: waiting !== null,
    };
  }

  const { use, adj } = WHS_TABLE[Math.min(20, pool.length)];
  const best = [...pool].sort((a, b) => a - b).slice(0, use);
  const avg = best.reduce((s, d) => s + d, 0) / best.length + adj;
  return {
    index: Math.round(Math.max(-10, Math.min(54, avg)) * 10) / 10,
    differentials: pool,
    used: use,
    adjustment: adj,
    rounds: diffs.length,
    pendingNine: waiting !== null,
  };
}

// ---- Rounds from real Sporos data -------------------------------------------

import type { Tournament } from "./types";

// Modes where each participant's card is their own ball, hole by hole — the
// only cards an individual handicap can be read from. Team-row games (a pair
// or team per row) and combined-number Vegas cards are excluded; per-player
// Vegas counts because everyone records their own strokes.
const INDIVIDUAL_MODES = new Set([
  "stroke",
  "stableford",
  "skins",
  "nassau",
  "bingo",
  "wolf",
]);

/**
 * Every finished golf round this player holds a complete card for, ready for
 * the index. Rating/slope come from the tee they played; a course with no tee
 * data counts at par/113 (an 18-hole-equivalent rating, so nines pair right).
 */
export function roundsForPlayer(tournaments: Tournament[], playerName: string): RoundScore[] {
  const who = playerName.trim().toLowerCase();
  if (!who) return [];
  const out: RoundScore[] = [];

  for (const t of tournaments) {
    if (t.format !== "golf" || !t.golf) continue;
    const mode = t.config.golfMode;
    const perPlayerVegas = mode === "vegas" && t.config.vegasPerPlayer === true;
    const soloMixed = mode === "mixed" && !t.golf.teams;
    if (!INDIVIDUAL_MODES.has(mode) && !perPlayerVegas && !soloMixed) continue;

    const p = t.participants.find((x) => x.name.trim().toLowerCase() === who);
    if (!p) continue;
    const g = t.golf;
    const card = g.scores[p.id] ?? [];
    const holes = g.holes;
    let gross = 0;
    let filled = 0;
    for (let h = 0; h < holes; h++) {
      const s = card[h];
      if (s == null) break;
      gross += s;
      filled++;
    }
    if (filled !== holes) continue; // an unfinished card is not a round

    const par = g.pars.slice(0, holes).reduce((a, b) => a + b, 0);
    const tee = g.tees?.find((x) => x.name === p.tee) ?? g.tees?.[0];
    out.push({
      at: t.updatedAt ?? t.createdAt ?? 0,
      holes,
      gross,
      // Tee ratings are 18-hole figures; a bare course counts at par (doubled
      // for a nine so the pairing math stays in 18-hole units).
      rating: tee?.rating ?? (holes <= 9 ? par * 2 : par),
      slope: tee?.slope ?? 113,
    });
  }
  return out.sort((a, b) => a.at - b.at);
}

/** The player's Seed Index straight from their tournament history. */
export function seedIndexForPlayer(tournaments: Tournament[], playerName: string): IndexResult {
  return sporosIndex(roundsForPlayer(tournaments, playerName));
}
