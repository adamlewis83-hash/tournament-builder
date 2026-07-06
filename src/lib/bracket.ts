import { Match, Phase } from "./types";
import { uid } from "./id";

function makeMatch(p: Partial<Match>): Match {
  return {
    id: uid(),
    phase: "winners",
    round: 1,
    order: 0,
    sideA: [],
    sideB: [],
    scoreA: null,
    scoreB: null,
    ...p,
  };
}

export function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return Math.max(2, p);
}

/** Standard bracket seed order for a bracket of size `p` (power of 2). 1-based seeds. */
export function seedOrder(p: number): number[] {
  let seeds = [1, 2];
  while (seeds.length < p) {
    const sum = seeds.length * 2 + 1;
    const next: number[] = [];
    for (const s of seeds) {
      next.push(s);
      next.push(sum - s);
    }
    seeds = next;
  }
  return seeds;
}

const decided = (m: Match) =>
  m.scoreA !== null && m.scoreB !== null && m.scoreA !== m.scoreB;

/**
 * Re-derive every downstream slot in an elimination bracket from the current scores.
 * Clears feeder-fed slots, then propagates winners/losers to a fixed point.
 * Also manages the double-elim grand-final reset match.
 */
export function propagateBracket(matches: Match[]): Match[] {
  const byId = new Map(matches.map((m) => [m.id, m]));
  // Which slots are fed by another match (derived) vs fixed seeds/byes.
  const fed = new Set<string>();
  for (const m of matches) {
    if (m.nextMatchId) fed.add(`${m.nextMatchId}:${m.nextSlot}`);
    if (m.loserNextMatchId) fed.add(`${m.loserNextMatchId}:${m.loserNextSlot}`);
  }
  // Clear derived slots so re-propagation is clean.
  for (const m of matches) {
    if (fed.has(`${m.id}:A`)) m.sideA = [];
    if (fed.has(`${m.id}:B`)) m.sideB = [];
  }

  // Fixed-point propagation (rounds resolve in order across passes).
  let changed = true;
  let guard = 0;
  while (changed && guard++ < 5000) {
    changed = false;
    for (const m of matches) {
      if (m.phase === "championship") continue; // reset handled below
      if (m.sideA.length === 0 || m.sideB.length === 0) continue;
      if (!decided(m)) continue;
      const aWin = (m.scoreA as number) > (m.scoreB as number);
      const winner = aWin ? m.sideA : m.sideB;
      const loser = aWin ? m.sideB : m.sideA;
      if (m.nextMatchId) {
        const n = byId.get(m.nextMatchId);
        if (n) {
          const slot = m.nextSlot === "A" ? "sideA" : "sideB";
          if (n[slot].join() !== winner.join()) {
            n[slot] = [...winner];
            changed = true;
          }
        }
      }
      if (m.loserNextMatchId) {
        const n = byId.get(m.loserNextMatchId);
        if (n) {
          const slot = m.loserNextSlot === "A" ? "sideA" : "sideB";
          if (n[slot].join() !== loser.join()) {
            n[slot] = [...loser];
            changed = true;
          }
        }
      }
    }
  }

  // Grand-final reset: only needed if the losers-bracket side (B) wins the grand final.
  const grandFinal = matches.find((m) => m.phase === "final");
  const reset = matches.find((m) => m.phase === "championship");
  if (grandFinal && reset) {
    if (decided(grandFinal) && (grandFinal.scoreB as number) > (grandFinal.scoreA as number)) {
      reset.sideA = [...grandFinal.sideA];
      reset.sideB = [...grandFinal.sideB];
    } else {
      reset.sideA = [];
      reset.sideB = [];
      reset.scoreA = null;
      reset.scoreB = null;
    }
  }
  return matches;
}

