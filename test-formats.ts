/* Headless glitch sweep: every format × many sizes × sports, through generate→score→result.
   Run: npx tsx test-formats.ts                                                            */
import { genSinglesRR, genDoublesRR, genSwissRound, genKotcNext, genMexicanoRound } from "./src/lib/schedule";
import { genSingleElim, genDoubleElim, propagateBracket, bracketChampion } from "./src/lib/bracket";
import { genRyder, genRyderSession, ryderScore, RyderSessionType } from "./src/lib/ryder";
import { computeStandings, pointsLeaderboard } from "./src/lib/standings";
import {
  defaultGolf,
  computeGolf,
  computeBbb,
  computeWolf,
  computeMixedOverall,
  holeStrokes,
} from "./src/lib/golf";
import { getResult } from "./src/lib/result";
import { getRanking, getFinalRows } from "./src/lib/records";
import {
  formatsForSport,
  SPORTS,
  GolfMode,
  Match,
  Participant,
  Tournament,
  TournamentConfig,
  SegmentFormat,
} from "./src/lib/types";
import { sportEmoji } from "./src/lib/sportEmoji";

let pass = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try {
    fn();
    pass++;
  } catch (e) {
    failures.push(`✗ ${name} — ${(e as Error).message}`);
  }
}
function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

