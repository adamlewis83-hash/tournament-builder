import { Tournament } from "./types";
import { computeStandings } from "./standings";
import { computeBbb, computeGolf, computeMixedOverall, formatToPar } from "./golf";
import { ryderScore } from "./ryder";
import { getResult } from "./result";

export interface FinalRow {
  name: string;
  stat: string;
}

const fmtNum = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

/** Final standings rows with a short stat per player/team, for the scorephoto. */
export function getFinalRows(t: Tournament): FinalRow[] {
  if (t.format === "golf") {
    const g = t.golf;
    if (!g) return [];
    const mode = t.config.golfMode;
    if (mode === "mixed")
      return computeMixedOverall(t, g.segments ?? []).map((r) => ({ name: r.name, stat: `${fmtNum(r.points)} pt` }));
    if (mode === "bingo") return computeBbb(t).map((r) => ({ name: r.name, stat: `${r.points} pt` }));
    return computeGolf(t, mode).map((r) => ({
      name: r.name,
      stat:
        mode === "stableford"
          ? `${r.stableford} pt`
          : mode === "skins"
            ? `${r.skins} skins`
            : r.thru
              ? formatToPar(r.toPar)
              : "—",
    }));
  }

  if (t.format === "ryder") {
    const sc = ryderScore(t.matches);
    const [a, b] = t.config.teamNames ?? ["Team A", "Team B"];
    return [
      { name: a, stat: fmtNum(sc.a) },
      { name: b, stat: fmtNum(sc.b) },
    ].sort((x, y) => parseFloat(y.stat) - parseFloat(x.stat));
  }

  const s = computeStandings(
    t.participants,
    t.matches.filter((m) => m.scoreA !== null && m.scoreB !== null),
    t.config.tiebreaker,
  );
  let rows = s.map((r) => ({ name: r.name, stat: `${r.wins}–${r.losses}` }));
  const champ = getResult(t).winner;
  if (champ && rows.some((r) => r.name === champ)) {
    rows = [rows.find((r) => r.name === champ)!, ...rows.filter((r) => r.name !== champ)];
  }
  return rows;
}

function golfNames(t: Tournament): string[] {
  const g = t.golf;
  if (!g) return [];
  if (t.config.golfMode === "mixed") return computeMixedOverall(t, g.segments ?? []).map((r) => r.name);
  if (t.config.golfMode === "bingo") return computeBbb(t).map((r) => r.name);
  return computeGolf(t, t.config.golfMode).map((r) => r.name);
}

function ryderTeams(t: Tournament): { winners: string[]; losers: string[] } {
  const sc = ryderScore(t.matches);
  const members = (team: 0 | 1) => t.participants.filter((p) => p.team === team).map((p) => p.name);
  if (sc.status === "a-wins") return { winners: members(0), losers: members(1) };
  if (sc.status === "b-wins") return { winners: members(1), losers: members(0) };
  return { winners: [], losers: [...members(0), ...members(1)] };
}

/** Final finishing order (best → worst) for an event, best-effort per format. */
export function getRanking(t: Tournament): string[] {
  if (t.format === "golf") return golfNames(t);
  if (t.format === "ryder") {
    const { winners, losers } = ryderTeams(t);
    return [...winners, ...losers];
  }
  const order = computeStandings(
    t.participants,
    t.matches.filter((m) => m.scoreA !== null && m.scoreB !== null),
    t.config.tiebreaker,
  ).map((s) => s.name);
  const champ = getResult(t).winner;
  if (champ && order.includes(champ)) return [champ, ...order.filter((n) => n !== champ)];
  return order;
}

export interface RecordRow {
  name: string;
  firsts: number;
  seconds: number;
  thirds: number;
  events: number;
}

/** Hall-of-fame aggregation across COMPLETED tournaments, keyed by player name. */
export function aggregateRecords(tournaments: Tournament[]): RecordRow[] {
  const map = new Map<string, RecordRow>();
  const row = (name: string) => {
    const k = name.toLowerCase();
    let r = map.get(k);
    if (!r) {
      r = { name, firsts: 0, seconds: 0, thirds: 0, events: 0 };
      map.set(k, r);
    }
    return r;
  };

  for (const t of tournaments) {
    if (!getResult(t).complete) continue;

    if (t.format === "ryder") {
      const { winners, losers } = ryderTeams(t);
      const seen = new Set<string>();
      for (const n of [...winners, ...losers]) {
        if (!seen.has(n.toLowerCase())) {
          row(n).events++;
          seen.add(n.toLowerCase());
        }
      }
      winners.forEach((n) => row(n).firsts++); // co-champions
      continue;
    }

    const seen = new Set<string>();
    for (const p of t.participants) {
      if (!seen.has(p.name.toLowerCase())) {
        row(p.name).events++;
        seen.add(p.name.toLowerCase());
      }
    }
    const ranking = getRanking(t);
    if (ranking[0]) row(ranking[0]).firsts++;
    if (ranking[1]) row(ranking[1]).seconds++;
    if (ranking[2]) row(ranking[2]).thirds++;
  }

  return [...map.values()].sort(
    (a, b) =>
      b.firsts - a.firsts ||
      b.seconds + b.thirds - (a.seconds + a.thirds) ||
      b.events - a.events ||
      a.name.localeCompare(b.name),
  );
}
