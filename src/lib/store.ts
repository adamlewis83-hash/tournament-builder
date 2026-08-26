"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  Course,
  Format,
  Friend,
  HoleEntry,
  Match,
  Participant,
  PlayStyle,
  RyderMethod,
  Tournament,
  TournamentConfig,
} from "./types";
import { uid } from "./id";
import { isFinal, isWon } from "./score";
import { genDoublesRR, genSinglesRR, genSwissRound, genKotcNext, genMexicanoRound } from "./schedule";
import {
  genRyder,
  genRyderSession,
  removeRyderRoundFrom,
  reorderRyderRounds,
  ryderProgramOf,
  RyderScoring,
  RyderSessionType,
} from "./ryder";
import { matchOutcome } from "./ryderGolf";
import { defaultGolf } from "./golf";
import {
  genDoubleElim,
  genSingleElim,
  genSingleElimSides,
  propagateBracket,
} from "./bracket";
import { computeStandings, pointsLeaderboard } from "./standings";
import { applyProfilePhoto } from "./profile";
import { canEditScores } from "./perms";
import { scoreCount } from "./snapshot";
import { publishLive as apiPublish, fetchLive, sendPatch, LivePatch } from "./live";

const DEFAULT_CONFIG: TournamentConfig = {
  rounds: 4,
  courts: 4,
  pointsTo: 11,
  timeLimitMin: 0,
  advanceCount: 8, // top-8 finals by default (capped at player count); raise it to bracket the whole field

  poolCount: 2,
  bracketType: "single",
  tiebreaker: "diff",
  thirdPlace: false,
  teamNames: ["Team A", "Team B"],
  ryderFoursomes: 0, // default to captain mode — build sessions as the cup unfolds
  ryderFourball: 0,
  ryderSingles: 0,
  golfMode: "stroke",
  scoreLowWins: false,
};

export interface CreateInput {
  name: string;
  sport: string;
  format: Format;
  playStyle: PlayStyle;
  config?: Partial<TournamentConfig>;
}

export interface Snapshot {
  tournamentId: string;
  at: number;
  label: string;
  scores: number; // how much scoring the snapshot is holding
  data: Tournament;
}

interface State {
  tournaments: Tournament[];
  courses: Course[];
  friends: Friend[];
  /** Friends deleted anywhere, by normalized name — synced so a removal beats
   *  every stale device copy. Re-saving the name clears its tombstone. */
  friendTombstones: { name: string; at: number }[];
  /** The single most recent undo point, taken just before a setup save that would
   *  otherwise destroy entered scores. Persisted, so it survives a reload.
   *
   *  Deliberately one, not one per tournament: a clone is mostly participant photo
   *  data (~90% of a tournament's bytes), and zustand persists the whole store in a
   *  single localStorage write — so a per-tournament pile of clones could push a big
   *  library past quota and make that write fail, taking live score-saving down with
   *  it. Undo only ever offers the last setup change, so one is all it was using. */
  snapshot: Snapshot | null;
  hydrated: boolean;
  saveCourse: (input: Omit<Course, "id"> & { id?: string }) => string;
  removeCourse: (id: string) => void;
  mergeCourses: (list: Course[]) => void;
  saveFriend: (input: Omit<Friend, "id"> & { id?: string }) => string;
  removeFriend: (id: string) => void;
  mergeFriends: (list: Friend[], remoteTombstones?: { name: string; at: number }[]) => void;
  createTournament: (input: CreateInput) => string;
  importTournament: (t: Tournament) => string;
  removeTournament: (id: string) => void;
  duplicateTournament: (id: string) => string | null;
  clearLocal: () => void;
  mergeCloud: (list: Tournament[]) => void;
  pruneDeleted: (ids: string[]) => void;
  patchTournament: (id: string, patch: Partial<Tournament>) => void;
  /** Put the tournament back to its last undo point (and clear it). */
  restoreSnapshot: (id: string) => void;
  /** Drop the undo point without using it. */
  dismissSnapshot: (id: string) => void;
  setScorers: (id: string, names: string[]) => void;
  setMatchClock: (id: string, matchId: string, action: "start" | "pause" | "reset") => void;
  setRoundClock: (id: string, round: number, action: "start" | "pause" | "reset") => void;
  setParticipants: (id: string, names: string[]) => void;
  syncRegistrations: (
    id: string,
    regs: { id: string; name: string; handicap: number | null; photo: string | null }[],
  ) => void;
  addCustomMatch: (
    id: string,
    m: { sideA: string[]; sideB: string[]; round: number; court?: number },
  ) => void;
  removeMatch: (id: string, matchId: string) => void;
  setScoreChallengeScore: (
    id: string,
    participantId: string,
    round: number,
    value: number | null,
  ) => void;
  recordLadderMatch: (
    id: string,
    aId: string,
    bId: string,
    scoreA: number,
    scoreB: number,
  ) => void;
  setTeams: (id: string, teams: { name: string; members: string[] }[]) => void;
  setRyderTeams: (
    id: string,
    teamA: { name: string; handicap: number }[],
    teamB: { name: string; handicap: number }[],
    teamNames: [string, string],
    course: { holes: number; pars: number[]; strokeIndex: number[]; courseName?: string },
  ) => void;
  setRyderHoleScore: (
    id: string,
    matchId: string,
    key: string,
    hole: number,
    value: number | null,
  ) => void;
  addRyderSession: (id: string, type: RyderSessionType, shuffle: boolean) => void;
  keepRyderRounds: (id: string, keep: number) => void;
  moveRyderRound: (id: string, from: number, to: number) => void;
  setRyderSessionType: (id: string, round: number, type: RyderSessionType) => void;
  removeRyderRound: (id: string, round: number) => void;
  setRyderScoring: (id: string, scoring: RyderScoring) => void;
  setRyderPointsPerSession: (id: string, points: number | undefined) => void;
  setRyderSessionMethod: (id: string, round: number, method: RyderMethod) => void;
  setRyderSessionPoints: (id: string, round: number, points: number | undefined) => void;
  setRyderSessionCourse: (
    id: string,
    round: number,
    card: {
      courseName?: string;
      nine?: "front" | "back";
      pars: number[];
      strokeIndex: number[];
    } | null,
  ) => void;
  setGolfPlayers: (
    id: string,
    input: {
      players: { name: string; handicap: number; tee?: string }[];
      holes: number;
      startHole?: number;
      pars?: number[];
      strokeIndex?: number[];
      courseName?: string;
      tees?: import("./types").TeeSet[];
      segments?: import("./types").GolfSegment[];
      teams?: boolean;
    },
  ) => void;
  setParticipantPhoto: (id: string, participantId: string, photo: string | null) => void;
  setParticipantColor: (id: string, participantId: string, color: string) => void;
  setGolfHandicap: (id: string, participantId: string, handicap: number) => void;
  setGolfTee: (id: string, participantId: string, tee: string) => void;
  setGolfTees: (id: string, tees: import("./types").TeeSet[]) => void;
  setGolfScore: (id: string, participantId: string, hole: number, strokes: number | null) => void;
  /** Merge a three-tap stat entry (putts / tee result / bunker) into one hole. */
  setGolfHoleStat: (
    id: string,
    participantId: string,
    hole: number,
    patch: Partial<HoleEntry>,
  ) => void;
  setGolfAward: (
    id: string,
    kind: "bingo" | "bango" | "bongo",
    hole: number,
    participantId: string | null,
  ) => void;
  setGolfWolf: (id: string, hole: number, partner: string | "lone" | null) => void;
  setVegasPairing: (id: string, hole: number, choice: 0 | 1 | 2 | null) => void;
  setGolfPin: (id: string, hole: number, coords: [number, number] | null) => void;
  /** Store green outlines from an auto-load — incoming holes win where non-null,
   *  existing outlines survive holes the fetch couldn't fill. */
  setGolfGreens: (id: string, greens: ([number, number][] | null)[]) => void;
  generate: (id: string) => void;
  generateNextRound: (id: string) => void;
  resetToSetup: (id: string) => void;
  setScore: (id: string, matchId: string, a: number | null, b: number | null) => void;
  /** Live scoring: keeps the game on court, auto-finishing only when it's won. */
  scoreLive: (id: string, matchId: string, a: number | null, b: number | null) => void;
  /** Live +/- a point. Reads the current score inside the setter so fast taps can't
   *  clobber each other the way passing a stale prop value would. */
  bumpScore: (id: string, matchId: string, side: "A" | "B", delta: number) => void;
  /** Host ends the game where it stands (time called, conceded, etc). */
  endMatch: (id: string, matchId: string, final: boolean) => void;
  setMatchSides: (id: string, matchId: string, sideA: string[], sideB: string[]) => void;
  generateFinals: (id: string) => void;
  clearFinals: (id: string) => void;
  // Live shared scoring
  publishLive: (id: string) => Promise<string | null>;
  joinLive: (code: string) => Promise<string | null>;
  goOffline: (id: string) => void;
  applyRemote: (id: string, data: Tournament, version: number) => void;
}

