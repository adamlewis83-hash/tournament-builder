"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  Course,
  Format,
  Match,
  Participant,
  PlayStyle,
  Tournament,
  TournamentConfig,
} from "./types";
import { uid } from "./id";
import { genDoublesRR, genSinglesRR, genSwissRound, genKotcNext, genMexicanoRound } from "./schedule";
import { genRyder, genRyderSession, RyderSessionType } from "./ryder";
import { matchStatus } from "./ryderGolf";
import { defaultGolf } from "./golf";
import {
  genDoubleElim,
  genSingleElim,
  genSingleElimSides,
  propagateBracket,
} from "./bracket";
import { computeStandings, pointsLeaderboard } from "./standings";
import { applyProfilePhoto } from "./profile";
import { publishLive as apiPublish, fetchLive, sendPatch, LivePatch } from "./live";

const DEFAULT_CONFIG: TournamentConfig = {
  rounds: 4,
  courts: 3,
  pointsTo: 11,
  timeLimitMin: 0,
  advanceCount: 16, // default: bracket the whole field (capped at player count); lower it for a top-N finals

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

interface State {
  tournaments: Tournament[];
  courses: Course[];
  hydrated: boolean;
  saveCourse: (input: Omit<Course, "id"> & { id?: string }) => string;
  removeCourse: (id: string) => void;
  createTournament: (input: CreateInput) => string;
  importTournament: (t: Tournament) => string;
  removeTournament: (id: string) => void;
  duplicateTournament: (id: string) => string | null;
  mergeCloud: (list: Tournament[]) => void;
  patchTournament: (id: string, patch: Partial<Tournament>) => void;
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
  removeRyderRound: (id: string, round: number) => void;
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
  setGolfAward: (
    id: string,
    kind: "bingo" | "bango" | "bongo",
    hole: number,
    participantId: string | null,
  ) => void;
  setGolfWolf: (id: string, hole: number, partner: string | "lone" | null) => void;
  generate: (id: string) => void;
  generateNextRound: (id: string) => void;
  resetToSetup: (id: string) => void;
  setScore: (id: string, matchId: string, a: number | null, b: number | null) => void;
  setMatchSides: (id: string, matchId: string, sideA: string[], sideB: string[]) => void;
  generateFinals: (id: string) => void;
  clearFinals: (id: string) => void;
  // Live shared scoring
  publishLive: (id: string) => Promise<string | null>;
  joinLive: (code: string) => Promise<string | null>;
  goOffline: (id: string) => void;
  applyRemote: (id: string, data: Tournament, version: number) => void;
}

const isFinalsPhase = (m: Match) =>
  m.phase === "winners" || m.phase === "losers" || m.phase === "final" || m.phase === "championship";

export function buildMatches(t: Tournament): Match[] {
  const ids = t.participants.map((p) => p.id);
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
      return genSingleElim(ids, "winners", { thirdPlace: t.config.thirdPlace });

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
      const pushReplace = (id: string) => {
        const t = get().tournaments.find((x) => x.id === id);
        if (t?.liveCode) pushPatch(id, { kind: "replace", data: { ...t } });
      };
      // Spectators (joined via live code) are read-only — their edits are ignored.
      const blocked = (id: string) => get().tournaments.find((x) => x.id === id)?.spectator === true;

      return {
      tournaments: [],
      courses: [],
      hydrated: false,

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

      patchTournament: (id, patch) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) =>
            t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t,
          ),
        }));
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
            const regParts: Participant[] = [];
            for (const r of regs) {
              const hit = manualByName.get(r.name.trim().toLowerCase());
              if (hit && !claimed.has(hit.id)) {
                // Merge onto the typed name rather than adding a second player.
                claimed.add(hit.id);
                if (r.handicap != null) hit.handicap = r.handicap;
                if (r.photo) hit.photo = r.photo;
                continue;
              }
              const old = prev.get(`reg-${r.id}`);
              const p: Participant = { id: `reg-${r.id}`, name: r.name };
              if (r.handicap != null) p.handicap = r.handicap;
              if (r.photo) p.photo = r.photo;
              if (old?.team !== undefined) p.team = old.team;
              if (old?.seed !== undefined) p.seed = old.seed;
              if (old?.tee !== undefined) p.tee = old.tee;
              regParts.push(p);
            }
            const participants = [...manual, ...regParts];
            if (JSON.stringify(participants) === JSON.stringify(t.participants)) return t;
            return { ...t, participants, updatedAt: Date.now() };
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
            const ryderGolf = {
              holes: course.holes,
              pars: course.pars,
              strokeIndex: course.strokeIndex,
              courseName: course.courseName,
              scores: {},
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
              const st = matchStatus(tWith, m);
              const scoreA = st.decided ? st.upA : null;
              const scoreB = st.decided ? st.upB : null;
              matches = tWith.matches.map((x) =>
                x.id === matchId ? { ...x, scoreA, scoreB } : x,
              );
            }
            return { ...tWith, matches, updatedAt: Date.now() };
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
            return { ...t, matches: [...t.matches, ...next], updatedAt: Date.now() };
          }),
        }));
        pushReplace(id);
      },

      removeRyderRound: (id, round) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) =>
            t.id === id
              ? { ...t, matches: t.matches.filter((m) => m.round !== round), updatedAt: Date.now() }
              : t,
          ),
        }));
        pushReplace(id);
      },

      setGolfPlayers: (id, input) => {
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
        pushReplace(id);
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
        pushReplace(id);
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
        pushReplace(id);
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
        pushReplace(id);
      },

      setGolfTees: (id, tees) => {
        if (blocked(id)) return;
        set((s) => ({
          tournaments: s.tournaments.map((t) =>
            t.id === id && t.golf ? { ...t, golf: { ...t.golf, tees }, updatedAt: Date.now() } : t,
          ),
        }));
        pushReplace(id);
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
        set((s) => ({
          tournaments: s.tournaments.map((t) =>
            t.id === id
              ? {
                  ...t,
                  matches: buildMatches(t),
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

            if (t.format === "mexicano") {
              if (maxRound >= t.config.rounds) return t;
              const ordered = pointsLeaderboard(t.participants, t.matches).map(
                (r) => r.participantId,
              );
              const next = genMexicanoRound(ordered, maxRound + 1, t.config.courts);
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
            return { ...t, matches, updatedAt: Date.now() };
          }),
        }));
        pushPatch(id, { kind: "matchScore", matchId, a, b });
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
      partialize: (s) => ({ tournaments: s.tournaments, courses: s.courses }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

export function useTournament(id: string): Tournament | undefined {
  return useStore((s) => s.tournaments.find((t) => t.id === id));
}
