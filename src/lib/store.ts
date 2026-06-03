"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  Format,
  Match,
  Participant,
  PlayStyle,
  Tournament,
  TournamentConfig,
} from "./types";
import { uid } from "./id";
import { genDoublesRR, genSinglesRR, genSwissRound, genKotcNext } from "./schedule";
import { genRyder } from "./ryder";
import { defaultGolf } from "./golf";
import {
  genDoubleElim,
  genSingleElim,
  genSingleElimSides,
  propagateBracket,
} from "./bracket";
import { computeStandings } from "./standings";

const DEFAULT_CONFIG: TournamentConfig = {
  rounds: 4,
  courts: 3,
  pointsTo: 11,
  advanceCount: 4,
  poolCount: 2,
  bracketType: "single",
  tiebreaker: "diff",
  thirdPlace: false,
  teamNames: ["Team A", "Team B"],
  golfMode: "stroke",
};

export interface CreateInput {
  name: string;
  sport: string;
  format: Format;
  playStyle: PlayStyle;
  config?: Partial<TournamentConfig>;
}

interface State {
  tournaments: Tournament[];
  hydrated: boolean;
  createTournament: (input: CreateInput) => string;
  importTournament: (t: Tournament) => string;
  removeTournament: (id: string) => void;
  duplicateTournament: (id: string) => string | null;
  patchTournament: (id: string, patch: Partial<Tournament>) => void;
  setParticipants: (id: string, names: string[]) => void;
  setRyderTeams: (id: string, teamA: string[], teamB: string[], teamNames: [string, string]) => void;
  setGolfPlayers: (id: string, players: { name: string; handicap: number }[], holes: number) => void;
  setGolfScore: (id: string, participantId: string, hole: number, strokes: number | null) => void;
  generate: (id: string) => void;
  generateNextRound: (id: string) => void;
  resetToSetup: (id: string) => void;
  setScore: (id: string, matchId: string, a: number | null, b: number | null) => void;
  generateFinals: (id: string) => void;
  clearFinals: (id: string) => void;
}

const isFinalsPhase = (m: Match) =>
  m.phase === "winners" || m.phase === "losers" || m.phase === "final" || m.phase === "championship";

