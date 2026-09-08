// Rounds played before Sporos, typed in by hand. A golfer arriving with a real
// handicap can give the index something to stand on immediately: a score, the
// tees it was shot from, and the date is everything a differential needs — no
// hole-by-hole card, and no outside service to ask.
//
// Kept on the device beside the profile (same place, same lifetime), and keyed
// by player name so the index engine can pick out whose they are.

import { canonicalName } from "./aliases";
import type { RoundScore } from "./handicap";
import { getProfile, type StartingIndex } from "./profile";

export interface PastRound {
  id: string;
  name: string; // whose round it is (matched to a player by name, as everything here is)
  at: number; // date played
  holes: number; // 9 or 18
  gross: number;
  rating: number; // course rating for the tees played (an 18-hole figure)
  slope: number;
  courseName?: string;
}

const KEY = "sporos-past-rounds";

export function getPastRounds(): PastRound[] {
  if (typeof window === "undefined") return [];
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(list) ? (list as PastRound[]) : [];
  } catch {
    return [];
  }
}

function save(list: PastRound[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage full or blocked — the round simply isn't kept */
  }
}

export function addPastRound(r: Omit<PastRound, "id">): PastRound {
  const round: PastRound = { ...r, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
  save([...getPastRounds(), round]);
  return round;
}

export function removePastRound(id: string) {
  save(getPastRounds().filter((r) => r.id !== id));
}

/** One player's entered history, newest first. Read through the alias map, so a
 *  round typed in as "Adam" still counts once that name is merged into "Adam
 *  Lewis". */
export function pastRoundsFor(name: string): PastRound[] {
  const who = canonicalName(name).trim().toLowerCase();
  if (!who) return [];
  return getPastRounds()
    .filter((r) => canonicalName(r.name).trim().toLowerCase() === who)
    .sort((a, b) => b.at - a.at);
}

/**
 * Everything the index engine should know about a player beyond the rounds
 * they've played in Sporos: the history they typed in, and the index they
 * arrived with. The starting index belongs to the phone's owner, so it only
 * comes back for their own name.
 */
export function indexInputsFor(name: string): {
  extraRounds: RoundScore[];
  prior: StartingIndex | null;
} {
  const who = canonicalName(name).trim().toLowerCase();
  const prof = getProfile();
  const mine = !!who && canonicalName(prof.name).trim().toLowerCase() === who;
  return {
    extraRounds: pastRoundsFor(name).map((r) => ({
      at: r.at,
      holes: r.holes,
      gross: r.gross,
      rating: r.rating,
      slope: r.slope,
    })),
    prior: mine ? (prof.startingIndex ?? null) : null,
  };
}
