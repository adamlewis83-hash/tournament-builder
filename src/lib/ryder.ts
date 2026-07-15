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

export type RyderSessionType = "Foursomes" | "Fourball" | "Singles";

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
  if (type === "Singles") {
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
  played: number;
  clinch: number; // points needed to win the cup
  status: "in-progress" | "a-wins" | "b-wins" | "tie";
}

export function ryderScore(matches: Match[]): RyderScore {
  const ryder = matches.filter((m) => m.phase === "ryder");
  let a = 0;
  let b = 0;
  let played = 0;
  for (const m of ryder) {
    if (!isFinal(m) || m.scoreA === null || m.scoreB === null) continue; // a live match hasn't earned a point yet
    played++;
    if (m.scoreA > m.scoreB) a += 1;
    else if (m.scoreB > m.scoreA) b += 1;
    else {
      a += 0.5;
      b += 0.5;
    }
  }
  const total = ryder.length;
  const clinch = total / 2 + 0.5;
  let status: RyderScore["status"] = "in-progress";
  if (a >= clinch) status = "a-wins";
  else if (b >= clinch) status = "b-wins";
  else if (played === total && total > 0) status = a > b ? "a-wins" : b > a ? "b-wins" : "tie";
  return { a, b, total, played, clinch, status };
}
