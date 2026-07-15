import { Match, Participant, Tiebreaker } from "./types";
import { isFinal } from "./score";

export interface Standing {
  participantId: string;
  name: string;
  played: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  winPct: number; // (wins + ½·ties) ÷ games played; 0 when unplayed
  rank: number;
}

// A game in progress hasn't been played yet — its running score would otherwise
// land in the table as a win or a tie before it's over.
function isPlayed(m: Match): boolean {
  return isFinal(m);
}

/**
 * Per-participant standings aggregated across the given matches.
 * Sorted by wins desc, then point differential desc, then points-for desc, then name.
 * Ranks are unique (1..N) following that sort order, so seeds are unambiguous.
 *
 * When `rankByWinPct` is set the primary key becomes win percentage
 * (wins ÷ games played) instead of raw wins — so a player who sat out a bye
 * isn't penalized for the missing game. Tiebreakers below it are unchanged.
 */
export function computeStandings(
  participants: Participant[],
  matches: Match[],
  tiebreaker: Tiebreaker = "diff",
  rankByWinPct = false,
): Standing[] {
  const table = new Map<string, Standing>();
  for (const p of participants) {
    table.set(p.id, {
      participantId: p.id,
      name: p.name,
      played: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      diff: 0,
      winPct: 0,
      rank: 0,
    });
  }

  for (const m of matches) {
    if (!isPlayed(m)) continue;
    const a = m.scoreA as number;
    const b = m.scoreB as number;
    const aWin = a > b;
    const bWin = b > a;
    const tie = a === b;

    for (const id of m.sideA) {
      const s = table.get(id);
      if (!s) continue;
      s.played++;
      s.pointsFor += a;
      s.pointsAgainst += b;
      if (aWin) s.wins++;
      else if (bWin) s.losses++;
      else if (tie) s.ties++;
    }
    for (const id of m.sideB) {
      const s = table.get(id);
      if (!s) continue;
      s.played++;
      s.pointsFor += b;
      s.pointsAgainst += a;
      if (bWin) s.wins++;
      else if (aWin) s.losses++;
      else if (tie) s.ties++;
    }
  }

  const rows = [...table.values()];
  for (const r of rows) {
    r.diff = r.pointsFor - r.pointsAgainst;
    // Ties count as half a win, matching standard win-percentage convention.
    r.winPct = r.played > 0 ? (r.wins + 0.5 * r.ties) / r.played : 0;
  }

  // Head-to-head wins counted only among players tied on total wins.
  const h2h = new Map<string, number>();
  if (tiebreaker === "headToHead") {
    const winsOf = new Map(rows.map((r) => [r.participantId, r.wins]));
    const group = new Map<number, Set<string>>();
    for (const r of rows) {
      if (!group.has(r.wins)) group.set(r.wins, new Set());
      group.get(r.wins)!.add(r.participantId);
      h2h.set(r.participantId, 0);
    }
    for (const m of matches) {
      if (!isPlayed(m) || m.scoreA === m.scoreB) continue;
      const aWin = (m.scoreA as number) > (m.scoreB as number);
      const winners = aWin ? m.sideA : m.sideB;
      const losers = aWin ? m.sideB : m.sideA;
      for (const w of winners) {
        const g = group.get(winsOf.get(w) ?? -1);
        if (g && losers.some((l) => g.has(l))) h2h.set(w, (h2h.get(w) ?? 0) + 1);
      }
    }
  }

  rows.sort(
    (x, y) =>
      // Primary key: win % when byes make game counts unequal, else raw wins.
      (rankByWinPct ? y.winPct - x.winPct : y.wins - x.wins) ||
      // "record": among equal wins, fewer losses ranks higher (so ties beat losses), then diff
      (tiebreaker === "record" ? x.losses - y.losses : 0) ||
      (tiebreaker === "headToHead"
        ? (h2h.get(y.participantId) ?? 0) - (h2h.get(x.participantId) ?? 0)
        : 0) ||
      (tiebreaker === "pointsFor" ? y.pointsFor - x.pointsFor : 0) ||
      y.diff - x.diff ||
      y.pointsFor - x.pointsFor ||
      x.name.localeCompare(y.name),
  );
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

/** Individual leaderboard ranked by total points scored (Americano / Mexicano). */
export function pointsLeaderboard(participants: Participant[], matches: Match[]): Standing[] {
  const rows = computeStandings(participants, matches);
  rows.sort(
    (x, y) =>
      y.pointsFor - x.pointsFor ||
      y.diff - x.diff ||
      y.wins - x.wins ||
      x.name.localeCompare(y.name),
  );
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}