function players(n: number, teams = false): Participant[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i + 1}`,
    handicap: i % 19,
    ...(teams ? { team: (i < n / 2 ? 0 : 1) as 0 | 1 } : {}),
  }));
}
function cfg(over: Partial<TournamentConfig> = {}): TournamentConfig {
  return {
    rounds: 3,
    courts: 2,
    pointsTo: 11,
    advanceCount: 4,
    poolCount: 2,
    bracketType: "single",
    tiebreaker: "diff",
    thirdPlace: false,
    teamNames: ["Red", "Blue"],
    ryderFoursomes: 0,
    ryderFourball: 0,
    ryderSingles: 0,
    golfMode: "stroke",
    ...over,
  };
}
function tour(over: Partial<Tournament>): Tournament {
  return {
    id: "t",
    name: "T",
    sport: "Pickleball",
    format: "round-robin",
    playStyle: "singles",
    participants: [],
    matches: [],
    config: cfg(),
    createdAt: 0,
    updatedAt: 0,
    generated: true,
    ...over,
  };
}

// deterministic pseudo-random so failures reproduce
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

function scorePlayable(matches: Match[]) {
  matches.forEach((m, i) => {
    if (m.sideA.length && m.sideB.length && m.scoreA === null && m.scoreB === null) {
      const aw = i % 4 !== 0; // mostly A wins, some B; never a tie (safe for brackets)
      m.scoreA = aw ? 21 : 10 + (i % 5);
      m.scoreB = aw ? 10 + (i % 5) : 21;
    }
  });
}
function validIds(matches: Match[], ids: Set<string>) {
  for (const m of matches) {
    for (const id of [...m.sideA, ...m.sideB]) {
      assert(ids.has(id), `match references unknown participant '${id}'`);
    }
  }
}
function playBracket(matches: Match[]): Match[] {
  let ms = matches.map((m) => ({ ...m }));
  for (let iter = 0; iter < 300; iter++) {
    let changed = false;
    ms = ms.map((m) => {
      if (m.sideA.length && m.sideB.length && m.scoreA === null) {
        changed = true;
        return { ...m, scoreA: 21, scoreB: 11 };
      }
      return m;
    });
    ms = propagateBracket(ms);
    if (!changed) return ms;
  }
  throw new Error("bracket did not converge (possible infinite loop)");
}

const COUNTS = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 16, 24];

// ---- Round robin (singles + doubles) ----
for (const n of COUNTS) {
  check(`round-robin singles n=${n}`, () => {
    const P = players(n);
    const ms = genSinglesRR(P.map((p) => p.id), 2, "rr");
    validIds(ms, new Set(P.map((p) => p.id)));
    scorePlayable(ms);
    const t = tour({ format: "round-robin", participants: P, matches: ms });
    const r = getResult(t);
    assert(r.complete && r.winner, "no winner after full RR");
    assert(getRanking(t).length === n, "ranking size mismatch");
    getFinalRows(t);
  });
  if (n >= 4)
    check(`round-robin doubles n=${n}`, () => {
      const P = players(n);
      const ms = genDoublesRR(P.map((p) => p.id), 3, 2);
      validIds(ms, new Set(P.map((p) => p.id)));
      scorePlayable(ms);
      const t = tour({ format: "round-robin", playStyle: "doubles", participants: P, matches: ms });
      getResult(t);
      getFinalRows(t);
    });
}

// ---- Americano ----
for (const n of COUNTS.filter((n) => n >= 4))
  check(`americano n=${n}`, () => {
    const P = players(n);
    const ms = genDoublesRR(P.map((p) => p.id), 4, 2);
    assert(ms.length > 0, "no americano matches");
    validIds(ms, new Set(P.map((p) => p.id)));
    scorePlayable(ms);
    const t = tour({ format: "americano", playStyle: "doubles", participants: P, matches: ms });
    const r = getResult(t);
    assert(r.complete && r.winner, "no americano winner");
    assert(pointsLeaderboard(P, ms)[0].pointsFor > 0, "leaderboard has no points");
  });

// ---- Mexicano (round-by-round from standings) ----
for (const n of COUNTS.filter((n) => n >= 4))
  check(`mexicano n=${n}`, () => {
    const P = players(n);
    const ids = P.map((p) => p.id);
    let ms = genMexicanoRound(ids, 1, 2);
    assert(ms.length > 0, "no mexicano round 1");
    for (let round = 2; round <= 3; round++) {
      scorePlayable(ms);
      const order = pointsLeaderboard(P, ms).map((s) => s.participantId);
      ms = [...ms, ...genMexicanoRound(order, round, 2)];
    }
    scorePlayable(ms);
    validIds(ms, new Set(ids));
    const t = tour({ format: "mexicano", participants: P, matches: ms, config: cfg({ rounds: 3 }) });
    const r = getResult(t);
    assert(r.complete && r.winner, "no mexicano winner");
  });

// ---- Swiss ----
for (const n of COUNTS)
  check(`swiss n=${n}`, () => {
    const P = players(n);
    const ids = P.map((p) => p.id);
    const rounds = Math.min(4, Math.max(1, n - 1));
    let ms = genSwissRound(ids, [], 1, 2);
    for (let r = 2; r <= rounds; r++) {
      scorePlayable(ms);
      const order = computeStandings(P, ms, "diff").map((s) => s.participantId);
      ms = [...ms, ...genSwissRound(order, ms, r, 2)];
    }
    scorePlayable(ms);
    validIds(ms, new Set(ids));
    const t = tour({ format: "swiss", participants: P, matches: ms, config: cfg({ rounds }) });
    const r = getResult(t);
    assert(r.complete && r.winner, "no swiss winner");
  });

// ---- King of the Court ----
for (const n of COUNTS)
  check(`kotc n=${n}`, () => {
    const P = players(n);
    const ids = P.map((p) => p.id);
    const advanceCount = 3;
    let ms: Match[] = [];
    const first = genKotcNext(ids, [], 1);
    if (first) ms.push(first);
    for (let guard = 0; guard < 500; guard++) {
      scorePlayable(ms);
      const standings = computeStandings(P, ms, "diff");
      const topWins = standings.reduce((mx, s) => Math.max(mx, s.wins), 0);
      if (topWins >= advanceCount) break;
      const g = genKotcNext(ids, ms, 1);
      if (!g) break;
      ms.push(g);
      assert(guard < 499, "kotc infinite loop");
    }
    validIds(ms, new Set(ids));
    const t = tour({ format: "kotc", participants: P, matches: ms, config: cfg({ advanceCount }) });
    getResult(t);
  });

// ---- Single & double elimination (incl. byes) ----
for (const n of COUNTS.filter((n) => n >= 2)) {
  for (const tp of [false, true]) {
    check(`single-elim n=${n} 3rd=${tp}`, () => {
      const P = players(n);
      const ms = genSingleElim(P.map((p) => p.id), "winners", { thirdPlace: tp });
      const played = playBracket(ms);
      validIds(played.filter((m) => m.sideA.length && m.sideB.length), new Set(P.map((p) => p.id)));
      const champ = bracketChampion(played);
      assert(champ && champ.length, `no champion (n=${n})`);
      const t = tour({ format: "single-elim", participants: P, matches: played });
      const r = getResult(t);
      assert(r.complete && r.winner, "getResult no winner");
      getRanking(t);
      getFinalRows(t);
    });
  }
  check(`double-elim n=${n}`, () => {
    const P = players(n);
    const ms = genDoubleElim(P.map((p) => p.id));
    const played = playBracket(ms);
    const champ = bracketChampion(played);
    assert(champ && champ.length, `no DE champion (n=${n})`);
    const t = tour({ format: "double-elim", participants: P, matches: played });
    assert(getResult(t).winner, "DE getResult no winner");
  });
}

// ---- Pool play → bracket ----
for (const n of [6, 8, 12, 16])
  check(`pool-bracket n=${n}`, () => {
    const P = players(n);
    const ids = P.map((p) => p.id);
    const poolCount = 2;
    const pools: string[][] = Array.from({ length: poolCount }, () => []);
    ids.forEach((id, i) => {
      const round = Math.floor(i / poolCount);
      const pos = i % poolCount;
      pools[round % 2 === 0 ? pos : poolCount - 1 - pos].push(id);
    });
    const ms: Match[] = [];
    pools.forEach((pool, pi) => ms.push(...genSinglesRR(pool, 2, "pool", `pool-${pi + 1}`)));
    scorePlayable(ms);
    validIds(ms, new Set(ids));
    // advancers → a knockout
    const t0 = tour({ format: "pool-bracket", participants: P, matches: ms });
    getResult(t0); // pools-only state
    const advancers = pools.flatMap((pool) => {
      const sub = computeStandings(P.filter((p) => pool.includes(p.id)), ms.filter((m) => pool.includes(m.sideA[0])), "diff");
      return sub.slice(0, 2).map((s) => s.participantId);
    });
    const bracket = genSingleElim(advancers, "winners", { thirdPlace: false });
    bracketChampion(playBracket(bracket));
  });

// ---- Ryder Cup (preset + captain sessions) ----
for (const n of [4, 6, 8, 12, 20]) {
  check(`ryder preset n=${n}`, () => {
    const P = players(n, true);
    const ms = genRyder(P, { foursomes: 1, fourball: 1, singles: 1 });
    assert(ms.length > 0, "no ryder matches");
    validIds(ms, new Set(P.map((p) => p.id)));
    ms.forEach((m, i) => {
      m.scoreA = i % 3 === 0 ? 1 : 0;
      m.scoreB = i % 3 === 0 ? 0 : 1;
    });
    const t = tour({ format: "ryder", participants: P, matches: ms, config: cfg({ ryderSingles: 1 }) });
    const sc = ryderScore(ms);
    assert(sc.total === ms.length, "ryder total mismatch");
    getResult(t);
  });
  for (const type of ["Foursomes", "Fourball", "Singles"] as RyderSessionType[])
    for (const shuffle of [false, true])
      check(`ryder captain ${type} shuffle=${shuffle} n=${n}`, () => {
        const P = players(n, true);
        const ms = genRyderSession(P, type, 1, shuffle);
        assert(ms.length > 0, `no ${type} matches`);
        validIds(ms, new Set(P.map((p) => p.id)));
        if (type === "Singles") assert(ms.every((m) => m.sideA.length === 1), "singles not 1v1");
        else assert(ms.every((m) => m.sideA.length === 2), "pairs not 2v2");
      });
}

// ---- Golf: every mode (individual) ----
const GOLF_MODES: GolfMode[] = ["stroke", "stableford", "skins", "scramble", "nassau", "bingo", "wolf"];
for (const holes of [9, 18])
  for (const mode of GOLF_MODES)
    check(`golf ${mode} ${holes}h`, () => {
      const P = players(4);
      const g = defaultGolf(holes, P.map((p) => p.id));
      P.forEach((p) => {
        g.scores[p.id] = g.pars.map((par) => par + Math.floor(rnd() * 3) - 1);
      });
      if (mode === "bingo")
        g.bbb = {
          bingo: g.pars.map((_, h) => P[h % 4].id),
          bango: g.pars.map((_, h) => P[(h + 1) % 4].id),
          bongo: g.pars.map((_, h) => P[(h + 2) % 4].id),
        };
      if (mode === "wolf") g.wolf = { partner: g.pars.map((_, h) => (h % 3 === 0 ? "lone" : P[h % 4].id)) };
      const t = tour({ format: "golf", participants: P, golf: g, config: cfg({ golfMode: mode }) });
      const rows =
        mode === "bingo" ? computeBbb(t) : mode === "wolf" ? computeWolf(t) : computeGolf(t, mode);
      assert(rows.length === 4, `${mode} rows mismatch`);
      const r = getResult(t);
      assert(r.complete, `${mode} not complete`);
      getFinalRows(t);
      getRanking(t);
    });

// ---- Golf: Build Your Own (individual + team) ----
for (const team of [false, true]) {
  const segFormats: SegmentFormat[] = team
    ? ["scramble", "bestball", "altshot", "stableford", "skins"]
    : ["stroke", "stableford", "skins", "bingo"];
  check(`golf mixed team=${team}`, () => {
    const P = team
      ? [
          { id: "p0", name: "Cody & Adam", handicap: 6, members: ["Cody", "Adam"] },
          { id: "p1", name: "Tom & Dad", handicap: 10, members: ["Tom", "Dad"] },
          { id: "p2", name: "Josh & Sam", handicap: 4, members: ["Josh", "Sam"] },
        ]
      : players(4);
    const g = defaultGolf(18, P.map((p) => p.id));
    if (team) g.teams = true;
    const chunk = Math.ceil(18 / segFormats.length);
    g.segments = segFormats.map((f, i) => ({ from: i * chunk + 1, to: Math.min((i + 1) * chunk, 18), format: f })).filter((s) => s.from <= s.to);
    P.forEach((p) => {
      g.scores[p.id] = g.pars.map((par) => par + Math.floor(rnd() * 3) - 1);
    });
    // bingo segment (individual only) needs awards
    if (!team)
      g.bbb = {
        bingo: g.pars.map((_, h) => P[h % P.length].id),
        bango: g.pars.map((_, h) => P[(h + 1) % P.length].id),
        bongo: g.pars.map((_, h) => P[(h + 2) % P.length].id),
      };
    const t = tour({ format: "golf", participants: P, golf: g, config: cfg({ golfMode: "mixed" }) });
    const overall = computeMixedOverall(t, g.segments);
    assert(overall.length === P.length, "mixed overall size mismatch");
    const r = getResult(t);
    assert(r.complete, "mixed not complete");
    getFinalRows(t);
  });
}

// ---- Sports: emoji + valid formats for every sport (and customs) ----
for (const sport of [...SPORTS, "Mario Kart", "Chili Cook-off", "Quidditch"]) {
  check(`sport "${sport}"`, () => {
    assert(typeof sportEmoji(sport) === "string" && sportEmoji(sport).length > 0, "no emoji");
    const fmts = formatsForSport(sport);
    assert(fmts.length > 0, "no formats");
    if (/golf/i.test(sport)) assert(fmts.includes("golf"), "golf sport missing golf format");
    else assert(fmts.includes("round-robin") && fmts.includes("americano"), "missing court formats");
  });
}

// ---- Semantic checks (would have caught past regressions) ----
check("handicap stroke allocation", () => {
  for (let si = 1; si <= 18; si++) assert(holeStrokes(18, si, 18) === 1, `hcp18 si${si} should be 1`);
  assert(holeStrokes(0, 1, 18) === 0, "hcp0 should give no strokes");
  assert(holeStrokes(20, 1, 18) === 2 && holeStrokes(20, 3, 18) === 1, "hcp20 should double the 2 hardest");
});

check("skins are net (handicap-adjusted)", () => {
  const P: Participant[] = [
    { id: "a", name: "Scratch", handicap: 0 },
    { id: "b", name: "Hacker", handicap: 18 },
  ];
  const g = defaultGolf(18, ["a", "b"]);
  P.forEach((p) => (g.scores[p.id] = g.pars.slice())); // both shoot gross par every hole
  const t = tour({ format: "golf", participants: P, golf: g, config: cfg({ golfMode: "skins" }) });
  const rows = computeGolf(t, "skins");
  const a = rows.find((r) => r.participantId === "a")!;
  const b = rows.find((r) => r.participantId === "b")!;
  // Gross is tied every hole, but B gets a stroke every hole → B wins all skins on net.
  assert(b.skins > 0 && a.skins === 0, `skins should use net: A=${a.skins} B=${b.skins}`);
});

check("stroke winner is by net not gross", () => {
  const P: Participant[] = [
    { id: "a", name: "Scratch", handicap: 0 },
    { id: "b", name: "Hacker", handicap: 36 },
  ];
  const g = defaultGolf(18, ["a", "b"]);
  g.scores["a"] = g.pars.map((p) => p + 1); // bogey golf gross
  g.scores["b"] = g.pars.map((p) => p + 2); // worse gross, but +36 strokes net
  const t = tour({ format: "golf", participants: P, golf: g, config: cfg({ golfMode: "stroke" }) });
  const r = getResult(t);
  assert(r.winner === "Hacker", `net should win: got ${r.winner}`);
});

// ---- Summary ----
console.log(`\n${"=".repeat(50)}`);
console.log(`PASS: ${pass}   FAIL: ${failures.length}`);
if (failures.length) {
  console.log("\nFAILURES:");
  failures.forEach((f) => console.log("  " + f));
  process.exit(1);
} else {
  console.log("✅ All format/sport scenarios passed.");
}
