// Multi-round golf: several individual rounds under one tournament, added up
// into one leaderboard — a PGA event, where every round is its own card at its
// own course and the lowest total after the last one wins.
//
// The app's scoring engine reads a single card, and that stays true: the card
// on GolfData IS the round being played. This module is the event view over the
// top of it — the other rounds, the per-round splits, and the running total.

import { computeGolf, type GolfRow } from "./golf";
import type { GolfData, GolfRoundCard, Tournament } from "./types";

/** The live card, as a round. */
export function liveCard(g: GolfData): GolfRoundCard {
  return {
    id: g.roundId ?? "r1",
    name: g.rounds?.find((r) => r.id === g.roundId)?.name ?? "Round 1",
    holes: g.holes,
    startHole: g.startHole,
    courseName: g.courseName,
    pars: g.pars,
    strokeIndex: g.strokeIndex,
    tees: g.tees,
    scores: g.scores,
    stats: g.stats,
  };
}

/** Is this a multi-round event rather than a single round? */
export const isMultiRound = (t: Tournament): boolean => (t.golf?.rounds?.length ?? 0) > 1;

/**
 * Every round in playing order, with the live card standing in for the one
 * being played — the parked copy of the active round goes stale the moment a
 * score is entered, so nothing should read it.
 */
export function roundCards(t: Tournament): GolfRoundCard[] {
  const g = t.golf;
  if (!g) return [];
  const live = liveCard(g);
  if (!g.rounds?.length) return [live];
  return g.rounds.map((r) => (r.id === g.roundId ? { ...live, name: r.name } : r));
}

/** The tournament as it looks with one round's card loaded — lets the whole
 *  scoring engine (handicaps by tee, stroke allocation, nines) score a round
 *  that isn't the one currently in play. */
export function tournamentForRound(t: Tournament, card: GolfRoundCard): Tournament {
  return {
    ...t,
    golf: {
      ...(t.golf as GolfData),
      holes: card.holes,
      startHole: card.startHole,
      courseName: card.courseName,
      pars: card.pars,
      strokeIndex: card.strokeIndex,
      tees: card.tees,
      scores: card.scores,
      stats: card.stats,
    },
  };
}

export interface RoundScoreCell {
  roundId: string;
  thru: number;
  holes: number;
  gross: number;
  net: number;
  toPar: number; // gross against the par of the holes actually played
}

export interface EventRow {
  participantId: string;
  name: string;
  handicap: number;
  rounds: RoundScoreCell[]; // one per round, in playing order
  roundsPlayed: number; // rounds with at least one hole entered
  thru: number; // holes entered across the event
  gross: number;
  net: number;
  toPar: number; // gross to par, over the holes played
  netToPar: number; // net to par, the number a net-scored event is read on
}

/**
 * The event leaderboard: every round added up, per player. Ranked lowest-total
 * first on the chosen lens — net (handicap) or gross — with a player who has
 * played more holes ahead of one who has played fewer at the same score, so a
 * board mid-round reads honestly. A player who hasn't teed off sits last.
 */
export function eventStandings(t: Tournament, lens: "net" | "gross" = "net"): EventRow[] {
  const cards = roundCards(t);
  const perRound = cards.map((c) => ({
    card: c,
    rows: new Map(computeGolf(tournamentForRound(t, c), "stroke").map((r) => [r.participantId, r])),
  }));

  const rows: EventRow[] = t.participants.map((p) => {
    const cells: RoundScoreCell[] = [];
    let gross = 0;
    let net = 0;
    let toPar = 0;
    let netToPar = 0;
    let thru = 0;
    let roundsPlayed = 0;
    let handicap = 0;
    for (const { card, rows: byId } of perRound) {
      const r: GolfRow | undefined = byId.get(p.id);
      const cell: RoundScoreCell = {
        roundId: card.id,
        thru: r?.thru ?? 0,
        holes: card.holes,
        gross: r?.gross ?? 0,
        net: r?.net ?? 0,
        toPar: r?.toPar ?? 0,
      };
      cells.push(cell);
      handicap = Math.max(handicap, r?.handicap ?? 0);
      if (cell.thru > 0) {
        roundsPlayed++;
        thru += cell.thru;
        gross += cell.gross;
        net += cell.net;
        toPar += cell.toPar;
        // Net against par: the strokes received come off the same par.
        netToPar += cell.toPar - (cell.gross - cell.net);
      }
    }
    return {
      participantId: p.id,
      name: p.name,
      handicap,
      rounds: cells,
      roundsPlayed,
      thru,
      gross,
      net,
      toPar,
      netToPar,
    };
  });

  const key = (r: EventRow) => (lens === "net" ? r.net : r.gross);
  const par = (r: EventRow) => (lens === "net" ? r.netToPar : r.toPar);
  return rows.sort(
    (a, b) =>
      (b.thru > 0 ? 1 : 0) - (a.thru > 0 ? 1 : 0) ||
      // Mid-event, totals alone would rank whoever has played least in front,
      // so the board sorts on the score against par and breaks ties on holes.
      par(a) - par(b) ||
      key(a) - key(b) ||
      b.thru - a.thru ||
      a.name.localeCompare(b.name),
  );
}

/** Has every player finished every hole of every round? */
export function eventComplete(t: Tournament): boolean {
  if (!t.participants.length) return false;
  return roundCards(t).every((c) =>
    t.participants.every((p) => {
      const card = c.scores[p.id] ?? [];
      for (let h = 0; h < c.holes; h++) if (card[h] == null) return false;
      return true;
    }),
  );
}

/** A fresh round for an event: the same course as the round given, no scores. */
export function blankRound(from: GolfRoundCard, id: string, name: string): GolfRoundCard {
  return {
    id,
    name,
    holes: from.holes,
    startHole: from.startHole,
    courseName: from.courseName,
    pars: [...from.pars],
    strokeIndex: [...from.strokeIndex],
    tees: from.tees ? from.tees.map((x) => ({ ...x })) : undefined,
    scores: {},
    stats: undefined,
  };
}
