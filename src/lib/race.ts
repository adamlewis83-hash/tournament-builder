// Race Day — pools of finish-order heats, then finals (born from Adam's
// pinewood derby: 2 pools of 4, three heats each, top 3 per pool into an
// all-6 final). Everything is fluid: any pool count, any pool sizes, heats
// added whenever, finals as one-or-more races or a knockout bracket.
//
// Scoring is placement points: 1st = 1, 2nd = 2, … lowest total leads. A racer
// only accrues points in heats they actually finished (unscored heats and
// no-shows don't count against anyone).

import { RaceData, RaceHeat, Tournament } from "./types";

export interface RaceRow {
  participantId: string;
  name: string;
  heats: number; // heats with a recorded finish
  points: number; // sum of finishing positions — lower is better
  wins: number; // heat wins (tie-break, and a fun stat)
  best: number; // best finish (secondary tie-break)
}

/** Deal participants into pools snake-style, preserving entry order fairness. */
export function dealPools(ids: string[], poolCount: number): Record<string, number> {
  const n = Math.max(1, poolCount);
  const out: Record<string, number> = {};
  ids.forEach((id, i) => {
    const lap = Math.floor(i / n);
    const pos = i % n;
    out[id] = lap % 2 === 0 ? pos : n - 1 - pos; // snake: 0,1,2,2,1,0,…
  });
  return out;
}

const heatsFor = (r: RaceData, stage: "pool" | "final", pool?: number): RaceHeat[] =>
  r.heats.filter((h) => h.stage === stage && (stage === "final" || h.pool === pool));

/** Standings for one pool (or the finals), lowest points first. */
export function raceStandings(
  t: Tournament,
  stage: "pool" | "final",
  pool?: number,
): RaceRow[] {
  const r = t.race;
  if (!r) return [];
  const ids =
    stage === "final"
      ? (r.finalists ?? [])
      : t.participants.filter((p) => (r.pools[p.id] ?? 0) === pool).map((p) => p.id);
  const rows = new Map<string, RaceRow>();
  for (const id of ids) {
    const p = t.participants.find((x) => x.id === id);
    rows.set(id, {
      participantId: id,
      name: p?.name ?? "?",
      heats: 0,
      points: 0,
      wins: 0,
      best: Infinity,
    });
  }
  for (const h of heatsFor(r, stage, pool)) {
    h.order.forEach((id, i) => {
      const row = rows.get(id);
      if (!row) return; // moved pools after this heat — old finish stays with the heat
      row.heats++;
      row.points += i + 1;
      if (i === 0) row.wins++;
      row.best = Math.min(row.best, i + 1);
    });
  }
  return [...rows.values()].sort(
    (a, b) =>
      (b.heats > 0 ? 1 : 0) - (a.heats > 0 ? 1 : 0) ||
      a.points - b.points ||
      b.wins - a.wins ||
      a.best - b.best ||
      a.name.localeCompare(b.name),
  );
}

/** Who advances: the top `perPool` of each pool (racers with at least one finish). */
export function raceAdvancers(t: Tournament, perPool: number): string[] {
  const r = t.race;
  if (!r) return [];
  const out: string[] = [];
  for (let p = 0; p < r.poolCount; p++) {
    for (const row of raceStandings(t, "pool", p).slice(0, Math.max(1, perPool))) {
      if (row.heats > 0) out.push(row.participantId);
    }
  }
  return out;
}

/** A heat with a full recorded order for everyone listed is scored. */
export const heatScored = (h: RaceHeat) => h.order.length > 0;

/**
 * Race-final result: complete once the finals are seeded and every final heat
 * is scored (bracket finals resolve through the bracket instead). Winner may
 * be shared on a points tie — co-champions, like everywhere else in the app.
 */
export function raceResult(t: Tournament): { complete: boolean; winners: string[] } {
  const r = t.race;
  if (!r || !r.finalists?.length) return { complete: false, winners: [] };
  if (r.finalStyle !== "race") return { complete: false, winners: [] }; // bracket: caller uses bracketChampion
  const finals = heatsFor(r, "final");
  if (!finals.length || !finals.every(heatScored)) return { complete: false, winners: [] };
  const rows = raceStandings(t, "final");
  if (!rows.length || rows[0].heats === 0) return { complete: false, winners: [] };
  const top = rows[0];
  const winners = rows
    .filter(
      (x) =>
        x.heats > 0 && x.points === top.points && x.wins === top.wins && x.best === top.best,
    )
    .map((x) => x.name);
  return { complete: true, winners };
}
