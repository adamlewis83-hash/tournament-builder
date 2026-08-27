import { Match, Tournament } from "./types";
import { computeStandings, pointsLeaderboard } from "./standings";
import { computeBbb, computeGolf, computeMixedOverall, formatToPar } from "./golf";
import { cupScore } from "./ryderGolf";
import { bracketChampion } from "./bracket";
import { getResult } from "./result";
import { isFinal } from "./score";

const decided = (m: Match) => isFinal(m) && m.scoreA !== m.scoreB;
const winSide = (m: Match) => ((m.scoreA as number) > (m.scoreB as number) ? m.sideA : m.sideB);
const loseSide = (m: Match) => ((m.scoreA as number) > (m.scoreB as number) ? m.sideB : m.sideA);

export interface FinalRow {
  name: string;
  stat: string;
  rank?: number; // finishing position — set for standings/bracket formats so co-champions share a rank
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
    const sc = cupScore(t);
    const [a, b] = t.config.teamNames ?? ["Team A", "Team B"];
    return [
      { name: a, stat: fmtNum(sc.a) },
      { name: b, stat: fmtNum(sc.b) },
    ].sort((x, y) => parseFloat(y.stat) - parseFloat(x.stat));
  }

  if (t.format === "americano" || t.format === "mexicano") {
    const scored = t.matches.filter(isFinal);
    return pointsLeaderboard(t.participants, scored).map((r) => ({
      name: r.name,
      stat: `${r.pointsFor} pt`,
    }));
  }

  // Mirror the Record Book's placement grouping so the scorephoto agrees with it: a
  // doubles/team champion is one row (both partners), co-champions share a rank, and the
  // field keeps its round-robin position. W-L is shown when a row's people share a record.
  const s = computeStandings(
    t.participants,
    t.matches.filter(isFinal),
    t.config.tiebreaker,
    t.config.rankByWinPct,
  );
  const wl = new Map<string, string>();
  for (const r of s) {
    const stat = `${r.wins}–${r.losses}`;
    wl.set(r.name.toLowerCase(), stat);
    const p = t.participants.find((x) => x.id === r.participantId);
    p?.members?.forEach((m) => wl.set(m.toLowerCase(), stat));
  }
  return getPlacements(t).map((pl) => {
    const stats = pl.names.map((n) => wl.get(n.toLowerCase())).filter(Boolean) as string[];
    const uniform = stats.length === pl.names.length && new Set(stats).size === 1;
    return { name: pl.names.join(" & "), stat: uniform ? stats[0] : "", rank: pl.rank };
  });
}

function golfNames(t: Tournament): string[] {
  const g = t.golf;
  if (!g) return [];
  if (t.config.golfMode === "mixed") return computeMixedOverall(t, g.segments ?? []).map((r) => r.name);
  if (t.config.golfMode === "bingo") return computeBbb(t).map((r) => r.name);
  return computeGolf(t, t.config.golfMode).map((r) => r.name);
}

function ryderTeams(t: Tournament): { winners: string[]; losers: string[] } {
  const sc = cupScore(t);
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
  names: string[]; // everyone sharing this finishing place (doubles partners together)
  rank: number; // finishing PLACE, counted once each: 1st, 2nd, 3rd… never skipped
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
 * Finishing placements (best → worst), numbered by PLACE — each place counted once,
 * never skipped: 1st, 2nd, 3rd, 4th, 5th… Partners share a place, so the winning duo
 * are both 1st and the losing duo both 2nd, and the field that didn't advance picks up
 * at the next place below the podium.
 *
 * Place, not position: with a top-4 doubles final, four people finish ahead of the best
 * non-advancer, but they occupy two places (1st and 2nd), so that player is 3rd — not
 * 5th. Mixing the two numbered the podium by place and the field by position, which read
 * as a glitch (…🥉 4th, 4th, then 9th). Bronze is only awarded when a real 3rd place is
 * contested.
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
    const scored = t.matches.filter(isFinal);
    return pointsLeaderboard(t.participants, scored).map((r, i) => ({
      names: [r.name],
      rank: i + 1,
      medal: medalFor(i + 1, true),
    }));
  }

  const ms = t.matches;
  const base = ms.filter((m) => m.phase === "rr" || m.phase === "pool");
  const scored = ms.filter(isFinal);
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
  // Everyone the bracket didn't place keeps their round-robin ORDER, but is numbered
  // as the next place below the podium — their raw round-robin number would collide
  // with the podium's places and leave gaps (a top-4 final would jump 2nd → 5th).
  const podium = [...rank.values()];
  const nextPlace = podium.length ? Math.max(...podium) + 1 : 1;
  t.participants
    .filter((p) => !rank.has(p.id))
    .sort((a, b) => (rrRank.get(a.id) ?? 999) - (rrRank.get(b.id) ?? 999))
    .forEach((p, i) => rank.set(p.id, nextPlace + i));

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