/** Champion id-list for an elimination/pool-bracket tournament, or null if undecided. */
export function bracketChampion(matches: Match[]): string[] | null {
  const reset = matches.find((m) => m.phase === "championship");
  const grandFinal = matches.find((m) => m.phase === "final");
  if (reset && reset.sideA.length && reset.sideB.length) {
    if (!decided(reset)) return null;
    return (reset.scoreA as number) > (reset.scoreB as number) ? reset.sideA : reset.sideB;
  }
  if (grandFinal) {
    if (!decided(grandFinal)) return null;
    // If the LB side won, a reset is required before a champion is crowned.
    if ((grandFinal.scoreB as number) > (grandFinal.scoreA as number)) return null;
    return grandFinal.sideA;
  }
  // Single elim: the match that feeds into nothing (the final), in the last winners round.
  // (Testing for "no feeders into it" instead would match FIRST-round games and crown a
  // champion the moment any opening match was scored.)
  const terminal = matches.filter((m) => m.phase === "winners" && !m.nextMatchId);
  const finalM = terminal.sort((a, b) => b.round - a.round)[0];
  if (!finalM || !decided(finalM)) return null;
  return (finalM.scoreA as number) > (finalM.scoreB as number) ? finalM.sideA : finalM.sideB;
}

function elimRoundLabel(matchesInRound: number): string {
  if (matchesInRound === 1) return "Final";
  if (matchesInRound === 2) return "Semifinals";
  if (matchesInRound === 4) return "Quarterfinals";
  if (matchesInRound === 8) return "Round of 16";
  if (matchesInRound === 16) return "Round of 32";
  return `Round of ${matchesInRound * 2}`;
}

/**
 * Build a single-elimination bracket from seeded ids (index 0 = top seed).
 * Byes are auto-resolved: a lone participant advances into the next round.
 */
export function genSingleElim(
  seedIds: string[],
  phase: Phase = "winners",
  opts?: { thirdPlace?: boolean },
): Match[] {
  return genSingleElimSides(
    seedIds.map((id) => [id]),
    phase,
    opts,
  );
}

/** Single elimination where each "seed" is a side that may hold multiple ids (doubles teams). */
export function genSingleElimSides(
  seedSides: string[][],
  phase: Phase = "winners",
  opts?: { thirdPlace?: boolean },
): Match[] {
  const S = seedSides.length;
  const P = nextPow2(S);
  const order = seedOrder(P);
  const sideForSeed = (n: number): string[] => (n <= S ? seedSides[n - 1] : []);
  const rounds = Math.round(Math.log2(P));

  const byRound: Match[][] = [];
  const r1: Match[] = [];
  for (let i = 0; i < P / 2; i++) {
    const aSide = sideForSeed(order[2 * i]);
    const bSide = sideForSeed(order[2 * i + 1]);
    r1.push(
      makeMatch({
        phase,
        round: 1,
        order: i,
        sideA: [...aSide],
        sideB: [...bSide],
        sideALabel: aSide.length ? undefined : "Bye",
        sideBLabel: bSide.length ? undefined : "Bye",
      }),
    );
  }
  byRound.push(r1);
  for (let r = 2; r <= rounds; r++) {
    const cnt = P / Math.pow(2, r);
    const arr: Match[] = [];
    for (let i = 0; i < cnt; i++) {
      arr.push(makeMatch({ phase, round: r, order: i, sideALabel: "TBD", sideBLabel: "TBD" }));
    }
    byRound.push(arr);
  }

  for (let r = 0; r < byRound.length - 1; r++) {
    byRound[r].forEach((m, i) => {
      const next = byRound[r + 1][Math.floor(i / 2)];
      m.nextMatchId = next.id;
      m.nextSlot = i % 2 === 0 ? "A" : "B";
    });
  }

  const all = byRound.flat();
  // round labels
  for (const m of all) {
    const cnt = byRound[m.round - 1].length;
    m.label = elimRoundLabel(cnt);
  }

  // Optional 3rd-place game: the two semifinal losers play off.
  if (opts?.thirdPlace && byRound.length >= 2) {
    const semis = byRound[byRound.length - 2];
    if (semis.length === 2) {
      const placement = makeMatch({
        phase: "placement",
        round: byRound.length,
        order: 1,
        label: "3rd-Place Game",
        sideALabel: "Semifinal loser",
        sideBLabel: "Semifinal loser",
      });
      semis[0].loserNextMatchId = placement.id;
      semis[0].loserNextSlot = "A";
      semis[1].loserNextMatchId = placement.id;
      semis[1].loserNextSlot = "B";
      all.push(placement);
    }
  }

  return collapseByes(all);
}

