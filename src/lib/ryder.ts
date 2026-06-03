import { Match, Participant } from "./types";
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

/**
 * Build a Ryder-Cup-style schedule: a Fourball (pairs) session then a Singles
 * session, Team A (team 0) on side A vs Team B (team 1) on side B.
 */
export function genRyder(participants: Participant[]): Match[] {
  const A = participants.filter((p) => p.team === 0).map((p) => p.id);
  const B = participants.filter((p) => p.team === 1).map((p) => p.id);
  const matches: Match[] = [];

  const pairs = Math.min(Math.floor(A.length / 2), Math.floor(B.length / 2));
  for (let i = 0; i < pairs; i++) {
    matches.push(
      makeMatch({
        round: 1,
        order: i,
        label: "Fourball",
        sideA: [A[2 * i], A[2 * i + 1]],
        sideB: [B[2 * i], B[2 * i + 1]],
      }),
    );
  }

  const singles = Math.min(A.length, B.length);
  for (let i = 0; i < singles; i++) {
    matches.push(makeMatch({ round: 2, order: i, label: "Singles", sideA: [A[i]], sideB: [B[i]] }));
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
    if (m.scoreA === null || m.scoreB === null) continue;
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