// Everything the finals bracket owns. "placement" (the bronze match) belongs here
// too: leaving it out treated it as a round-robin game, so its result counted toward
// the standings, "Clear bracket" left it on the schedule, and re-seeding stacked up a
// second copy. Records already counts it as a finals phase — these must agree.
const isFinalsPhase = (m: Match) =>
  m.phase === "winners" ||
  m.phase === "losers" ||
  m.phase === "final" ||
  m.phase === "championship" ||
  m.phase === "placement";

// Apply a start/pause/reset to one clock, returning the next state (or null to clear it).
// start resumes from the paused remainder, or the full time when idle; expired clocks stay put.
function nextClock(
  cur: { endAt?: number; leftSec?: number } | undefined,
  action: "start" | "pause" | "reset",
  totalSec: number,
  now: number,
): { endAt?: number; leftSec?: number } | null {
  const remaining =
    cur?.endAt != null
      ? Math.max(0, Math.round((cur.endAt - now) / 1000))
      : cur?.leftSec != null
        ? cur.leftSec
        : totalSec;
  if (action === "reset") return null;
  if (action === "pause") return { leftSec: remaining };
  // start
  if (remaining <= 0) return cur ?? null; // already expired — don't restart
  return { endAt: now + remaining * 1000 };
}

/**
 * The finals bracket implied by the CURRENT standings — who'd advance if the
 * round robin ended right now. Pure, so it can be re-derived any time.
 */
export function buildFinals(t: Tournament): Match[] {
  const baseMatches = t.matches.filter((m) => !isFinalsPhase(m));
  let finals: Match[] = [];

  if (t.format === "round-robin") {
    const standings = computeStandings(t.participants, baseMatches, t.config.tiebreaker, t.config.rankByWinPct);
    const n = Math.min(t.config.advanceCount, standings.length);
    const seedIds = standings.slice(0, n).map((r) => r.participantId);
    if (t.playStyle === "doubles") {
      // Pair best with worst of the advancing group: (1&N) vs (2&N-1) ...
      const sides: string[][] = [];
      for (let i = 0; i < Math.floor(seedIds.length / 2); i++) {
        sides.push([seedIds[i], seedIds[seedIds.length - 1 - i]]);
      }
      finals = genSingleElimSides(sides, "winners", { thirdPlace: t.config.bronzeMatch ?? t.config.thirdPlace });
    } else {
      finals = genSingleElim(seedIds, "winners", { thirdPlace: t.config.bronzeMatch ?? t.config.thirdPlace });
    }
    // Bronze medal: when the finals bracket has a semifinal, genSingleElim above
    // already added a semifinal-losers 3rd-place game. Only when the final is just two
    // teams (no semifinal) do the NEXT tier play off — doubles 5&8 vs 6&7, singles 5 vs 6.
    const wantBronze = t.config.bronzeMatch ?? t.config.thirdPlace;
    if (wantBronze && !finals.some((m) => m.phase === "placement")) {
      const need = t.playStyle === "doubles" ? 4 : 2;
      const b = standings.slice(n, n + need).map((r) => r.participantId);
      if (b.length === need) {
        finals.push({
          id: uid(),
          phase: "placement",
          round: 1,
          order: 99,
          label: "Bronze Medal Match",
          sideA: need === 4 ? [b[0], b[3]] : [b[0]],
          sideB: need === 4 ? [b[1], b[2]] : [b[1]],
          scoreA: null,
          scoreB: null,
        });
      }
    }
  } else if (t.format === "pool-bracket") {
    // Seed across pools: all pool winners first, then runners-up, etc.
    const poolIds = Array.from(new Set(baseMatches.map((m) => m.poolId).filter(Boolean))) as string[];
    const perPool = poolIds.map((pid) =>
      computeStandings(
        t.participants,
        baseMatches.filter((m) => m.poolId === pid),
        t.config.tiebreaker,
        t.config.rankByWinPct,
      ),
    );
    const advancePerPool = Math.max(1, Math.ceil(t.config.advanceCount / Math.max(1, poolIds.length)));
    const seeds: string[] = [];
    for (let rank = 0; rank < advancePerPool; rank++) {
      for (const pool of perPool) {
        if (pool[rank]) seeds.push(pool[rank].participantId);
      }
    }
    const seedIds = seeds.slice(0, t.config.advanceCount);
    finals =
      t.config.bracketType === "double"
        ? genDoubleElim(seedIds)
        : genSingleElim(seedIds, "winners", { thirdPlace: t.config.bronzeMatch ?? t.config.thirdPlace });
  }
  return finals;
}

/** Has anyone actually started playing the finals? Once they have, the draw is locked. */
export function finalsStarted(matches: Match[]): boolean {
  return matches.some((m) => isFinalsPhase(m) && (m.scoreA !== null || m.scoreB !== null));
}

/**
 * Keep an unplayed finals bracket honest. Seeding the bracket early used to freeze
 * whoever was top at that moment — play the round robin out and the wrong people were
 * still in the final, with nothing to say so. While no finals game has been played the
 * draw is just a projection, so re-derive it from the current standings; the moment a
 * finals game has a score the draw is locked and left alone.
 */
export function resyncFinals(t: Tournament): Tournament {
  if (!t.matches.some(isFinalsPhase)) return t; // no bracket seeded — nothing to keep in sync
  if (finalsStarted(t.matches)) return t; // under way — never rewrite a live draw
  const next = buildFinals(t);
  const sig = (ms: Match[]) =>
    ms
      .filter(isFinalsPhase)
      .map((m) => `${m.phase}:${m.round}:${m.order}:${m.sideA.join("+")}v${m.sideB.join("+")}`)
      .sort()
      .join("|");
  if (sig(t.matches) === sig(next)) return t; // already correct — keep object identity
  return { ...t, matches: [...t.matches.filter((m) => !isFinalsPhase(m)), ...next] };
}

/** Fisher-Yates. Used for the draw, so who you type first doesn't decide who you play. */
export function shuffled<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * `order` overrides the draw order; without it the roster order is used as typed.
 * Every generator below seeds off this list — in doubles it decides who partners
 * whom, in a bracket it decides the seeds — so the caller (generate) shuffles it
 * unless the host asked to keep their typed order. Kept as a parameter rather than
 * shuffling in here so this stays pure and a rebuild is reproducible.
 */
