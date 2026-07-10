import { Match, Tournament } from "./types";
import { computeStandings, pointsLeaderboard } from "./standings";
import { computeBbb, computeGolf, computeMixedOverall, formatToPar } from "./golf";
import { ryderScore } from "./ryder";
import { bracketChampion } from "./bracket";
import { getResult } from "./result";

const decided = (m: Match) =>
  m.scoreA !== null && m.scoreB !== null && m.scoreA !== m.scoreB;
const winSide = (m: Match) => ((m.scoreA as number) > (m.scoreB as number) ? m.sideA : m.sideB);
const loseSide = (m: Match) => ((m.scoreA as number) > (m.scoreB as number) ? m.sideB : m.sideA);

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

  if (t.format === "americano" || t.format === "mexicano") {
    const scored = t.matches.filter((m) => m.scoreA !== null && m.scoreB !== null);
    return pointsLeaderboard(t.participants, scored).map((r) => ({
      name: r.name,
      stat: `${r.pointsFor} pt`,
    }));
  }

  const s = computeStandings(
    t.participants,
    t.matches.filter((m) => m.scoreA !== null && m.scoreB !== null),
    t.config.tiebreaker,
    t.config.rankByWinPct,
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

// Expand participant ids to the actual people: a fixed-doubles/team participant
// yields its roster; an individual yields itself. So doubles partners — whether
// stored as one team participant or as two ids on a bracket side — end up together.
function rosterOf(t: Tournament, ids: string[]): string[] {
  return ids.flatMap((id) => {
    const p = t.participants.find((x) => x.id === id);
    if (!p) return [];
    return p.members?.length ? p.members : [p.name];
  });
}

export interface Placement {
  names: string[]; // everyone sharing this finishing position (doubles partners together)
  rank: number; // displayed finishing number (1, 2, then 5, 6… when a top-4 advanced)
  medal?: "gold" | "silver" | "bronze";
}

const medalFor = (rank: number, hasThird: boolean): Placement["medal"] =>
  rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 && hasThird ? "bronze" : undefined;

// Group participants (rostered) by their assigned finishing rank into sorted placements.
function toPlacements(t: Tournament, rankByPid: Map<string, number>, hasThird: boolean): Placement[] {
  const byRank = new Map<number, string[]>();
  for (const p of t.participants) {
    const rank = rankByPid.get(p.id);
    if (rank == null) continue;
    byRank.set(rank, [...(byRank.get(rank) ?? []), ...rosterOf(t, [p.id])]);
  }
  return [...byRank.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rank, names]) => ({ names, rank, medal: medalFor(rank, hasThird) }));
}

/**
 * Finishing placements (best → worst). Doubles/team results keep partners together
 * and sharing a rank: in a round-robin whose top players advance to a paired final,
 * the winning duo are both 1st, the losing duo both 2nd, and everyone who didn't
 * advance keeps their round-robin position (so with a top-4 final the next player is
 * 5th). Bronze is only awarded when a real 3rd-place is contested.
 */
export function getPlacements(t: Tournament): Placement[] {
  if (t.format === "golf") {
    return golfNames(t).map((n, i) => ({ names: [n], rank: i + 1, medal: medalFor(i + 1, true) }));
  }
  if (t.format === "ryder") {
    const { winners, losers } = ryderTeams(t);
    const out: Placement[] = [];
    if (winners.length) out.push({ names: winners, rank: 1, medal: "gold" });
    if (losers.length) out.push({ names: losers, rank: 2, medal: "silver" });
    return out;
  }
  if (t.format === "americano" || t.format === "mexicano") {
    const scored = t.matches.filter((m) => m.scoreA !== null && m.scoreB !== null);
    return pointsLeaderboard(t.participants, scored).map((r, i) => ({
      names: [r.name],
      rank: i + 1,
      medal: medalFor(i + 1, true),
    }));
  }

  const ms = t.matches;
  const base = ms.filter((m) => m.phase === "rr" || m.phase === "pool");
  const scored = ms.filter((m) => m.scoreA !== null && m.scoreB !== null);
  const standings = computeStandings(
    t.participants,
    base.some((m) => m.scoreA !== null) ? base : scored,
    t.config.tiebreaker,
    t.config.rankByWinPct,
  );
  const rrRank = new Map<string, number>();
  standings.forEach((r, i) => rrRank.set(r.participantId, i + 1));

  // No finals bracket: pure standings order, everyone keeps their standing rank.
  if (!bracketChampion(ms)) {
    return toPlacements(t, rrRank, true);
  }

  // Finals bracket present: the podium comes from the bracket; everyone who didn't
  // reach it keeps their round-robin rank (so a top-4 final leaves the field at 5th+).
  const reset = ms.find((m) => m.phase === "championship");
  const grandFinal = ms.find((m) => m.phase === "final");
  const terminal = ms
    .filter((m) => m.phase === "winners" && !m.nextMatchId)
    .sort((a, b) => b.round - a.round)[0];
  const fm = reset && decided(reset) ? reset : grandFinal && decided(grandFinal) ? grandFinal : terminal;

  const rank = new Map<string, number>();
  const setRank = (ids: string[], r: number) =>
    ids.forEach((id) => {
      if (!rank.has(id)) rank.set(id, r);
    });
  let hasThird = false;
  if (fm && decided(fm)) {
    setRank(winSide(fm), 1);
    setRank(loseSide(fm), 2);
    const thirdGame = ms.find((m) => m.phase === "placement" && decided(m));
    if (thirdGame) {
      setRank(winSide(thirdGame), 3);
      setRank(loseSide(thirdGame), 4);
      hasThird = true;
    } else {
      // Only a genuine semifinal round (matches feeding the final) makes a 3rd place.
      const semiLosers = ms.filter((m) => m.nextMatchId === fm.id && decided(m)).flatMap((m) => loseSide(m));
      if (semiLosers.length) {
        setRank(semiLosers, 3);
        hasThird = true;
      }
    }
  }
  // Everyone not placed by the bracket keeps their round-robin standing.
  for (const p of t.participants) {
    if (!rank.has(p.id)) rank.set(p.id, rrRank.get(p.id) ?? 999);
  }

  return toPlacements(t, rank, hasThird);
}

/** Final finishing order (best → worst) as a flat list — partners stay adjacent. */
export function getRanking(t: Tournament): string[] {
  return getPlacements(t).flatMap((p) => p.names);
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
      // Count events per real person, so a fixed-doubles pair credits both partners.
      const people = p.members?.length ? p.members : [p.name];
      for (const n of people) {
        if (!seen.has(n.toLowerCase())) {
          row(n).events++;
          seen.add(n.toLowerCase());
        }
      }
    }
    // Every member of a podium placement earns that medal — both doubles champions
    // get gold, both runners-up silver (bronze only when a 3rd-place was contested).
    for (const pl of getPlacements(t)) {
      if (pl.medal === "gold") pl.names.forEach((n) => row(n).firsts++);
      else if (pl.medal === "silver") pl.names.forEach((n) => row(n).seconds++);
      else if (pl.medal === "bronze") pl.names.forEach((n) => row(n).thirds++);
    }
  }

  return [...map.values()].sort(
    (a, b) =>
      b.firsts - a.firsts ||
      b.seconds - a.seconds || // silver outranks bronze
      b.thirds - a.thirds ||
      b.events - a.events ||
      a.name.localeCompare(b.name),
  );
}
