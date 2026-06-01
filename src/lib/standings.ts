import { Match, Participant } from "./types";

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
  rank: number;
}

function isPlayed(m: Match): boolean {
  return m.scoreA !== null && m.scoreB !== null;
}

/**
 * Per-participant standings aggregated across the given matches.
 * Sorted by wins desc, then point differential desc, then points-for desc, then name.
 * Ranks are unique (1..N) following that sort order, so seeds are unambiguous.
 */
export function computeStandings(participants: Participant[], matches: Match[]): Standing[] {
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
  for (const r of rows) r.diff = r.pointsFor - r.pointsAgainst;

  rows.sort(
    (x, y) =>
      y.wins - x.wins ||
      y.diff - x.diff ||
      y.pointsFor - x.pointsFor ||
      x.name.localeCompare(y.name),
  );
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}