export function buildMatches(t: Tournament, order?: string[]): Match[] {
  const ids = order ?? t.participants.map((p) => p.id);
  const { rounds, courts, poolCount } = t.config;

  switch (t.format) {
    case "round-robin":
      return t.playStyle === "doubles"
        ? genDoublesRR(ids, rounds, courts)
        : genSinglesRR(ids, courts, "rr");

    case "americano":
      return genDoublesRR(ids, rounds, courts);

    case "mexicano":
      return genMexicanoRound(ids, 1, courts);

    case "swiss":
      return genSwissRound(ids, [], 1, courts);

    case "kotc": {
      const g = genKotcNext(ids, [], 1);
      return g ? [g] : [];
    }

    case "single-elim":
      return genSingleElim(ids, "winners", { thirdPlace: t.config.bronzeMatch ?? t.config.thirdPlace });

    case "double-elim":
      return genDoubleElim(ids);

    case "ryder":
      return genRyder(t.participants, {
        foursomes: t.config.ryderFoursomes,
        fourball: t.config.ryderFourball,
        singles: t.config.ryderSingles,
      });

    case "golf":
      return []; // golf uses the scorecard model, not matches

    case "custom":
      return []; // freeform: the host builds matches by hand

    case "score-challenge":
      return []; // cumulative scoring, not head-to-head matches

    case "ladder":
      return []; // ongoing challenge ladder; matches recorded as they happen

    case "pool-bracket": {
      // Snake-seed participants into pools, then per-pool round robin.
      const pools: string[][] = Array.from({ length: Math.max(1, poolCount) }, () => []);
      ids.forEach((id, i) => {
        const round = Math.floor(i / pools.length);
        const pos = i % pools.length;
        const idx = round % 2 === 0 ? pos : pools.length - 1 - pos;
        pools[idx].push(id);
      });
      const out: Match[] = [];
      pools.forEach((pool, pi) => {
        const poolId = `pool-${pi + 1}`;
        const pm =
          t.playStyle === "doubles"
            ? genDoublesRR(pool, rounds, courts).map((m) => ({ ...m, phase: "pool" as const, poolId }))
            : genSinglesRR(pool, courts, "pool", poolId);
        out.push(...pm);
      });
      return out;
    }
  }
}

