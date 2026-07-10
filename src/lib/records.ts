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

// Finishing tiers from a knockout bracket: every player on the winning side of
// the final shares 1st, the losing finalists share 2nd, the 3rd-place game (or,
// absent one, the two semifinal losers) share 3rd, and so on. Returns null when
// there's no decided bracket (e.g. a round-robin with no finals).
function bracketTiers(t: Tournament): string[][] | null {
  const ms = t.matches;
  if (!bracketChampion(ms)) return null;

  const reset = ms.find((m) => m.phase === "championship");
  const grandFinal = ms.find((m) => m.phase === "final");
  const terminal = ms
    .filter((m) => m.phase === "winners" && !m.nextMatchId)
    .sort((a, b) => b.round - a.round)[0];
  const fm = reset && decided(reset) ? reset : grandFinal && decided(grandFinal) ? grandFinal : terminal;
  if (!fm || !decided(fm)) return null;

  const tiers: string[][] = [];
  const used = new Set<string>();
  const add = (ids: string[]) => {
    const names = rosterOf(t, ids).filter((n) => n && !used.has(n.toLowerCase()));
    if (names.length) {
      names.forEach((n) => used.add(n.toLowerCase()));
      tiers.push(names);
    }
  };

  add(winSide(fm)); // 1st
  add(loseSide(fm)); // 2nd

  const placement = ms.find((m) => m.phase === "placement" && decided(m));
  if (placement) {
    add(winSide(placement)); // 3rd
    add(loseSide(placement)); // 4th
  } else {
    // No 3rd-place game: the players who lost the matches feeding the final tie for 3rd.
    const feeders = ms.filter((m) => m.nextMatchId === fm.id && decided(m));
    add(feeders.flatMap((m) => loseSide(m)));
  }

  // Everyone else, deeper-eliminated first (best-effort ordering for the also-rans).
  const lastRound = (pid: string) =>
    ms.filter((m) => m.sideA.includes(pid) || m.sideB.includes(pid)).reduce((mx, m) => Math.max(mx, m.round), 0);
  const rest = t.participants.filter((p) => {
    const people = p.members?.length ? p.members : [p.name];
    return people.some((n) => !used.has(n.toLowerCase()));
  });
  rest.sort((a, b) => lastRound(b.id) - lastRound(a.id));
  for (const p of rest) add([p.id]);

  return tiers.length ? tiers : null;
}

// Standings-based tiers (round-robin with no finals, swiss, kotc): each standings
// row is one placement — expanded to its roster so a fixed-doubles pair stays tied.
function standingsTiers(t: Tournament): string[][] {
  return computeStandings(
    t.participants,
    t.matches.filter((m) => m.scoreA !== null && m.scoreB !== null),
    t.config.tiebreaker,
    t.config.rankByWinPct,
  ).map((r) => rosterOf(t, [r.participantId]));
}

/**
 * Finishing tiers (best → worst); every name within a tier shares that placement.
 * Doubles/team results keep partners in the same tier, so both champions are 1st,
 * both runners-up 2nd, etc. — instead of an individual 1,2,3,… split.
 */
export function getPlacementTiers(t: Tournament): string[][] {
  if (t.format === "golf") return golfNames(t).map((n) => [n]);
  if (t.format === "ryder") {
    const { winners, losers } = ryderTeams(t);
    return [winners, losers].filter((tier) => tier.length > 0);
  }
  if (t.format === "americano" || t.format === "mexicano") {
    const scored = t.matches.filter((m) => m.scoreA !== null && m.scoreB !== null);
    return pointsLeaderboard(t.participants, scored).map((r) => [r.name]);
  }
  return bracketTiers(t) ?? standingsTiers(t);
}

/** Final finishing order (best → worst) as a flat list — partners stay adjacent. */
export function getRanking(t: Tournament): string[] {
  return getPlacementTiers(t).flat();
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
    // Every member of a placement tier earns that medal — both doubles champions
    // get gold, both runners-up silver, both third-place bronze.
    const tiers = getPlacementTiers(t);
    tiers[0]?.forEach((n) => row(n).firsts++);
    tiers[1]?.forEach((n) => row(n).seconds++);
    tiers[2]?.forEach((n) => row(n).thirds++);
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