type SlotRef = { matchId: string; type: "win" | "lose" };

/**
 * Contract bye/walkover matches out of a bracket graph by re-linking feeders.
 * A slot is a structural BYE when it has no participants and nothing feeds it.
 * Pass-through matches are removed and their live feeder is re-pointed downstream;
 * the vanished loser link cascades further byes through the losers bracket.
 * Phases "final"/"championship" (grand final + reset) are never removed.
 */
function collapseByes(matches: Match[]): Match[] {
  const removed = new Set<string>();
  let changed = true;
  let guard = 0;
  while (changed && guard++ < 5000) {
    changed = false;
    const live = matches.filter((m) => !removed.has(m.id));
    const byId = new Map(live.map((m) => [m.id, m]));
    // feeder map: "matchId:slot" -> who feeds it
    const feeders = new Map<string, SlotRef>();
    for (const m of live) {
      if (m.nextMatchId && !removed.has(m.nextMatchId))
        feeders.set(`${m.nextMatchId}:${m.nextSlot}`, { matchId: m.id, type: "win" });
      if (m.loserNextMatchId && !removed.has(m.loserNextMatchId))
        feeders.set(`${m.loserNextMatchId}:${m.loserNextSlot}`, { matchId: m.id, type: "lose" });
    }
    const hasFeeder = (id: string, slot: "A" | "B") => feeders.has(`${id}:${slot}`);

    for (const m of live) {
      if (m.phase === "final" || m.phase === "championship" || m.phase === "placement") continue;
      const aBye = m.sideA.length === 0 && !hasFeeder(m.id, "A");
      const bBye = m.sideB.length === 0 && !hasFeeder(m.id, "B");
      if (!aBye && !bBye) continue;
      if (!m.nextMatchId) continue; // nowhere to forward; leave as-is

      if (aBye && bBye) {
        removed.add(m.id); // empty match — drop it, its links vanish (cascade)
        changed = true;
        continue;
      }
      const liveSlot: "A" | "B" = aBye ? "B" : "A";
      const liveIds = aBye ? m.sideB : m.sideA;
      const feeder = feeders.get(`${m.id}:${liveSlot}`);
      if (feeder) {
        const f = byId.get(feeder.matchId)!;
        if (feeder.type === "win") {
          f.nextMatchId = m.nextMatchId;
          f.nextSlot = m.nextSlot;
        } else {
          f.loserNextMatchId = m.nextMatchId;
          f.loserNextSlot = m.nextSlot;
        }
      } else {
        const target = byId.get(m.nextMatchId)!;
        if (m.nextSlot === "A") {
          target.sideA = [...liveIds];
          target.sideALabel = undefined;
        } else {
          target.sideB = [...liveIds];
          target.sideBLabel = undefined;
        }
      }
      removed.add(m.id);
      changed = true;
    }
  }
  return matches.filter((m) => !removed.has(m.id));
}

/**
 * Double elimination. Winners bracket + losers bracket + grand final (+ optional reset).
 * Returns all matches with winner/loser routing links.
 */