/**
 * Competition ranking over hall-of-fame rows: identical records share a rank,
 * and the next distinct record skips ahead (two co-#1s, then #3). Extracted so
 * the Trophy Room page and the per-player trophy case can never disagree.
 */
export function competitionRanks(records: RecordRow[]): number[] {
  const same = (a: RecordRow, b: RecordRow) =>
    a.firsts === b.firsts && a.seconds === b.seconds && a.thirds === b.thirds && a.events === b.events;
  const out = records.map((r, i) => (i > 0 && same(records[i - 1], r) ? -1 : i + 1));
  out.forEach((v, i) => {
    if (v === -1) out[i] = out[i - 1];
  });
  return out;
}

/** The people (rostered) who played a completed tournament — doubles partners both count. */
export function playersOf(t: Tournament): string[] {
  const out = new Set<string>();
  for (const p of t.participants)
    for (const n of p.members?.length ? p.members : [p.name]) out.add(n);
  if (t.format === "ryder") {
    const rt = ryderTeams(t);
    for (const n of [...rt.winners, ...rt.losers]) out.add(n);
  }
  return [...out];
}

const completedByDate = (tournaments: Tournament[]): Tournament[] =>
  tournaments.filter((t) => getResult(t).complete).sort((a, b) => a.updatedAt - b.updatedAt);

export interface Rivalry {
  rival: string;
  wins: number; // events where `name` finished ahead of the rival
  losses: number;
  events: number; // shared completed events (ties in placement count here but not in W-L)
}

/**
 * Head-to-head records for one player against everyone they've shared a
 * completed event with — a "win" is finishing ahead of the rival in the final
 * placements (same-place finishes, e.g. doubles partners, count for neither).
 * Sorted by most-shared-events, then by biggest rivalry margin.
 */
export function headToHead(tournaments: Tournament[], name: string): Rivalry[] {
  const me = name.trim().toLowerCase();
  if (!me) return [];
  const map = new Map<string, Rivalry>();
  for (const t of completedByDate(tournaments)) {
    const place = new Map<string, number>();
    for (const pl of getPlacements(t)) for (const n of pl.names) place.set(n.toLowerCase(), pl.rank);
    const mine = place.get(me);
    if (mine == null) continue;
    for (const [other, rank] of place) {
      if (other === me) continue;
      const display =
        getPlacements(t)
          .flatMap((pl) => pl.names)
          .find((n) => n.toLowerCase() === other) ?? other;
      let r = map.get(other);
      if (!r) {
        r = { rival: display, wins: 0, losses: 0, events: 0 };
        map.set(other, r);
      }
      r.events++;
      if (mine < rank) r.wins++;
      else if (mine > rank) r.losses++;
    }
  }
  return [...map.values()].sort(
    (a, b) => b.events - a.events || b.wins - b.losses - (a.wins - a.losses) || a.rival.localeCompare(b.rival),
  );
}

export interface Streak {
  name: string;
  current: number; // consecutive most-recent events played AND won
  best: number; // longest such run ever
}

/**
 * Championship streaks: for each player, runs of consecutive completed events
 * (that they played in) finished as champion. Only players with a best run of
 * 2+ make the list — a single title is a medal, not a streak.
 */
export function titleStreaks(tournaments: Tournament[]): Streak[] {
  const state = new Map<string, { name: string; current: number; best: number }>();
  for (const t of completedByDate(tournaments)) {
    const golds = new Set(
      getPlacements(t)
        .filter((pl) => pl.medal === "gold")
        .flatMap((pl) => pl.names.map((n) => n.toLowerCase())),
    );
    const players = new Map<string, string>();
    for (const p of t.participants)
      for (const n of p.members?.length ? p.members : [p.name]) players.set(n.toLowerCase(), n);
    if (t.format === "ryder") {
      const rt = ryderTeams(t);
      for (const n of [...rt.winners, ...rt.losers]) players.set(n.toLowerCase(), n);
    }
    for (const [k, display] of players) {
      let s = state.get(k);
      if (!s) {
        s = { name: display, current: 0, best: 0 };
        state.set(k, s);
      }
      s.current = golds.has(k) ? s.current + 1 : 0;
      if (s.current > s.best) s.best = s.current;
    }
  }
  return [...state.values()]
    .filter((s) => s.best >= 2)
    .sort((a, b) => b.current - a.current || b.best - a.best || a.name.localeCompare(b.name));
}