function buildMatches(t: Tournament): Match[] {
  const ids = t.participants.map((p) => p.id);
  const { rounds, courts, poolCount } = t.config;

  switch (t.format) {
    case "round-robin":
      return t.playStyle === "doubles"
        ? genDoublesRR(ids, rounds, courts)
        : genSinglesRR(ids, courts, "rr");

    case "swiss":
      return genSwissRound(ids, [], 1, courts);

    case "kotc": {
      const g = genKotcNext(ids, [], 1);
      return g ? [g] : [];
    }

    case "single-elim":
      return genSingleElim(ids, "winners", { thirdPlace: t.config.thirdPlace });

    case "double-elim":
      return genDoubleElim(ids);

    case "ryder":
      return genRyder(t.participants);

    case "golf":
      return []; // golf uses the scorecard model, not matches

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
    (set, get) => ({
      tournaments: [],
      hydrated: false,

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

      removeTournament: (id) =>
        set((s) => ({ tournaments: s.tournaments.filter((t) => t.id !== id) })),

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

      patchTournament: (id, patch) =>
        set((s) => ({
          tournaments: s.tournaments.map((t) =>
            t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t,
          ),
        })),

      setParticipants: (id, names) =>
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id) return t;
            const existing = new Map(t.participants.map((p) => [p.name.toLowerCase(), p]));
            const participants: Participant[] = names
              .map((n) => n.trim())
              .filter(Boolean)
              .map((n) => existing.get(n.toLowerCase()) ?? { id: uid(), name: n });
            return { ...t, participants, updatedAt: Date.now() };
          }),
        })),

      setRyderTeams: (id, teamA, teamB, teamNames) =>
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id) return t;
            const existing = new Map(t.participants.map((p) => [p.name.toLowerCase(), p]));
            const build = (names: string[], team: 0 | 1): Participant[] =>
              names
                .map((n) => n.trim())
                .filter(Boolean)
                .map((n) => ({ ...(existing.get(n.toLowerCase()) ?? { id: uid(), name: n }), team }));
            const participants = [...build(teamA, 0), ...build(teamB, 1)];
            return {
              ...t,
              participants,
              config: { ...t.config, teamNames },
              updatedAt: Date.now(),
            };
          }),
        })),

      setGolfPlayers: (id, players, holes) =>
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id) return t;
            const existing = new Map(t.participants.map((p) => [p.name.toLowerCase(), p]));
            const participants: Participant[] = players
              .filter((p) => p.name.trim())
              .map((p) => ({
                ...(existing.get(p.name.trim().toLowerCase()) ?? { id: uid(), name: p.name.trim() }),
                name: p.name.trim(),
                handicap: p.handicap,
              }));
            const golf = defaultGolf(
              holes,
              participants.map((p) => p.id),
            );
            return { ...t, participants, golf, matches: [], generated: true, updatedAt: Date.now() };
          }),
        })),

      setGolfScore: (id, participantId, hole, strokes) =>
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id || !t.golf) return t;
            const scores = { ...t.golf.scores };
            const card = [...(scores[participantId] ?? Array(t.golf.holes).fill(null))];
            card[hole] = strokes;
            scores[participantId] = card;
            return { ...t, golf: { ...t.golf, scores }, updatedAt: Date.now() };
          }),
        })),

      generate: (id) =>
        set((s) => ({
          tournaments: s.tournaments.map((t) =>
            t.id === id ? { ...t, matches: buildMatches(t), generated: true, updatedAt: Date.now() } : t,
          ),
        })),

      generateNextRound: (id) =>
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id) return t;
            const maxRound = t.matches.reduce((mx, m) => Math.max(mx, m.round), 0);
            const cur = t.matches.filter((m) => m.round === maxRound);
            const complete =
              cur.length > 0 && cur.every((m) => m.scoreA !== null && m.scoreB !== null);
            if (!complete) return t;
            const ids = t.participants.map((p) => p.id);

            if (t.format === "swiss") {
              if (maxRound >= t.config.rounds) return t;
              const ordered = computeStandings(t.participants, t.matches, t.config.tiebreaker).map(
                (r) => r.participantId,
              );
              const next = genSwissRound(ordered, t.matches, maxRound + 1, t.config.courts);
              return { ...t, matches: [...t.matches, ...next], updatedAt: Date.now() };
            }

            if (t.format === "kotc") {
              const standings = computeStandings(t.participants, t.matches, t.config.tiebreaker);
              const topWins = standings.reduce((mx, r) => Math.max(mx, r.wins), 0);
              if (topWins >= t.config.advanceCount) return t; // crown already won
              const g = genKotcNext(ids, t.matches);
              return g ? { ...t, matches: [...t.matches, g], updatedAt: Date.now() } : t;
            }

            return t;
          }),
        })),

      resetToSetup: (id) =>
        set((s) => ({
          tournaments: s.tournaments.map((t) =>
            t.id === id ? { ...t, matches: [], generated: false, updatedAt: Date.now() } : t,
          ),
        })),

      setScore: (id, matchId, a, b) =>
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
            return { ...t, matches, updatedAt: Date.now() };
          }),
        })),

      generateFinals: (id) =>
        set((s) => ({
          tournaments: s.tournaments.map((t) => {
            if (t.id !== id) return t;
            const baseMatches = t.matches.filter((m) => !isFinalsPhase(m));

            let finals: Match[] = [];
            if (t.format === "round-robin") {
              const standings = computeStandings(t.participants, baseMatches, t.config.tiebreaker);
              const n = Math.min(t.config.advanceCount, standings.length);
              const seedIds = standings.slice(0, n).map((r) => r.participantId);
              if (t.playStyle === "doubles") {
                // Pair best with worst of the advancing group: (1&N) vs (2&N-1) ...
                const sides: string[][] = [];
                for (let i = 0; i < Math.floor(seedIds.length / 2); i++) {
                  sides.push([seedIds[i], seedIds[seedIds.length - 1 - i]]);
                }
                finals = genSingleElimSides(sides, "winners", { thirdPlace: t.config.thirdPlace });
              } else {
                finals = genSingleElim(seedIds, "winners", { thirdPlace: t.config.thirdPlace });
              }
            } else if (t.format === "pool-bracket") {
              // Seed across pools: all pool winners first, then runners-up, etc.
              const poolIds = Array.from(new Set(baseMatches.map((m) => m.poolId).filter(Boolean))) as string[];
              const perPool = poolIds.map((pid) =>
                computeStandings(
                  t.participants,
                  baseMatches.filter((m) => m.poolId === pid),
                  t.config.tiebreaker,
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
                  : genSingleElim(seedIds, "winners", { thirdPlace: t.config.thirdPlace });
            }
            return { ...t, matches: [...baseMatches, ...finals], updatedAt: Date.now() };
          }),
        })),

      clearFinals: (id) =>
        set((s) => ({
          tournaments: s.tournaments.map((t) =>
            t.id === id
              ? { ...t, matches: t.matches.filter((m) => !isFinalsPhase(m)), updatedAt: Date.now() }
              : t,
          ),
        })),
    }),
    {
      name: "tournament-builder-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ tournaments: s.tournaments }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

export function useTournament(id: string): Tournament | undefined {
  return useStore((s) => s.tournaments.find((t) => t.id === id));
}