export const useStore = create<State>()(
  persist(
    (set, get) => {
      // Push a mergeable change to the live session (if this tournament is live).
      const pushPatch = (id: string, patch: LivePatch) => {
        if (typeof window === "undefined") return;
        const t = get().tournaments.find((x) => x.id === id);
        if (!t?.liveCode) return;
        sendPatch(t.liveCode, patch)
          .then((res) => {
            if (res)
              set((s) => ({
                tournaments: s.tournaments.map((x) =>
                  x.id === id ? { ...x, liveVersion: res.version } : x,
                ),
              }));
          })
          .catch(() => {});
      };
      /** Structure changed — sessions added, removed, re-ordered, rebuilt. The whole
       *  tournament has to go, scorecards included, because the matches themselves moved. */
      const pushReplace = (id: string) => {
        const t = get().tournaments.find((x) => x.id === id);
        if (t?.liveCode) pushPatch(id, { kind: "replace", data: { ...t } });
      };
      /** Only settings changed. Sends everything but the matches and the scorecards, so
       *  a host adjusting the scoring or the scorekeepers can't wipe a card a teammate is
       *  filling in on another phone. */
      const pushSettings = (id: string) => {
        const t = get().tournaments.find((x) => x.id === id);
        if (t?.liveCode) pushPatch(id, { kind: "settings", data: { ...t } });
      };
      // Spectators (joined via live code) are read-only unless the host granted them as a
      // scorekeeper (matched by profile name). The host is never blocked.
      // Take an undo point before a save that is about to clear entered scores.
      // Only worth keeping when there is something to lose, so an untouched setup
      // never leaves a stale "restore" sitting on the page.
      const snapshot = (id: string, label: string) => {
        const t = get().tournaments.find((x) => x.id === id);
        if (!t || t.spectator) return;
        const scores = scoreCount(t);
        if (!scores) return;
        set({
          snapshot: { tournamentId: id, at: Date.now(), label, scores, data: structuredClone(t) },
        });
      };

      const blocked = (id: string) => {
        const t = get().tournaments.find((x) => x.id === id);
        return t ? !canEditScores(t) : false;
      };

      return {
      tournaments: [],
      courses: [],
      friends: [],
      friendTombstones: [],
      snapshot: null,
      hydrated: false,

      saveFriend: (input) => {
        let id = input.id ?? "";
        set((s) => {
          const match = input.id
            ? s.friends.find((f) => f.id === input.id)
            : s.friends.find((f) => f.name.trim().toLowerCase() === input.name.trim().toLowerCase());
          const friend: Friend = {
            // Keep any existing detail the input doesn't override (e.g. saving a name again
            // shouldn't wipe a handicap set earlier), then apply the new values on top.
            ...(match ?? {}),
            id: match?.id ?? uid(),
            name: input.name.trim(),
            ...(input.handicap != null ? { handicap: input.handicap } : {}),
            ...(input.photo ? { photo: input.photo } : {}),
            ...(input.color ? { color: input.color } : {}),
          };
          id = friend.id;
          // Saving a name again is the deliberate re-add — clear its tombstone.
          const key = friend.name.trim().toLowerCase();
          const friendTombstones = s.friendTombstones.filter((t) => t.name !== key);
          return match
            ? { friends: s.friends.map((f) => (f.id === match.id ? friend : f)), friendTombstones }
            : { friends: [...s.friends, friend], friendTombstones };
        });
        return id;
      },

      removeFriend: (id) =>
        set((s) => {
          const gone = s.friends.find((f) => f.id === id);
          const key = gone?.name.trim().toLowerCase();
          return {
            friends: s.friends.filter((f) => f.id !== id),
            // Tombstone by name (ids differ across devices for the same person)
            // so the deletion out-syncs every stale copy.
            friendTombstones:
              key && !s.friendTombstones.some((t) => t.name === key)
                ? [...s.friendTombstones, { name: key, at: Date.now() }]
                : s.friendTombstones,
          };
        }),

      // Union cloud friends into local without ever dropping a local one. Local
      // wins on id or name collisions (avoids duplicating the same person); any
      // cloud friend not seen locally is added — this restores friends after a
      // reinstall/sign-in on a device whose local list was empty.
      mergeFriends: (list, remoteTombstones = []) =>
        set((s) => {
          // Deletions win over stale copies: union the tombstones, drop any
          // local friend a remote tombstone names, and never re-add a
          // tombstoned name from the cloud. Re-saving a name (saveFriend)
          // clears its tombstone — that's the intentional re-add path.
          const tombs = [...s.friendTombstones];
          for (const rt of remoteTombstones) {
            const key = rt.name.trim().toLowerCase();
            if (!tombs.some((t) => t.name === key)) tombs.push({ name: key, at: rt.at });
          }
          const dead = new Set(tombs.map((t) => t.name));
          const kept = s.friends.filter((f) => !dead.has(f.name.trim().toLowerCase()));
          const byId = new Set(kept.map((f) => f.id));
          const byName = new Set(kept.map((f) => f.name.trim().toLowerCase()));
          const add = list.filter((f) => {
            const key = f.name.trim().toLowerCase();
            return !byId.has(f.id) && !byName.has(key) && !dead.has(key);
          });
          return { friends: [...kept, ...add], friendTombstones: tombs };
        }),

      saveCourse: (input) => {
        let id = input.id ?? "";
        set((s) => {
          const match = input.id
            ? s.courses.find((c) => c.id === input.id)
            : s.courses.find((c) => c.name.trim().toLowerCase() === input.name.trim().toLowerCase());
          const course: Course = {
            id: match?.id ?? uid(),
            name: input.name.trim(),
            holes: input.holes,
            pars: input.pars,
            strokeIndex: input.strokeIndex,
            tees: input.tees,
          };
          id = course.id;
          return match
            ? { courses: s.courses.map((c) => (c.id === match.id ? course : c)) }
            : { courses: [course, ...s.courses] };
        });
        return id;
      },

      removeCourse: (id) => set((s) => ({ courses: s.courses.filter((c) => c.id !== id) })),

      // Union cloud courses into local without dropping a local one (see
      // mergeFriends). Restores saved courses after a reinstall/sign-in.
      mergeCourses: (list) =>
        set((s) => {
          const byId = new Set(s.courses.map((c) => c.id));
          const byName = new Set(s.courses.map((c) => c.name.trim().toLowerCase()));
          const add = list.filter(
            (c) => !byId.has(c.id) && !byName.has(c.name.trim().toLowerCase()),
          );
          return add.length ? { courses: [...s.courses, ...add] } : {};
        }),

      createTournament: (input) => {
        const id = uid();
        const now = Date.now();
        const t: Tournament = {
          id,
          name: input.name.trim() || "Untitled Tournament",
          sport: input.sport.trim() || "Pickleball",
          format: input.format,
          playStyle: input.playStyle,
          participants: [],
          matches: [],
          config: { ...DEFAULT_CONFIG, ...input.config },
          createdAt: now,
          updatedAt: now,
          generated: false,
        };
        set((s) => ({ tournaments: [t, ...s.tournaments] }));
        return id;
      },

      importTournament: (t) => {
        const id = uid();
        const now = Date.now();
        const copy: Tournament = { ...structuredClone(t), id, createdAt: now, updatedAt: now };
        set((s) => {
          if (s.tournaments.some((x) => x.id === id)) return {} as Partial<State>;
          return { tournaments: [copy, ...s.tournaments] };
        });
        return id;
      },

      mergeCloud: (list) =>
        set((s) => {
          const byId = new Map(s.tournaments.map((t) => [t.id, t]));
          for (const remote of list) {
            const local = byId.get(remote.id);
            if (!local || (remote.updatedAt ?? 0) > (local.updatedAt ?? 0)) {
              byId.set(remote.id, remote);
            }
          }
          return {
            tournaments: [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt),
          };
        }),

      removeTournament: (id) =>
        set((s) => ({ tournaments: s.tournaments.filter((t) => t.id !== id) })),

      // Sign-out hygiene: remove the whole library from this device. The cloud
      // copy under the signed-in account is untouched — signing back in pulls
      // it all back. Without this, the next account on this device inherits the
      // previous one's tournaments in the Record Book (and would cross-upload
      // them to its own cloud library).
      clearLocal: () => set(() => ({ tournaments: [], friends: [], courses: [] })),

      // Drop local copies the cloud says were deleted (tombstones). Without this a
      // device that was closed during a delete keeps its stale copy and re-pushes
      // it on next load, resurrecting the tournament everywhere.
      pruneDeleted: (ids) =>
        set((s) => {
          const gone = new Set(ids);
          const kept = s.tournaments.filter((t) => !gone.has(t.id));
          return kept.length === s.tournaments.length ? {} : { tournaments: kept };
        }),

      duplicateTournament: (id) => {
        const src = get().tournaments.find((t) => t.id === id);
        if (!src) return null;
        const newId = uid();
        const copy: Tournament = {
          ...structuredClone(src),
          id: newId,
          name: `${src.name} (copy)`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((s) => ({ tournaments: [copy, ...s.tournaments] }));
        return newId;
      },

      restoreSnapshot: (id) => {
        const snap = get().snapshot;
        if (!snap || snap.tournamentId !== id) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) =>
            // Keep the live link and viewing role from the current copy — those describe
            // this device's session, not the scoring state being put back.
            t.id === id
              ? {
                  ...snap.data,
                  liveCode: t.liveCode,
                  liveVersion: t.liveVersion,
                  spectator: t.spectator,
                  updatedAt: Date.now(),
                }
              : t,
          ),
          snapshot: null,
        }));
        pushReplace(id);
      },

      dismissSnapshot: (id) =>
        set((s) => (s.snapshot?.tournamentId === id ? { snapshot: null } : {})),

      patchTournament: (id, patch) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) =>
            t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t,
          ),
        }));
        // This never pushed at all, so everything routed through it stayed on one
        // phone: the cup's Vegas house rules, the golf scoring view, the name at the
        // top. A settings push, so it still can't tread on anyone's scorecard.
        pushSettings(id);
      },

      // Host-only: choose which players may keep score from their own device.
      setScorers: (id, names) => {
        set((s) => ({
          tournaments: s.tournaments.map((t) =>
            t.id === id && !t.spectator ? { ...t, scorers: names, updatedAt: Date.now() } : t,
          ),
        }));
        pushSettings(id);
      },

      // Start/pause/reset one match's game clock — synced so every viewer sees the same countdown.
      setMatchClock: (id, matchId, action) => {
        if (blocked(id)) return; // host or granted scorer only
        const now = Date.now();
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id) return t;
            const total = (t.config.timeLimitMin || 0) * 60;
            if (total <= 0) return t;
            const clocks = { ...(t.clocks ?? {}) };
            const nc = nextClock(clocks[matchId], action, total, now);
            if (nc) clocks[matchId] = nc;
            else delete clocks[matchId];
            return { ...t, clocks, updatedAt: now };
          }),
        }));
        pushReplace(id);
      },

      // Same, applied to every timed match in a round at once (the "Start all" master clock).
      setRoundClock: (id, round, action) => {
        if (blocked(id)) return;
        const now = Date.now();
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id) return t;
            const total = (t.config.timeLimitMin || 0) * 60;
            if (total <= 0) return t;
            const clocks = { ...(t.clocks ?? {}) };
            for (const m of t.matches) {
              if (m.round !== round) continue;
              const decided = isFinal(m) && m.scoreA !== m.scoreB;
              if (!m.sideA.length || !m.sideB.length || decided) continue;
              const nc = nextClock(clocks[m.id], action, total, now);
              if (nc) clocks[m.id] = nc;
              else delete clocks[m.id];
            }
            return { ...t, clocks, updatedAt: now };
          }),
        }));
        pushReplace(id);
      },

      setParticipants: (id, names) =>
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id) return t;
            const existing = new Map(t.participants.map((p) => [p.name.toLowerCase(), p]));
            const participants: Participant[] = applyProfilePhoto(
              names
                .map((n) => n.trim())
                .filter(Boolean)
                .map((n) => existing.get(n.toLowerCase()) ?? { id: uid(), name: n }),
            );
            return { ...t, participants, updatedAt: Date.now() };
          }),
        })),

      // Merge the live registration pool into participants. Each registration maps to a
      // stable "reg-<id>" participant; host team/seed assignments are preserved across polls,
      // and kicked (deleted) registrations drop out. Manually-added players are untouched.
      syncRegistrations: (id, regs) =>
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id) return t;
            if (t.spectator || t.generated) return t; // host setup only
            const prev = new Map(t.participants.map((p) => [p.id, p]));
            // Host's manually-typed roster. A registrant whose name matches one of these
            // "claims" it — their photo/handicap attach to that entry instead of creating a
            // duplicate. So a host can type everyone, then have people fill in their own
            // details by joining the registration link.
            const manual = t.participants
              .filter((p) => !p.id.startsWith("reg-"))
              .map((p) => ({ ...p }));
            const manualByName = new Map<string, Participant>();
            for (const p of manual) {
              const k = p.name.trim().toLowerCase();
              if (k && !manualByName.has(k)) manualByName.set(k, p);
            }
            const claimed = new Set<string>();
            // Once a registration has been imported (or claimed a typed name), the
            // host's later removal of that player is final — never re-import them.
            const seen = new Set(t.syncedRegs ?? []);
            const regParts: Participant[] = [];
            for (const r of regs) {
              const key = String(r.id);
              const hit = manualByName.get(r.name.trim().toLowerCase());
              if (hit && !claimed.has(hit.id)) {
                // Merge onto the typed name rather than adding a second player.
                claimed.add(hit.id);
                seen.add(key);
                if (r.handicap != null) hit.handicap = r.handicap;
                if (r.photo) hit.photo = r.photo;
                continue;
              }
              const old = prev.get(`reg-${r.id}`);
              if (!old && seen.has(key)) continue; // host removed them — stay removed
              seen.add(key);
              const p: Participant = { id: `reg-${r.id}`, name: r.name };
              if (r.handicap != null) p.handicap = r.handicap;
              if (r.photo) p.photo = r.photo;
              if (old?.team !== undefined) p.team = old.team;
              if (old?.seed !== undefined) p.seed = old.seed;
              if (old?.tee !== undefined) p.tee = old.tee;
              regParts.push(p);
            }
            const participants = [...manual, ...regParts];
            const syncedRegs = Array.from(seen);
            if (
              JSON.stringify([participants, syncedRegs]) ===
              JSON.stringify([t.participants, t.syncedRegs ?? []])
            )
              return t;
            return { ...t, participants, syncedRegs, updatedAt: Date.now() };
          }),
        })),

      addCustomMatch: (id, m) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id) return t;
            const order = t.matches.filter((x) => x.round === m.round).length;
            const match: Match = {
              id: uid(),
              phase: "rr",
              round: m.round,
              order,
              sideA: m.sideA,
              sideB: m.sideB,
              scoreA: null,
              scoreB: null,
              ...(m.court != null ? { court: m.court } : {}),
            };
            return { ...t, matches: [...t.matches, match], updatedAt: Date.now() };
          }),
        }));
        pushReplace(id);
      },

      removeMatch: (id, matchId) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) =>
            t.id === id
              ? { ...t, matches: t.matches.filter((x) => x.id !== matchId), updatedAt: Date.now() }
              : t,
          ),
        }));
        pushReplace(id);
      },

      setScoreChallengeScore: (id, participantId, round, value) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id) return t;
            const rounds = Math.max(1, t.config.rounds);
            const scores = { ...(t.scoreChallenge?.scores ?? {}) };
            const card = [...(scores[participantId] ?? Array(rounds).fill(null))];
            while (card.length < rounds) card.push(null);
            card[round] = value;
            scores[participantId] = card;
            return { ...t, scoreChallenge: { scores }, updatedAt: Date.now() };
          }),
        }));
        pushReplace(id);
      },

      recordLadderMatch: (id, aId, bId, scoreA, scoreB) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id) return t;
            const round = t.matches.reduce((m, x) => Math.max(m, x.round), 0) + 1;
            const match: Match = {
              id: uid(),
              phase: "rr",
              round,
              order: 0,
              sideA: [aId],
              sideB: [bId],
              scoreA,
              scoreB,
            };
            let order = t.ladder?.order ?? t.participants.map((p) => p.id);
            if (scoreA !== scoreB) {
              const winner = scoreA > scoreB ? aId : bId;
              const loser = scoreA > scoreB ? bId : aId;
              const wi = order.indexOf(winner);
              const li = order.indexOf(loser);
              // Winner currently ranked below the loser → upset → swap their spots.
              if (wi > li && wi >= 0 && li >= 0) {
                order = [...order];
                order[wi] = loser;
                order[li] = winner;
              }
            }
            return { ...t, matches: [...t.matches, match], ladder: { order }, updatedAt: Date.now() };
          }),
        }));
        pushReplace(id);
      },

      setTeams: (id, teams) =>
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id) return t;
            const existing = new Map(t.participants.map((p) => [p.name.toLowerCase(), p]));
            const participants: Participant[] = teams
              .filter((tm) => tm.name.trim())
              .map((tm) => {
                const prev = existing.get(tm.name.trim().toLowerCase());
                return {
                  ...(prev ?? { id: uid() }),
                  name: tm.name.trim(),
                  members: tm.members.map((m) => m.trim()).filter(Boolean),
                };
              });
            return { ...t, participants, updatedAt: Date.now() };
          }),
        })),

      setRyderTeams: (id, teamA, teamB, teamNames, course) => {
        snapshot(id, "Cup setup re-saved");
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id) return t;
            const existing = new Map(t.participants.map((p) => [p.name.toLowerCase(), p]));
            const build = (rows: { name: string; handicap: number }[], team: 0 | 1): Participant[] =>
              rows
                .filter((r) => r.name.trim())
                .map((r) => ({
                  ...(existing.get(r.name.trim().toLowerCase()) ?? {
                    id: uid(),
                    name: r.name.trim(),
                  }),
                  name: r.name.trim(),
                  team,
                  handicap: r.handicap,
                }));
            const participants = applyProfilePhoto([...build(teamA, 0), ...build(teamB, 1)], {
              golfHandicap: true,
            });
            // Same rule for a cup: scores are keyed by match id and the matches are not
            // being rebuilt here, so re-saving setup must not throw the card away. The
            // per-session course cards and scoring methods are keyed by round and survive
            // for the same reason.
            const ryderGolf = {
              holes: course.holes,
              pars: course.pars,
              strokeIndex: course.strokeIndex,
              courseName: course.courseName,
              scores: t.ryderGolf?.scores ?? {},
              ...(t.ryderGolf?.sessionCourses ? { sessionCourses: t.ryderGolf.sessionCourses } : {}),
              ...(t.ryderGolf?.sessionMethods ? { sessionMethods: t.ryderGolf.sessionMethods } : {}),
            };
            return {
              ...t,
              participants,
              ryderGolf,
              config: { ...t.config, teamNames },
              updatedAt: Date.now(),
            };
          }),
        }));
        pushReplace(id);
      },

      setRyderHoleScore: (id, matchId, key, hole, value) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id || !t.ryderGolf) return t;
            const g = t.ryderGolf;
            const matchScores = { ...(g.scores[matchId] ?? {}) };
            const arr = [...(matchScores[key] ?? Array(g.holes).fill(null))];
            arr[hole] = value;
            matchScores[key] = arr;
            const tWith = { ...t, ryderGolf: { ...g, scores: { ...g.scores, [matchId]: matchScores } } };
            const m = tWith.matches.find((x) => x.id === matchId);
            let matches = tWith.matches;
            if (m) {
              // Store the match's outcome as points (1 / 0, or ½ each when tied)
              // rather than the method's own units, so a session read as stroke play
              // or Stableford settles the same way match play always has. Only the
              // comparison is ever read back, and older cups' stored holes-up numbers
              // still compare correctly.
              const o = matchOutcome(tWith, m);
              const scoreA = o.decided ? o.a : null;
              const scoreB = o.decided ? o.b : null;
              matches = tWith.matches.map((x) =>
                x.id === matchId ? { ...x, scoreA, scoreB } : x,
              );
            }
            return { ...tWith, matches, updatedAt: Date.now() };
          }),
        }));
        // Send the one hole, not the whole tournament. A "replace" here overwrote the
        // server with this phone's copy, so two people scoring different matches at
        // once each wiped the other's card — which read as live scoring not syncing.
        pushPatch(id, { kind: "ryderScore", matchId, key, hole, strokes: value });
      },

      // Trim the cup back to its first `keep` sessions, leaving those matches — and the
      // scorecards keyed to their ids — exactly as they are. Used when Edit setup changes
      // the program: rather than rebuilding the whole cup, only the changed tail is redone.
      /** Reorder the cup's sessions — see `reorderRyderRounds` for what moves with them. */
      moveRyderRound: (id, from, to) => {
        set((s) => ({
          tournaments: s.tournaments.map((t) =>
            t.id === id && !t.spectator ? reorderRyderRounds(t, from, to) : t,
          ),
        }));
        pushReplace(id);
      },

      keepRyderRounds: (id, keep) => {
        snapshot(id, "Cup program changed");
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id || t.spectator) return t;
            const matches = t.matches.filter((m) => m.phase !== "ryder" || m.round <= keep);
            const kept = new Set(matches.map((m) => m.id));
            const scores = Object.fromEntries(
              Object.entries(t.ryderGolf?.scores ?? {}).filter(([mid]) => kept.has(mid)),
            );
            return {
              ...t,
              matches,
              generated: true,
              ...(t.ryderGolf ? { ryderGolf: { ...t.ryderGolf, scores } } : {}),
              config: { ...t.config, ryderProgram: ryderProgramOf(matches) },
              updatedAt: Date.now(),
            };
          }),
        }));
        pushReplace(id);
      },

      addRyderSession: (id, type, shuffle) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id) return t;
            const maxRound = t.matches.reduce((mx, m) => Math.max(mx, m.round), 0);
            const next = genRyderSession(t.participants, type, maxRound + 1, shuffle);
            if (!next.length) return t;
            const matches = [...t.matches, ...next];
            return {
              ...t,
              matches,
              config: { ...t.config, ryderProgram: ryderProgramOf(matches) },
              updatedAt: Date.now(),
            };
          }),
        }));
        pushReplace(id);
      },

      /**
       * Change which game a session plays — a whole-team Scramble into a 2v2 one, say.
       *
       * The sides themselves differ between games (one 4v4 match versus two 2v2 ones),
       * so this rebuilds that session's matches rather than relabelling them, and the
       * scorecards keyed to the old match ids go with them. Callers warn first when
       * there is anything to lose. The session's course card and scoring method are
       * keyed by round and stay put — both are independent of which game is played.
       */
      setRyderSessionType: (id, round, type) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id) return t;
            const next = genRyderSession(t.participants, type, round, false);
            if (!next.length) return t;
            const dropped = new Set(
              t.matches.filter((m) => m.phase === "ryder" && m.round === round).map((m) => m.id),
            );
            const matches = [
              ...t.matches.filter((m) => !dropped.has(m.id)),
              ...next,
            ].sort((a, b) => a.round - b.round || a.order - b.order);
            const g = t.ryderGolf;
            const scores = g
              ? Object.fromEntries(Object.entries(g.scores).filter(([mid]) => !dropped.has(mid)))
              : undefined;
            return {
              ...t,
              matches,
              ...(g && scores ? { ryderGolf: { ...g, scores } } : {}),
              config: { ...t.config, ryderProgram: ryderProgramOf(matches) },
              updatedAt: Date.now(),
            };
          }),
        }));
        pushReplace(id);
      },

      // How the cup counts its points. Only the scoreboard's arithmetic changes —
      // matches, pairings and every hole on the card are untouched — so a host can
      // switch mid-cup. Pushed live so spectators re-weigh with the same rule.
      setRyderPointsPerSession: (id, points) => {
        set((s) => ({
          tournaments: s.tournaments.map((t) =>
            t.id === id && !t.spectator
              ? {
                  ...t,
                  config: { ...t.config, ryderPointsPerSession: points },
                  updatedAt: Date.now(),
                }
              : t,
          ),
        }));
        pushSettings(id);
      },

      setRyderScoring: (id, scoring) => {
        set((s) => ({
          tournaments: s.tournaments.map((t) =>
            // Host-only, like setScorers: a granted scorekeeper enters scores, but
            // how the cup counts them is the host's rule to set.
            t.id === id && !t.spectator
              ? { ...t, config: { ...t.config, ryderScoring: scoring }, updatedAt: Date.now() }
              : t,
          ),
        }));
        pushSettings(id);
      },

      // Which way a session is read off the scorecard. Purely interpretive — no hole
      // score is touched, so a session can be re-read mid-round without losing anything.
      setRyderSessionMethod: (id, round, method) => {
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id || t.spectator || !t.ryderGolf) return t;
            const methods = { ...(t.ryderGolf.sessionMethods ?? {}), [round]: method };
            const tWith = { ...t, ryderGolf: { ...t.ryderGolf, sessionMethods: methods } };
            // Re-settle that session's matches under the new reading.
            const matches = tWith.matches.map((m) => {
              if (m.phase !== "ryder" || m.round !== round) return m;
              const o = matchOutcome(tWith, m);
              return { ...m, scoreA: o.decided ? o.a : null, scoreB: o.decided ? o.b : null };
            });
            return { ...tWith, matches, updatedAt: Date.now() };
          }),
        }));
        pushSettings(id);
      },

      /** Drop a session — see `removeRyderRoundFrom` for what goes with it. */
      removeRyderRound: (id, round) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) =>
            t.id === id ? removeRyderRoundFrom(t, round) : t,
          ),
        }));
        pushReplace(id);
      },

      // Multi-course cups: assign (or clear) the course card one session plays on.
      /** Points on the line for one session, overriding the cup-wide number. Clearing
       *  it (undefined) hands the session back to whatever the cup says. */
      setRyderSessionPoints: (id, round, points) => {
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id || t.spectator || !t.ryderGolf) return t;
            const next = { ...(t.ryderGolf.sessionPoints ?? {}) };
            if (points != null && Number.isFinite(points) && points > 0) next[round] = points;
            else delete next[round];
            return {
              ...t,
              ryderGolf: { ...t.ryderGolf, sessionPoints: next },
              updatedAt: Date.now(),
            };
          }),
        }));
        pushSettings(id);
      },

      setRyderSessionCourse: (id, round, card) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id || !t.ryderGolf) return t;
            const sessionCourses = { ...(t.ryderGolf.sessionCourses ?? {}) };
            if (card) sessionCourses[round] = card;
            else delete sessionCourses[round];
            return { ...t, ryderGolf: { ...t.ryderGolf, sessionCourses }, updatedAt: Date.now() };
          }),
        }));
        pushSettings(id);
      },

      setGolfPlayers: (id, input) => {
        snapshot(id, "Course & players re-saved");
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id) return t;
            const existing = new Map(t.participants.map((p) => [p.name.toLowerCase(), p]));
            const participants: Participant[] = applyProfilePhoto(
              input.players
                .filter((p) => p.name.trim())
                .map((p) => ({
                  ...(existing.get(p.name.trim().toLowerCase()) ?? { id: uid(), name: p.name.trim() }),
                  name: p.name.trim(),
                  handicap: p.handicap,
                  tee: p.tee,
                })),
              { golfHandicap: true },
            );
            const golf = defaultGolf(
              input.holes,
              participants.map((p) => p.id),
            );
            // Carry the round forward. Participants keep their id when their name is
            // unchanged, so an existing card still belongs to them — re-saving setup to
            // fix a handicap, a tee or a course name has no business clearing it. Cards
            // are re-fitted to the hole count: a shortened round drops the holes that no
            // longer exist, a lengthened one gains empty ones.
            const prev = t.golf;
            if (prev) {
              const fit = (card: (number | null)[]) =>
                Array.from({ length: golf.holes }, (_, i) => card[i] ?? null);
              for (const p of participants)
                if (prev.scores[p.id]) golf.scores[p.id] = fit(prev.scores[p.id]);
              if (prev.pins) golf.pins = Array.from({ length: golf.holes }, (_, i) => prev.pins![i] ?? null);
              if (prev.bbb)
                golf.bbb = {
                  bingo: Array.from({ length: golf.holes }, (_, i) => prev.bbb!.bingo[i] ?? null),
                  bango: Array.from({ length: golf.holes }, (_, i) => prev.bbb!.bango[i] ?? null),
                  bongo: Array.from({ length: golf.holes }, (_, i) => prev.bbb!.bongo[i] ?? null),
                };
              if (prev.wolf)
                golf.wolf = {
                  partner: Array.from({ length: golf.holes }, (_, i) => prev.wolf!.partner[i] ?? null),
                };
            }
            if (input.pars && input.pars.length === golf.holes) golf.pars = input.pars;
            if (input.strokeIndex && input.strokeIndex.length === golf.holes)
              golf.strokeIndex = input.strokeIndex;
            if (input.startHole && input.startHole > 1) golf.startHole = input.startHole;
            if (input.courseName?.trim()) golf.courseName = input.courseName.trim();
            if (input.tees?.length) golf.tees = input.tees;
            if (input.segments?.length) golf.segments = input.segments;
            if (input.teams) golf.teams = true;
            return { ...t, participants, golf, matches: [], generated: true, updatedAt: Date.now() };
          }),
        }));
        pushReplace(id);
      },

      setParticipantPhoto: (id, participantId, photo) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) =>
            t.id === id
              ? {
                  ...t,
                  participants: t.participants.map((p) =>
                    p.id === participantId ? { ...p, photo: photo ?? undefined } : p,
                  ),
                  updatedAt: Date.now(),
                }
              : t,
          ),
        }));
        pushSettings(id);
      },

      setParticipantColor: (id, participantId, color) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) =>
            t.id === id
              ? {
                  ...t,
                  // choosing a color means "initials style" — the photo comes off
                  participants: t.participants.map((p) =>
                    p.id === participantId ? { ...p, color, photo: undefined } : p,
                  ),
                  updatedAt: Date.now(),
                }
              : t,
          ),
        }));
        pushSettings(id);
      },

      setGolfHandicap: (id, participantId, handicap) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) =>
            t.id === id
              ? {
                  ...t,
                  participants: t.participants.map((p) =>
                    p.id === participantId ? { ...p, handicap } : p,
                  ),
                  updatedAt: Date.now(),
                }
              : t,
          ),
        }));
        pushSettings(id);
      },

      setGolfTee: (id, participantId, tee) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) =>
            t.id === id
              ? {
                  ...t,
                  participants: t.participants.map((p) =>
                    p.id === participantId ? { ...p, tee } : p,
                  ),
                  updatedAt: Date.now(),
                }
              : t,
          ),
        }));
        pushSettings(id);
      },

      setGolfTees: (id, tees) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) =>
            t.id === id && t.golf ? { ...t, golf: { ...t.golf, tees }, updatedAt: Date.now() } : t,
          ),
        }));
        pushSettings(id);
      },

      setGolfScore: (id, participantId, hole, strokes) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id || !t.golf) return t;
            const scores = { ...t.golf.scores };
            const card = [...(scores[participantId] ?? Array(t.golf.holes).fill(null))];
            card[hole] = strokes;
            scores[participantId] = card;
            return { ...t, golf: { ...t.golf, scores }, updatedAt: Date.now() };
          }),
        }));
        pushPatch(id, { kind: "golfScore", participantId, hole, strokes });
      },

      setGolfHoleStat: (id, participantId, hole, patch) => {
        if (blocked(id)) return;
        let merged: HoleEntry | null = null;
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id || !t.golf) return t;
            const stats = { ...(t.golf.stats ?? {}) };
            const card = [...(stats[participantId] ?? Array(t.golf.holes).fill(null))];
            merged = { ...(card[hole] ?? {}), ...patch };
            card[hole] = merged;
            stats[participantId] = card;
            return { ...t, golf: { ...t.golf, stats }, updatedAt: Date.now() };
          }),
        }));
        if (merged) pushPatch(id, { kind: "golfStat", participantId, hole, entry: merged });
      },

      // Local-only: the green/pin location for GPS distance. It's course geometry,
      // not scoring, so it doesn't sync to live spectators — each device keeps its own.
      setGolfPin: (id, hole, coords) => {
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id || !t.golf) return t;
            const pins = [...(t.golf.pins ?? Array(t.golf.holes).fill(null))];
            pins[hole] = coords;
            return { ...t, golf: { ...t.golf, pins }, updatedAt: Date.now() };
          }),
        }));
      },

      setGolfGreens: (id, greens) => {
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id || !t.golf) return t;
            const prev = t.golf.greens ?? Array(t.golf.holes).fill(null);
            const next = Array.from(
              { length: t.golf.holes },
              (_, i) => greens[i] ?? prev[i] ?? null,
            );
            return { ...t, golf: { ...t.golf, greens: next }, updatedAt: Date.now() };
          }),
        }));
      },

      setGolfAward: (id, kind, hole, participantId) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id || !t.golf?.bbb) return t;
            const bbb = {
              bingo: [...t.golf.bbb.bingo],
              bango: [...t.golf.bbb.bango],
              bongo: [...t.golf.bbb.bongo],
            };
            bbb[kind][hole] = participantId;
            return { ...t, golf: { ...t.golf, bbb }, updatedAt: Date.now() };
          }),
        }));
        pushReplace(id);
      },

      // Vegas "pick per hole": record which player partners player 1 from this
      // hole on (0 = with P2, 1 = with P3, 2 = with P4; null clears the pick so
      // the previous pairing carries forward again).
      setVegasPairing: (id, hole, choice) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id || !t.golf) return t;
            const pairs = [...(t.golf.vegasPairs ?? Array(t.golf.holes).fill(null))];
            pairs[hole] = choice;
            return { ...t, golf: { ...t.golf, vegasPairs: pairs }, updatedAt: Date.now() };
          }),
        }));
        pushReplace(id);
      },

      setGolfWolf: (id, hole, partner) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id || !t.golf?.wolf) return t;
            const partnerArr = [...t.golf.wolf.partner];
            partnerArr[hole] = partner;
            return { ...t, golf: { ...t.golf, wolf: { partner: partnerArr } }, updatedAt: Date.now() };
          }),
        }));
        pushReplace(id);
      },

      generate: (id) => {
        snapshot(id, "Schedule regenerated");
        set((s) => ({
          tournaments: s.tournaments.map((t) =>
            t.id === id
              ? {
                  ...t,
                  // Draw order, not roster order: without this the schedule just reads down
                  // the list you typed, so whoever you enter together plays together every
                  // time. Regenerating gives a genuinely different draw.
                  matches: buildMatches(
                    t,
                    (t.config.randomDraw ?? true)
                      ? shuffled(t.participants.map((p) => p.id))
                      : t.participants.map((p) => p.id),
                  ),
                  ...(t.format === "score-challenge"
                    ? { scoreChallenge: t.scoreChallenge ?? { scores: {} } }
                    : {}),
                  ...(t.format === "ladder"
                    ? { ladder: t.ladder ?? { order: t.participants.map((p) => p.id) } }
                    : {}),
                  generated: true,
                  updatedAt: Date.now(),
                }
              : t,
          ),
        }));
        pushReplace(id);
      },

      generateNextRound: (id) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id) return t;
            const maxRound = t.matches.reduce((mx, m) => Math.max(mx, m.round), 0);
            const cur = t.matches.filter((m) => m.round === maxRound);
            const complete = cur.length > 0 && cur.every(isFinal);
            if (!complete) return t;
            const ids = t.participants.map((p) => p.id);

            if (t.format === "swiss") {
              if (maxRound >= t.config.rounds) return t;
              const ordered = computeStandings(t.participants, t.matches, t.config.tiebreaker, t.config.rankByWinPct).map(
                (r) => r.participantId,
              );
              const next = genSwissRound(ordered, t.matches, maxRound + 1, t.config.courts);
              return { ...t, matches: [...t.matches, ...next], updatedAt: Date.now() };
            }

            if (t.format === "mexicano") {
              if (maxRound >= t.config.rounds) return t;
              const ordered = pointsLeaderboard(t.participants, t.matches).map(
                (r) => r.participantId,
              );
              const next = genMexicanoRound(ordered, maxRound + 1, t.config.courts);
              return { ...t, matches: [...t.matches, ...next], updatedAt: Date.now() };
            }

            if (t.format === "kotc") {
              const standings = computeStandings(t.participants, t.matches, t.config.tiebreaker, t.config.rankByWinPct);
              const topWins = standings.reduce((mx, r) => Math.max(mx, r.wins), 0);
              if (topWins >= t.config.advanceCount) return t; // crown already won
              const g = genKotcNext(ids, t.matches);
              return g ? { ...t, matches: [...t.matches, g], updatedAt: Date.now() } : t;
            }

            return t;
          }),
        }));
        pushReplace(id);
      },

      resetToSetup: (id) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) =>
            t.id === id ? { ...t, matches: [], generated: false, updatedAt: Date.now() } : t,
          ),
        }));
        pushReplace(id);
      },

      setScore: (id, matchId, a, b) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id) return t;
            let matches = t.matches.map((m) =>
              m.id === matchId ? { ...m, scoreA: a, scoreB: b } : m,
            );
            const target = matches.find((m) => m.id === matchId);
            if (target && isFinalsPhase(target)) {
              matches = propagateBracket(matches.map((m) => ({ ...m })));
            }
            return resyncFinals({ ...t, matches, updatedAt: Date.now() });
          }),
        }));
        pushPatch(id, { kind: "matchScore", matchId, a, b });
      },

      // Live scoring: the game stays on court while points go in, and finishes
      // itself only when it's actually won (target reached, +2 if required).
      // A clock never ends it — the host does, via endMatch.
      scoreLive: (id, matchId, a, b) => {
        if (blocked(id)) return;
        let final = false;
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id) return t;
            final = isWon(a, b, t.config);
            let matches = t.matches.map((m) =>
              m.id === matchId ? { ...m, scoreA: a, scoreB: b, final } : m,
            );
            const target = matches.find((m) => m.id === matchId);
            // Only advance a bracket once the game is actually over.
            if (final && target && isFinalsPhase(target)) {
              matches = propagateBracket(matches.map((m) => ({ ...m })));
            }
            return resyncFinals({ ...t, matches, updatedAt: Date.now() });
          }),
        }));
        pushPatch(id, { kind: "matchScore", matchId, a, b, final });
      },

      // Tap +/- a point. Everything is derived from the CURRENT match inside the
      // setter, so two quick taps can't both compute from the same stale score.
      bumpScore: (id, matchId, side, delta) => {
        if (blocked(id)) return;
        let a: number | null = null;
        let b: number | null = null;
        let final = false;
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id) return t;
            const cur = t.matches.find((m) => m.id === matchId);
            if (!cur) return t;
            a = cur.scoreA;
            b = cur.scoreB;
            if (side === "A") a = Math.max(0, (a ?? 0) + delta);
            else b = Math.max(0, (b ?? 0) + delta);
            final = isWon(a, b, t.config);
            const fa = a;
            const fb = b;
            const fFinal = final;
            let matches = t.matches.map((m) =>
              m.id === matchId ? { ...m, scoreA: fa, scoreB: fb, final: fFinal } : m,
            );
            if (fFinal && isFinalsPhase(cur)) {
              matches = propagateBracket(matches.map((m) => ({ ...m })));
            }
            return resyncFinals({ ...t, matches, updatedAt: Date.now() });
          }),
        }));
        pushPatch(id, { kind: "matchScore", matchId, a, b, final });
      },

      // Host ends (or reopens) a game where it stands — time called, conceded,
      // or a format with no fixed target.
      endMatch: (id, matchId, final) => {
        if (blocked(id)) return;
        let a: number | null = null;
        let b: number | null = null;
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id) return t;
            let matches = t.matches.map((m) => {
              if (m.id !== matchId) return m;
              // Ending with a blank side scores it 0 rather than leaving a hole.
              const sa = final ? (m.scoreA ?? 0) : m.scoreA;
              const sb = final ? (m.scoreB ?? 0) : m.scoreB;
              a = sa;
              b = sb;
              return { ...m, scoreA: sa, scoreB: sb, final };
            });
            const target = matches.find((m) => m.id === matchId);
            if (final && target && isFinalsPhase(target)) {
              matches = propagateBracket(matches.map((m) => ({ ...m })));
            }
            return resyncFinals({ ...t, matches, updatedAt: Date.now() });
          }),
        }));
        pushPatch(id, { kind: "matchScore", matchId, a, b, final });
      },

      setMatchSides: (id, matchId, sideA, sideB) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) =>
            t.id === id
              ? {
                  ...t,
                  matches: t.matches.map((m) =>
                    m.id === matchId ? { ...m, sideA, sideB } : m,
                  ),
                  updatedAt: Date.now(),
                }
              : t,
          ),
        }));
        pushReplace(id);
      },

      generateFinals: (id) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id) return t;
            return { ...t, matches: [...t.matches.filter((m) => !isFinalsPhase(m)), ...buildFinals(t)], updatedAt: Date.now() };
          }),
        }));
        pushReplace(id);
      },

      clearFinals: (id) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) =>
            t.id === id
              ? { ...t, matches: t.matches.filter((m) => !isFinalsPhase(m)), updatedAt: Date.now() }
              : t,
          ),
        }));
        pushReplace(id);
      },

      // ---- Live shared scoring ----
      publishLive: async (id) => {
        const t = get().tournaments.find((x) => x.id === id);
        if (!t) return null;
        try {
          const res = await apiPublish(t);
          set((s) => ({
            tournaments: s.tournaments.map((x) =>
              x.id === id ? { ...x, liveCode: res.code, liveVersion: res.version } : x,
            ),
          }));
          return res.code;
        } catch {
          return null;
        }
      },

      joinLive: async (code) => {
        const upper = code.trim().toUpperCase();
        const remote = await fetchLive(upper);
        if (!remote) return null;
        const data = remote.data as Tournament;
        set((s) => {
          const existing = s.tournaments.find((x) => x.id === data.id);
          const linked: Tournament = {
            ...data,
            liveCode: upper,
            liveVersion: remote.version,
            // A brand-new import is a spectator (read-only). If this tournament is
            // already on this device — the host, or a returning viewer — keep its
            // existing role so the host opening their own share link isn't locked out.
            spectator: existing ? existing.spectator : true,
            updatedAt: Date.now(),
          };
          return {
            tournaments: existing
              ? s.tournaments.map((x) => (x.id === data.id ? linked : x))
              : [linked, ...s.tournaments],
          };
        });
        return data.id;
      },

      goOffline: (id) =>
        set((s) => ({
          tournaments: s.tournaments.map((x) =>
            x.id === id ? { ...x, liveCode: undefined, liveVersion: undefined } : x,
          ),
        })),

      applyRemote: (id, data, version) =>
        set((s) => ({
          tournaments: s.tournaments.map((x) =>
            x.id === id
              ? { ...data, id: x.id, liveCode: x.liveCode, liveVersion: version, spectator: x.spectator }
              : x,
          ),
        })),
      };
    },
    {
      name: "tournament-builder-v1",
      storage: createJSONStorage(() =>
        typeof localStorage !== "undefined" ? localStorage : (undefined as unknown as Storage),
      ),
      partialize: (s) => ({
        tournaments: s.tournaments,
        courses: s.courses,
        friends: s.friends,
        friendTombstones: s.friendTombstones,
        snapshot: s.snapshot,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

export function useTournament(id: string): Tournament | undefined {
  return useStore((s) => s.tournaments.find((t) => t.id === id));
}