export function genDoubleElim(seedIds: string[]): Match[] {
  const S = seedIds.length;
  const P = nextPow2(S);
  const W = Math.round(Math.log2(P));
  const order = seedOrder(P);
  const idForSeed = (n: number): string | null => (n <= S ? seedIds[n - 1] : null);

  // ---- Winners bracket ----
  const wb: Match[][] = [];
  const r1: Match[] = [];
  for (let i = 0; i < P / 2; i++) {
    const aId = idForSeed(order[2 * i]);
    const bId = idForSeed(order[2 * i + 1]);
    r1.push(
      makeMatch({
        phase: "winners",
        round: 1,
        order: i,
        sideA: aId ? [aId] : [],
        sideB: bId ? [bId] : [],
        sideALabel: aId ? undefined : "Bye",
        sideBLabel: bId ? undefined : "Bye",
        label: `Winners ${elimRoundLabel(P / 2)}`,
      }),
    );
  }
  wb.push(r1);
  for (let r = 2; r <= W; r++) {
    const cnt = P / Math.pow(2, r);
    const arr: Match[] = [];
    for (let i = 0; i < cnt; i++) {
      arr.push(
        makeMatch({
          phase: "winners",
          round: r,
          order: i,
          sideALabel: "TBD",
          sideBLabel: "TBD",
          label: `Winners ${elimRoundLabel(cnt)}`,
        }),
      );
    }
    wb.push(arr);
  }
  // winners internal links
  for (let r = 0; r < W - 1; r++) {
    wb[r].forEach((m, i) => {
      const next = wb[r + 1][Math.floor(i / 2)];
      m.nextMatchId = next.id;
      m.nextSlot = i % 2 === 0 ? "A" : "B";
    });
  }

  // ---- Losers bracket ----
  const L = 2 * (W - 1);
  const lb: Match[][] = [];
  // compute counts
  const counts: number[] = [];
  let survivors = 0;
  for (let k = 1; k <= L; k++) {
    let c: number;
    if (k === 1) c = P / 4;
    else if (k % 2 === 0) c = survivors; // major intake (1:1 with survivors)
    else c = survivors / 2; // minor (halve)
    counts[k] = c;
    survivors = k % 2 === 0 || k === 1 ? c : c; // winners count == matches each round here
    // after minor round survivors halve already reflected in c; after major survivors == c
  }
  for (let k = 1; k <= L; k++) {
    const arr: Match[] = [];
    for (let i = 0; i < counts[k]; i++) {
      arr.push(
        makeMatch({
          phase: "losers",
          round: k,
          order: i,
          sideALabel: "TBD",
          sideBLabel: "TBD",
          label: `Losers Round ${k}`,
        }),
      );
    }
    lb.push(arr);
  }
  const lbRound = (k: number) => lb[k - 1]; // 1-based access

  // ---- Grand final (+ reset) ----
  const grandFinal = makeMatch({
    phase: "final",
    round: 1,
    order: 0,
    sideALabel: "Winners Champion",
    sideBLabel: "Losers Champion",
    label: "Grand Final",
  });
  const reset = makeMatch({
    phase: "championship",
    round: 2,
    order: 0,
    sideALabel: "Winners Champion",
    sideBLabel: "Losers Champion",
    label: "Grand Final (Reset)",
  });

  // ---- Routing ----
  // WB round 1 losers -> LB round 1
  if (L >= 1) {
    wb[0].forEach((m, i) => {
      const target = lbRound(1)[Math.floor(i / 2)];
      m.loserNextMatchId = target.id;
      m.loserNextSlot = i % 2 === 0 ? "A" : "B";
    });
  }
  // WB rounds 2..W losers -> major LB round 2*(r-1)
  for (let r = 2; r <= W; r++) {
    const k = 2 * (r - 1);
    wb[r - 1].forEach((m, i) => {
      const target = lbRound(k)[i];
      m.loserNextMatchId = target.id;
      m.loserNextSlot = "B";
    });
  }
  if (W === 1) {
    // P==2: the single winners match feeds the grand final directly.
    wb[0][0].nextMatchId = grandFinal.id;
    wb[0][0].nextSlot = "A";
    wb[0][0].loserNextMatchId = grandFinal.id;
    wb[0][0].loserNextSlot = "B";
  }

  // LB internal advancement
  for (let k = 1; k <= L; k++) {
    const round = lbRound(k);
    round.forEach((m, i) => {
      if (k === L) {
        m.nextMatchId = grandFinal.id;
        m.nextSlot = "B";
      } else if (k === 1) {
        // -> LB2 slot A (1:1)
        m.nextMatchId = lbRound(2)[i].id;
        m.nextSlot = "A";
      } else if (k % 2 === 0) {
        // major -> next minor, halving
        m.nextMatchId = lbRound(k + 1)[Math.floor(i / 2)].id;
        m.nextSlot = i % 2 === 0 ? "A" : "B";
      } else {
        // minor -> next major, slot A (1:1)
        m.nextMatchId = lbRound(k + 1)[i].id;
        m.nextSlot = "A";
      }
    });
  }
  // WB final winner -> grand final A (when there is a losers bracket)
  if (L >= 1) {
    wb[W - 1][0].nextMatchId = grandFinal.id;
    wb[W - 1][0].nextSlot = "A";
  }

  const all = [...wb.flat(), ...lb.flat(), grandFinal, reset];
  return collapseByes(all);
}
