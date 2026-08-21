import { Match, Participant } from "./types";
import { isFinal } from "./score";
import { uid } from "./id";

function makeMatch(p: Partial<Match>): Match {
  return {
    id: uid(),
    phase: "ryder",
    round: 1,
    order: 0,
    sideA: [],
    sideB: [],
    scoreA: null,
    scoreB: null,
    ...p,
  };
}

export interface RyderSessions {
  foursomes: number;
  fourball: number;
  singles: number;
}

/**
 * Build a Ryder-Cup-style schedule from the chosen sessions. Foursomes and
 * Fourball are pairs sessions (2v2); Singles are 1v1. Team A (team 0) on side A
 * vs Team B (team 1) on side B. Each session is its own round.
 */
export function genRyder(participants: Participant[], sessions: RyderSessions): Match[] {
  const A = participants.filter((p) => p.team === 0).map((p) => p.id);
  const B = participants.filter((p) => p.team === 1).map((p) => p.id);
  const matches: Match[] = [];
  let round = 0;

  const pairsCount = Math.min(Math.floor(A.length / 2), Math.floor(B.length / 2));
  const addPairs = (label: string) => {
    if (pairsCount < 1) return;
    round++;
    for (let i = 0; i < pairsCount; i++) {
      matches.push(
        makeMatch({
          round,
          order: i,
          label,
          sideA: [A[2 * i], A[2 * i + 1]],
          sideB: [B[2 * i], B[2 * i + 1]],
        }),
      );
    }
  };

  for (let s = 0; s < Math.max(0, sessions.foursomes); s++) addPairs("Foursomes");
  for (let s = 0; s < Math.max(0, sessions.fourball); s++) addPairs("Fourball");

  const singlesCount = Math.min(A.length, B.length);
  for (let s = 0; s < Math.max(0, sessions.singles); s++) {
    round++;
    for (let i = 0; i < singlesCount; i++) {
      matches.push(makeMatch({ round, order: i, label: "Singles", sideA: [A[i]], sideB: [B[i]] }));
    }
  }
  return matches;
}

export type RyderSessionType =
  | "Foursomes"
  | "Fourball"
  | "Best Ball"
  | "Shamble"
  | "Scramble"
  | "Vegas"
  | "Singles"
  | "Team Scramble"
  | "Team Alt Shot"
  | "Team Stableford";

// 4v4-style sessions: the whole team plays as one unit — a single match per session.
export const TEAM_SESSION_TYPES: RyderSessionType[] = [
  "Team Scramble",
  "Team Alt Shot",
  "Team Stableford",
];

export const RYDER_SESSION_BLURBS: Record<RyderSessionType, string> = {
  Foursomes:
    "Alternate shot, 2v2 — partners share one ball and take turns hitting it. One team score per hole, net match play.",
  Fourball:
    "Best ball, 2v2 — everyone plays their own ball; each pair counts its best net score per hole.",
  "Best Ball":
    "Everyone plays their own ball; the pair's best net score counts each hole (same game as Fourball).",
  Shamble:
    "Everyone tees off, the pair picks the best drive, then each plays their own ball in from there — best net counts.",
  Scramble:
    "2v2 — everyone hits, the pair plays its next shot from the best ball, and repeats. One team score per hole.",
  Vegas:
    "2v2, played gross — each pair's two scores combine into one number, low ball first (4 & 5 → 45). The lower number takes the DIFFERENCE in points each hole (45 vs 55 pays 10); most points wins the session.",
  Singles: "Head-to-head 1v1, net match play.",
  "Team Scramble":
    "The whole team as one unit — everyone hits, play the best ball, repeat. One team score, one match, one result.",
  "Team Alt Shot":
    "The whole team shares one ball, rotating through the batting order shot by shot. One match, one result.",
  "Team Stableford":
    "Everyone plays their own ball; each hole the team's combined Stableford points decide who wins it. One match, one result.",
};

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build ONE Ryder session as a round, captain-style. In-order pairings by
 * default (then adjust with the pairing editor); `shuffle` randomizes them.
 */
export function genRyderSession(
  participants: Participant[],
  type: RyderSessionType,
  round: number,
  shuffle = false,
): Match[] {
  let A = participants.filter((p) => p.team === 0).map((p) => p.id);
  let B = participants.filter((p) => p.team === 1).map((p) => p.id);
  if (shuffle) {
    A = shuffled(A);
    B = shuffled(B);
  }
  const matches: Match[] = [];
  if (TEAM_SESSION_TYPES.includes(type)) {
    // Whole-team session: everyone plays, one match, one cup point on the line.
    matches.push(makeMatch({ round, order: 0, label: type, sideA: A, sideB: B }));
  } else if (type === "Singles") {
    const n = Math.min(A.length, B.length);
    for (let i = 0; i < n; i++) {
      matches.push(makeMatch({ round, order: i, label: "Singles", sideA: [A[i]], sideB: [B[i]] }));
    }
  } else {
    const pairs = Math.min(Math.floor(A.length / 2), Math.floor(B.length / 2));
    for (let i = 0; i < pairs; i++) {
      matches.push(
        makeMatch({
          round,
          order: i,
          label: type,
          sideA: [A[2 * i], A[2 * i + 1]],
          sideB: [B[2 * i], B[2 * i + 1]],
        }),
      );
    }
  }
  return matches;
}

