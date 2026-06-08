import { Match, Tournament } from "./types";
import { bracketChampion } from "./bracket";
import { computeStandings, pointsLeaderboard } from "./standings";
import { ryderScore } from "./ryder";
import { computeBbb, computeGolf, computeMixedOverall, mixedComplete } from "./golf";

export interface TournamentResult {
  complete: boolean;
  winner: string | null; // champion name(s), team name, or "Tie"
}

const finalsPhase = (m: Match) =>
  m.phase === "winners" ||
  m.phase === "losers" ||
  m.phase === "final" ||
  m.phase === "championship" ||
  m.phase === "placement";

const allScored = (ms: Match[]) =>
  ms.length > 0 && ms.every((m) => m.scoreA !== null && m.scoreB !== null);

/** Best-effort "is it finished, and who won" across every format. */
export function getResult(t: Tournament): TournamentResult {
  const P = t.participants;
  const nm = (ids: string[]) => ids.map((id) => P.find((p) => p.id === id)?.name ?? "?").join(" & ");
  const none: TournamentResult = { complete: false, winner: null };

  if (t.format === "single-elim" || t.format === "double-elim") {
    const c = bracketChampion(t.matches);
    return { complete: !!c, winner: c ? nm(c) : null };
  }

  if (t.format === "round-robin" || t.format === "pool-bracket") {
    const finals = t.matches.filter(finalsPhase);
    if (finals.length) {
      const c = bracketChampion(t.matches);
      return { complete: !!c, winner: c ? nm(c) : null };
    }
    const base = t.matches.filter((m) => m.phase === "rr" || m.phase === "pool");
    if (allScored(base)) {
      const s = computeStandings(P, base, t.config.tiebreaker);
      return { complete: true, winner: s[0]?.name ?? null };
    }
    return none;
  }

  if (t.format === "swiss") {
    const ms = t.matches.filter((m) => m.phase === "rr");
    const maxR = ms.reduce((x, m) => Math.max(x, m.round), 0);
    const cur = ms.filter((m) => m.round === maxR);
    if (maxR >= t.config.rounds && allScored(cur)) {
      const s = computeStandings(P, ms, t.config.tiebreaker);
      return { complete: true, winner: s[0]?.name ?? null };
    }
    return none;
  }

  if (t.format === "americano" || t.format === "mexicano") {
    const ms = t.matches.filter((m) => m.phase === "rr");
    const maxR = ms.reduce((x, m) => Math.max(x, m.round), 0);
    const cur = ms.filter((m) => m.round === maxR);
    const enoughRounds = t.format === "mexicano" ? maxR >= t.config.rounds : true;
    if (enoughRounds && allScored(ms) && allScored(cur)) {
      const s = pointsLeaderboard(P, ms);
      return { complete: true, winner: s[0]?.pointsFor ? s[0].name : null };
    }
    return none;
  }

  if (t.format === "kotc") {
    const ms = t.matches.filter((m) => m.phase === "rr");
    const s = computeStandings(P, ms, t.config.tiebreaker);
    const top = s.reduce((x, r) => Math.max(x, r.wins), 0);
    return top >= t.config.advanceCount ? { complete: true, winner: s[0]?.name ?? null } : none;
  }

  if (t.format === "ryder") {
    const sc = ryderScore(t.matches);
    if (sc.status === "a-wins") return { complete: true, winner: t.config.teamNames?.[0] ?? "Team A" };
    if (sc.status === "b-wins") return { complete: true, winner: t.config.teamNames?.[1] ?? "Team B" };
    if (sc.status === "tie") return { complete: true, winner: "Tie" };
    return none;
  }

  if (t.format === "golf") {
    const g = t.golf;
    if (!g) return none;
    if (t.config.golfMode === "mixed") {
      const segs = g.segments ?? [];
      if (mixedComplete(t, segs)) {
        const o = computeMixedOverall(t, segs);
        return { complete: true, winner: o[0]?.points ? o[0].name : null };
      }
      return none;
    }
    const everyHole =
      P.length > 0 &&
      P.every((p) => {
        const card = g.scores[p.id] ?? [];
        for (let h = 0; h < g.holes; h++) if (card[h] == null) return false;
        return true;
      });
    if (everyHole) {
      if (t.config.golfMode === "bingo") {
        const r = computeBbb(t);
        return { complete: true, winner: r[0]?.name ?? null };
      }
      const rows = computeGolf(t, t.config.golfMode);
      return { complete: true, winner: rows[0]?.name ?? null };
    }
    return none;
  }

  return none;
}