export interface RyderScore {
  a: number;
  b: number;
  total: number;
  played: number; // points decided so far, in the same currency as `total`
  clinch: number; // points needed to win the cup
  status: "in-progress" | "a-wins" | "b-wins" | "tie";
}

export type RyderScoring = "match" | "session" | "round18";

/** How each scoring mode reads to a host — shared so setup and the cup scoreboard
 *  describe the modes in the same words. */
export const CUP_SCORING_LABELS: Record<RyderScoring, { label: string; hint: string }> = {
  match: { label: "1 point per match", hint: "classic Ryder Cup — every match is its own point" },
  session: { label: "1 point per session", hint: "the session's matches split one point (2 matches → ½ each)" },
  round18: { label: "1 point per 18 holes", hint: "sessions on the same 18 share one point between them" },
};

// Points can be fractional once a session's point is split across its matches,
// so every comparison here is float-safe.
const EPS = 1e-9;

/**
 * What each match is worth, by match id, under the cup's scoring mode.
 *
 *   "match"   — every match is a point of its own (classic Ryder Cup).
 *   "session" — each session (round) is one point, split evenly across its matches.
 *   "round18" — each 18 holes is one point: a session's matches split the point,
 *               then divide again by how many sessions make up an 18 (two 9-hole
 *               sessions, three 6-hole ones).
 *
 * round18 divides by the *planned* sessions per 18 rather than by the sessions
 * currently on the board — that is what keeps a point won on the front nine worth
 * the same after the back nine is added. Weighting by what happened to exist at
 * the time meant a captain-built cup silently re-priced points already earned.
 *
 * `holesOfRound` reports the holes a given session plays, so a cup whose sessions
 * sit on different cards (a nine here, a full 18 there) weighs each one correctly.
 */
export function matchWeights(
  matches: Match[],
  scoring: RyderScoring = "match",
  sessionHoles = 18,
  holesOfRound?: (round: number) => number,
  pointsPerSession?: number,
): Map<string, number> {
  const ryder = matches.filter((m) => m.phase === "ryder");
  const perRound = new Map<number, number>();
  for (const m of ryder) perRound.set(m.round, (perRound.get(m.round) ?? 0) + 1);

  // An explicit points-per-session number is the whole rule: that many points are on
  // the line each session, split evenly across its matches. The three presets are the
  // same idea with the number derived instead of typed.
  const typed =
    pointsPerSession != null && Number.isFinite(pointsPerSession) && pointsPerSession > 0
      ? pointsPerSession
      : null;

  const out = new Map<string, number>();
  for (const m of ryder) {
    const n = perRound.get(m.round) ?? 1;
    if (typed != null) {
      out.set(m.id, typed / n);
      continue;
    }
    if (scoring === "match") {
      out.set(m.id, 1);
      continue;
    }
    if (scoring === "session") {
      out.set(m.id, 1 / n);
      continue;
    }
    const h = holesOfRound?.(m.round) ?? sessionHoles;
    const holes = Number.isFinite(h) && h > 0 ? h : 18;
    const per18 = holes < 18 ? Math.max(1, Math.round(18 / holes)) : 1;
    out.set(m.id, 1 / (n * per18));
  }
  return out;
}

/** Points on the line in one session, however the cup expresses it. */
export function pointsOnTheLine(
  matches: Match[],
  round: number,
  scoring: RyderScoring = "match",
  sessionHoles = 18,
  holesOfRound?: (round: number) => number,
  pointsPerSession?: number,
): number {
  const w = matchWeights(matches, scoring, sessionHoles, holesOfRound, pointsPerSession);
  return matches
    .filter((m) => m.phase === "ryder" && m.round === round)
    .reduce((sum, m) => sum + (w.get(m.id) ?? 0), 0);
}

export function ryderScore(
  matches: Match[],
  scoring: RyderScoring = "match",
  sessionHoles = 18,
  holesOfRound?: (round: number) => number,
  pointsPerSession?: number,
): RyderScore {
  const ryder = matches.filter((m) => m.phase === "ryder");
  const weights = matchWeights(matches, scoring, sessionHoles, holesOfRound, pointsPerSession);
  const weightOf = (m: Match) => weights.get(m.id) ?? 0;

  let a = 0;
  let b = 0;
  let played = 0;
  for (const m of ryder) {
    if (!isFinal(m) || m.scoreA === null || m.scoreB === null) continue; // a live match hasn't earned a point yet
    const w = weightOf(m);
    played += w;
    if (m.scoreA > m.scoreB) a += w;
    else if (m.scoreB > m.scoreA) b += w;
    else {
      a += w / 2;
      b += w / 2;
    }
  }

  // `played` and `total` have to be counted the same way, or a cup ends early:
  // counting matches played against a total measured in session points declared
  // a 2-session cup over — "Tie" — the moment the first session's 2 matches were in.
  const total = ryder.reduce((s, m) => s + weightOf(m), 0);
  // You clinch as soon as you are past half by the smallest step the cup can
  // move, which is half a match's value — a halved match splits it.
  const step = ryder.length ? Math.min(...ryder.map(weightOf)) / 2 : 0.5;
  const clinch = total / 2 + step;
  let status: RyderScore["status"] = "in-progress";
  if (a >= clinch - EPS) status = "a-wins";
  else if (b >= clinch - EPS) status = "b-wins";
  else if (total > EPS && played >= total - EPS)
    status = a > b + EPS ? "a-wins" : b > a + EPS ? "b-wins" : "tie";
  return { a, b, total, played, clinch, status };
}
