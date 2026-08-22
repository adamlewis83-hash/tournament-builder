/* Headless glitch sweep: every format × many sizes × sports, through generate→score→result.
   Run: npx tsx test-formats.ts                                                            */
import { genSinglesRR, genDoublesRR, genSwissRound, genKotcNext, genMexicanoRound } from "./src/lib/schedule";
import { genSingleElim, genSingleElimSides, genDoubleElim, propagateBracket, bracketChampion } from "./src/lib/bracket";
import { buildMatches, buildFinals, resyncFinals, shuffled } from "./src/lib/store";
import {
  genRyder,
  genRyderSession,
  matchWeights,
  pointsOnTheLine,
  removeRyderRoundFrom,
  reorderRyderRounds,
  TEAM_SESSION_TYPES,
  ryderScore,
  RyderScoring,
  RyderSessionType,
  RYDER_SESSION_BLURBS,
} from "./src/lib/ryder";
import {
  cupVegasRules,
  entitiesForMatch,
  holeNets,
  matchOutcome,
  methodForMatch,
  methodIsChoosable,
} from "./src/lib/ryderGolf";
import { computeStandings, pointsLeaderboard } from "./src/lib/standings";
import {
  defaultGolf,
  computeGolf,
  computeGolfMatch,
  computeVegas,
  computeVegasLedger,
  vegasIsPerPlayer,
  golfMatchAvailable,
  golfScoringOptions,
  vegasNumber,
  vegasTeamsForHole,
  computeBbb,
  computeWolf,
  computeMixedOverall,
  holeStrokes,
  courseHandicap,
  effectiveHandicap,
} from "./src/lib/golf";
import { getResult } from "./src/lib/result";
import { isFinal, isWon, winMargin } from "./src/lib/score";
import { getRanking, getFinalRows, getPlacements } from "./src/lib/records";
import { scoreCount, scoreSummary } from "./src/lib/snapshot";
import {
  formatsForSport,
  SPORTS,
  GolfMode,
  Match,
  Participant,
  Tournament,
  TournamentConfig,
  SegmentFormat,
  PlayStyle,
  Format,
  ALL_FORMATS,
  playStylesForFormat,
  CUP_VEGAS_DEFAULTS,
  VEGAS_BASIC,
  VEGAS_DEFAULTS,
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
    timeLimitMin: 0,
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
    scoreLowWins: false,
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

// Party sizes, plus the awkward ones: 30 and 33 are not powers of two (bracket byes)
// and odd counts leave someone sitting out each round.
const COUNTS = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 16, 24, 30, 33];

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

// Fixed-doubles King of the Court: each side is a fixed PAIR (one unit id with
// two members). The winning pair stays on, the losing pair rotates out, and a
// champion pair is crowned — proving the option works end to end.
for (const pairCount of [3, 4, 6])
  check(`kotc fixed-doubles pairs=${pairCount}`, () => {
    const P: Participant[] = Array.from({ length: pairCount }, (_, i) => ({
      id: `u${i}`,
      name: `Pair ${i + 1}`,
      members: [`P${i * 2 + 1}`, `P${i * 2 + 2}`],
    }));
    const ids = P.map((p) => p.id);
    const advanceCount = 3;
    const ms: Match[] = [];
    const first = genKotcNext(ids, [], 1);
    if (first) ms.push(first);
    for (let guard = 0; guard < 500; guard++) {
      scorePlayable(ms);
      // every game is a pair vs a pair — one unit id per side
      ms.forEach((m) => assert(m.sideA.length === 1 && m.sideB.length === 1, "kotc side not a single unit"));
      const standings = computeStandings(P, ms, "diff");
      if (standings.reduce((mx, s) => Math.max(mx, s.wins), 0) >= advanceCount) break;
      const g = genKotcNext(ids, ms, 1);
      if (!g) break;
      ms.push(g);
      assert(guard < 499, "kotc fixed-doubles infinite loop");
    }
    validIds(ms, new Set(ids));
    const t = tour({
      format: "kotc",
      playStyle: "doubles-fixed",
      participants: P,
      matches: ms,
      config: cfg({ advanceCount }),
    });
    const r = getResult(t);
    assert(r.complete && !!r.winner, "no champion pair crowned");
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
    if (/golf/i.test(sport))
      assert(fmts.includes("golf"), "golf sport missing golf format");
    else
      // Universal base every non-golf sport must offer.
      assert(
        fmts.includes("round-robin") && fmts.includes("single-elim") && fmts.includes("custom"),
        "missing base formats",
      );
  });
}

// ---- Specialist formats are only offered where they fit ----
const SPECIALIST_FIT: Record<string, { has: Format[]; lacks: Format[] }> = {
  Pickleball: { has: ["americano", "mexicano", "kotc"], lacks: ["score-challenge"] },
  "Pop-A-Shot": { has: ["score-challenge"], lacks: ["americano", "mexicano", "kotc"] },
  Bowling: { has: ["score-challenge"], lacks: ["americano", "kotc"] },
  Basketball: { has: ["kotc"], lacks: ["americano", "mexicano"] },
  Chess: { has: [], lacks: ["americano", "mexicano", "kotc", "score-challenge"] },
};
for (const [sport, { has, lacks }] of Object.entries(SPECIALIST_FIT))
  check(`format fit for "${sport}"`, () => {
    const fmts = formatsForSport(sport);
    for (const f of has) assert(fmts.includes(f), `${sport} should offer ${f}`);
    for (const f of lacks) assert(!fmts.includes(f), `${sport} should NOT offer ${f}`);
  });

// ---- Semantic checks (would have caught past regressions) ----
// bracketChampion once matched matches with no FEEDERS (first-round games) instead of
// no NEXT match (the final) — crowning a champion the moment an opening game was scored.
check("no premature champion from a first-round result", () => {
  const P = players(8);
  const ms = genSingleElim(P.map((p) => p.id), "winners", {});
  const r1 = ms.filter((m) => m.round === 1 && m.sideA.length && m.sideB.length);
  assert(r1.length > 0, "no round-1 matches");
  r1[0].scoreA = 11;
  r1[0].scoreB = 5;
  const t = tour({ format: "single-elim", participants: P, matches: ms });
  const r = getResult(t);
  assert(!r.complete && !r.winner, "champion crowned from a first-round result");
  assert(bracketChampion(ms) === null, "bracketChampion returned a champion prematurely");
});

check("course handicap math (tees)", () => {
  // USGA: round(index × slope/113 + (rating − par))
  assert(courseHandicap(8.4, { name: "Blue", rating: 71.8, slope: 130, par: 72 }) === 9, "8.4 @ 130/71.8/72 should be 9");
  assert(courseHandicap(10, { name: "Std", rating: 72, slope: 113, par: 72 }) === 10, "standard slope keeps the index");
  assert(courseHandicap(20, { name: "Tips", rating: 74.5, slope: 145, par: 72 }) === 28, "20 @ 145/74.5/72 should be 28");
  const g18 = { holes: 18, pars: [], strokeIndex: [], scores: {}, tees: [{ name: "Blue", rating: 71.8, slope: 130, par: 72 }] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assert(effectiveHandicap(g18 as any, { id: "x", name: "X", handicap: 8.4, tee: "Blue" }) === 9, "18-hole effective = CH");
  const g9 = { ...g18, holes: 9 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assert(effectiveHandicap(g9 as any, { id: "x", name: "X", handicap: 8.4, tee: "Blue" }) === 5, "9-hole effective = half CH rounded");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assert(effectiveHandicap({ ...g18, tees: undefined } as any, { id: "x", name: "X", handicap: 8.4 }) === 8.4, "no tees → raw index");
});

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

// ---- Format × play-style: only valid combinations are offered, and each one
//      the create screen exposes actually produces correctly-shaped matches. ----
// Rotating-partner "doubles" can only be honored where partners are re-drawn
// each round; everywhere else a side is a fixed unit (person/pair/team).
for (const fmt of ALL_FORMATS) {
  check(`play styles offered for ${fmt}`, () => {
    const opts = playStylesForFormat(fmt);
    const rotating =
      fmt === "round-robin" || fmt === "pool-bracket" || fmt === "americano" || fmt === "mexicano";
    assert(
      opts.includes("doubles") === rotating,
      `${fmt}: rotating-doubles offered=${opts.includes("doubles")}, expected=${rotating}`,
    );
    if (fmt === "golf" || fmt === "ryder")
      assert(opts.length === 0, `${fmt} should not show a play-style picker`);
    else if (fmt === "americano" || fmt === "mexicano")
      assert(opts.length === 1 && opts[0] === "doubles", `${fmt} is rotating-doubles only`);
    else assert(opts.length >= 1 && opts.includes("singles"), `${fmt} should always allow singles`);
  });
}

// Formats whose schedule is built up-front by the store's buildMatches().
const MATCH_FORMATS: Format[] = [
  "round-robin",
  "swiss",
  "kotc",
  "single-elim",
  "double-elim",
  "pool-bracket",
  "americano",
  "mexicano",
];
for (const fmt of MATCH_FORMATS)
  for (const style of playStylesForFormat(fmt) as PlayStyle[])
    for (const n of [8, 12])
      check(`buildMatches ${fmt} / ${style} n=${n}`, () => {
        const P = players(n);
        const t = tour({
          format: fmt,
          playStyle: style,
          participants: P,
          config: cfg({ rounds: 3, courts: 2, poolCount: 2 }),
        });
        const ms = buildMatches(t);
        assert(ms.length > 0, "no matches generated");
        validIds(ms.filter((m) => m.sideA.length && m.sideB.length), new Set(P.map((p) => p.id)));
        // Rotating doubles puts two people on a side; every other style is 1 unit/side.
        const want = style === "doubles" ? 2 : 1;
        for (const m of ms) {
          if (m.sideA.length) assert(m.sideA.length === want, `${fmt}/${style} sideA=${m.sideA.length}, want ${want}`);
          if (m.sideB.length) assert(m.sideB.length === want, `${fmt}/${style} sideB=${m.sideB.length}, want ${want}`);
        }
      });

// ---- Live scoring: a game runs until it's won or the host ends it ----
// The bug this guards: a match used to be "done" the instant both sides had a
// number, so 1–1 was a final result and the last game's first point crowned a
// champion. Every format that decides itself from match results is swept here.

// Formats whose completion comes from match scores. The rest finish on their own
// terms (golf on holes, score-challenge on posted numbers, ladder/custom never).
// Ryder is match-driven too but builds through genRyder, so it gets its own case below.
const MATCH_DRIVEN = new Set<Format>([
  "round-robin", "swiss", "kotc", "single-elim", "double-elim",
  "pool-bracket", "americano", "mexicano",
]);

check("isFinal — legacy match with both scores reads as done", () => {
  assert(isFinal({ scoreA: 11, scoreB: 5 } as Match), "legacy scored match should be final");
  assert(!isFinal({ scoreA: 11, scoreB: null } as Match), "half-scored match is not final");
  assert(!isFinal({ scoreA: null, scoreB: null } as Match), "unscored match is not final");
});
check("isFinal — `final` overrides the score-presence guess", () => {
  assert(!isFinal({ scoreA: 1, scoreB: 1, final: false } as Match), "live 1-1 must not be final");
  assert(isFinal({ scoreA: 5, scoreB: 3, final: true } as Match), "host-ended game must be final");
  assert(isFinal({ scoreA: null, scoreB: null, final: true } as Match), "explicit final wins over no scores");
});

// The margin box: any number ≥1, default 2, junk clamped rather than trusted.
for (const [label, c, want] of [
  ["default", {}, 2],
  ["win by 2", { winBy: 2 }, 2],
  ["straight up", { winBy: 1 }, 1],
  ["win by 3", { winBy: 3 }, 3],
  ["zero clamps to 1", { winBy: 0 }, 1],
  ["negative clamps to 1", { winBy: -5 }, 1],
  ["fractional floors", { winBy: 2.9 }, 2],
  ["NaN falls back to 2", { winBy: NaN }, 2],
  ["legacy winByTwo:false", { winByTwo: false }, 1],
  ["legacy winByTwo:true", { winByTwo: true }, 2],
  ["winBy overrides legacy", { winBy: 1, winByTwo: true }, 1],
] as [string, Partial<TournamentConfig>, number][])
  check(`winMargin — ${label}`, () => {
    const got = winMargin(c as TournamentConfig);
    assert(got === want, `winMargin=${got}, want ${want}`);
  });

check("isWon — win-by-2 keeps 11–10 alive, ends 12–10", () => {
  const c = cfg({ pointsTo: 11, winBy: 2 });
  assert(!isWon(1, 1, c), "1-1 must keep playing");
  assert(!isWon(10, 9, c), "below target must keep playing");
  assert(!isWon(11, 10, c), "11-10 must keep playing at win-by-2");
  assert(isWon(11, 9, c), "11-9 should win");
  assert(isWon(12, 10, c), "12-10 should win");
  assert(!isWon(11, 11, c), "tie at target must keep playing");
  assert(!isWon(null, 5, c), "half-entered score never wins");
});
check("isWon — straight up ends at 11–10", () => {
  const c = cfg({ pointsTo: 11, winBy: 1 });
  assert(isWon(11, 10, c), "11-10 should win straight up");
  assert(!isWon(11, 11, c), "11-11 is not a win");
  assert(!isWon(10, 0, c), "below target never wins");
});
check("isWon — win by 3 needs the full margin", () => {
  const c = cfg({ pointsTo: 11, winBy: 3 });
  assert(!isWon(12, 10, c), "12-10 is only 2 clear");
  assert(isWon(13, 10, c), "13-10 should win at win-by-3");
});
check("isWon — no target means the host ends it", () => {
  const c = cfg({ pointsTo: 0 });
  assert(!isWon(21, 0, c), "with no target nothing auto-finishes");
});

// A live game must never finish a tournament — for every sport, in every format
// that sport offers whose result comes from matches.
for (const sport of SPORTS)
  for (const fmt of formatsForSport(sport).filter((f) => MATCH_DRIVEN.has(f)))
    for (const n of [8, 16, 30]) {
    const style: PlayStyle = playStylesForFormat(fmt)[0];
    check(`live game blocks completion — ${sport} / ${fmt} / ${style} / n=${n}`, () => {
      const P = players(n, fmt === "ryder");
      const t = tour({
        sport,
        format: fmt,
        playStyle: style,
        participants: P,
        config: cfg({ rounds: 2, courts: 2, poolCount: 2, advanceCount: 2 }),
      });
      t.matches = buildMatches(t);
      const playable = t.matches.filter((m) => m.sideA.length && m.sideB.length);
      assert(playable.length > 0, "no playable matches generated");

      // Play every game out the legacy way (scores, no `final`) — the baseline.
      for (const m of t.matches) {
        if (!m.sideA.length || !m.sideB.length) continue;
        m.scoreA = 11;
        m.scoreB = 5;
        m.final = undefined;
      }
      t.matches = propagateBracket(t.matches);
      const done = getResult(t);

      // Now put one game back on court. Nothing may read as finished while it's live.
      const live = t.matches.find((m) => m.sideA.length && m.sideB.length)!;
      live.final = false;
      t.matches = propagateBracket(t.matches);
      const during = getResult(t);
      if (done.complete)
        assert(!during.complete, `crowned "${during.winner}" while a game was still live`);

      // Standings must not count the live game either. Every player on both sides
      // gets a "played", so a match is worth however many people are on it.
      const rr = t.matches.filter((m) => m.phase === "rr" || m.phase === "pool");
      if (rr.length) {
        const played = computeStandings(P, rr).reduce((s, r) => s + r.played, 0);
        const wantPlayed = rr
          .filter((m) => m.sideA.length && m.sideB.length && m.final !== false)
          .reduce((s, m) => s + m.sideA.length + m.sideB.length, 0);
        assert(played === wantPlayed, `standings counted ${played} played, want ${wantPlayed}`);
      }

      // Host ends it → the tournament finishes exactly as it did before.
      live.final = true;
      t.matches = propagateBracket(t.matches);
      const after = getResult(t);
      assert(
        after.complete === done.complete && after.winner === done.winner,
        `ending the game changed the outcome: ${done.winner} → ${after.winner}`,
      );
    });
  }

// Ryder: a live match can't decide the cup. Note the cup clinches at half the
// points, so a dead-rubber match genuinely can't change the result — the live
// match has to be the deciding one for this to prove anything. Splitting the
// other matches evenly keeps both teams short of the clinch line.
for (const sport of SPORTS.filter((s) => formatsForSport(s).includes("ryder")))
  check(`live game blocks completion — ${sport} / ryder`, () => {
    const P = players(8, true);
    const ms = genRyder(P, { foursomes: 1, fourball: 1, singles: 1 });
    const t = tour({ sport, format: "ryder", participants: P, matches: ms, config: cfg({ ryderSingles: 1 }) });
    ms.forEach((m, i) => {
      m.scoreA = i % 2 === 0 ? 1 : 0; // alternate winners → neither side clinches
      m.scoreB = i % 2 === 0 ? 0 : 1;
      m.final = undefined;
    });

    ms[0].final = false; // still out on the course
    const during = ryderScore(ms);
    assert(during.status === "in-progress", `cup decided (${during.status}) with a live match`);
    assert(!getResult(t).complete, `crowned "${getResult(t).winner}" with a live match`);
    assert(during.played === ms.length - 1, `live match counted as played (${during.played}/${ms.length})`);

    ms[0].final = true; // host posts the result
    assert(getResult(t).complete, "cup should be decided once the last match is final");
  });

// ---- Cup scoring: a session's point splits across its matches -------------
// A 2-match session where each team wins one is 1–1 the classic way, and ½–½ when
// the session itself is the point. What must never happen is a cup calling itself
// over, or a point changing value, because of how the modes were counted.
{
  const ryderMatch = (round: number, order: number, a: number | null, b: number | null): Match => ({
    id: `r${round}m${order}`,
    phase: "ryder",
    round,
    order,
    label: "Fourball",
    sideA: ["a1", "a2"],
    sideB: ["b1", "b2"],
    scoreA: a,
    scoreB: b,
  });
  // One 9-hole session of 2 matches, split one apiece.
  const front = [ryderMatch(1, 0, 3, 1), ryderMatch(1, 1, 1, 3)];
  const expect: Record<RyderScoring, [number, number]> = {
    match: [1, 1],
    session: [0.5, 0.5],
    round18: [0.25, 0.25], // half a session of an 18 — the back nine is still to come
  };
  for (const mode of Object.keys(expect) as RyderScoring[])
    check(`ryder scoring ${mode} — split session`, () => {
      const sc = ryderScore(front, mode, 9);
      const [a, b] = expect[mode];
      assert(sc.a === a && sc.b === b, `${mode}: got ${sc.a}–${sc.b}, want ${a}–${b}`);
      // This session is the whole cup so far, and it came out even.
      assert(sc.status === "tie", `${mode}: even split read as ${sc.status}`);
    });

  // A planned 2-session cup is not over when session one is: `played` used to count
  // matches while `total` counted session points, which crowned a tie at halfway.
  check("ryder scoring — first session done is not the whole cup", () => {
    const both = [...front, ryderMatch(2, 0, null, null), ryderMatch(2, 1, null, null)];
    for (const mode of ["match", "session", "round18"] as RyderScoring[]) {
      const sc = ryderScore(both, mode, 9);
      assert(sc.status === "in-progress", `${mode}: cup called ${sc.status} with a session unplayed`);
      assert(sc.played < sc.total, `${mode}: played ${sc.played} of ${sc.total} reads as complete`);
    }
  });

  // Captain-style cups add sessions as the day goes. A point already earned must
  // not be re-priced when the next session appears.
  check("ryder scoring — adding a session keeps earned points at their value", () => {
    for (const mode of ["match", "session", "round18"] as RyderScoring[]) {
      const before = ryderScore(front, mode, 9);
      const after = ryderScore([...front, ryderMatch(2, 0, null, null), ryderMatch(2, 1, null, null)], mode, 9);
      assert(
        before.a === after.a && before.b === after.b,
        `${mode}: ${before.a}–${before.b} became ${after.a}–${after.b} when the next session was added`,
      );
    }
  });

  // Sweeping a session clinches it outright in every mode.
  check("ryder scoring — a sweep wins the cup in every mode", () => {
    const swept = [ryderMatch(1, 0, 3, 1), ryderMatch(1, 1, 2, 0)];
    for (const mode of ["match", "session"] as RyderScoring[]) {
      const sc = ryderScore(swept, mode, 18);
      assert(sc.status === "a-wins", `${mode}: sweep read as ${sc.status}`);
      assert(sc.a === sc.total, `${mode}: sweep scored ${sc.a} of ${sc.total}`);
    }
  });

  // Weights are what the live projection adds per in-progress match, so they have
  // to sum to the cup total rather than to one point apiece.
  check("ryder scoring — weights sum to the cup total", () => {
    for (const mode of ["match", "session", "round18"] as RyderScoring[]) {
      const w = matchWeights(front, mode, 9);
      const sum = [...w.values()].reduce((x, y) => x + y, 0);
      assert(Math.abs(sum - ryderScore(front, mode, 9).total) < 1e-9, `${mode}: weights ${sum} ≠ total`);
      assert(w.size === front.length, `${mode}: ${w.size} weights for ${front.length} matches`);
    }
  });

  // Sessions on different cards: an 18-hole session is a full point, a nine is half.
  check("ryder scoring — round18 weighs each session on its own card", () => {
    const mixed = [ryderMatch(1, 0, 3, 1), ryderMatch(2, 0, 3, 1)];
    const holesOf = (r: number) => (r === 1 ? 9 : 18);
    const w = matchWeights(mixed, "round18", 18, holesOf);
    assert(w.get("r1m0") === 0.5, `nine-hole session worth ${w.get("r1m0")}, want 0.5`);
    assert(w.get("r2m0") === 1, `18-hole session worth ${w.get("r2m0")}, want 1`);
  });
}

// ---- Points per session, typed as a number ---------------------------------
// The three presets are one idea with the number derived; typing it should behave
// the same way and cover the values the presets can't express.
{
  const pair = (round: number, order: number, a: number | null, b: number | null): Match => ({
    id: `p${round}-${order}`, phase: "ryder", round, order, label: "Fourball",
    sideA: ["a1", "a2"], sideB: ["b1", "b2"], scoreA: a, scoreB: b,
  });
  const split = [pair(1, 0, 1, 0), pair(1, 1, 0, 1)]; // 2 matches, one apiece

  check("ryder points-per-session — a typed number splits across the session", () => {
    for (const [pts, want] of [[2, 1], [1, 0.5], [0.5, 0.25], [4, 2]] as const) {
      const sc = ryderScore(split, "session", 9, undefined, pts);
      assert(sc.a === want && sc.b === want, `${pts} pts → ${sc.a}–${sc.b}, want ${want} each`);
      assert(sc.total === pts, `${pts} pts → total ${sc.total}`);
    }
  });

  check("ryder points-per-session — reproduces each preset", () => {
    // "1 point per match" with 2 matches is 2 points on the line; "1 per session" is 1.
    const asMatch = ryderScore(split, "match", 9);
    const typed2 = ryderScore(split, "session", 9, undefined, 2);
    assert(asMatch.a === typed2.a && asMatch.total === typed2.total, "2 pts ≠ 1-per-match");
    const asSession = ryderScore(split, "session", 9);
    const typed1 = ryderScore(split, "session", 9, undefined, 1);
    assert(asSession.a === typed1.a && asSession.total === typed1.total, "1 pt ≠ 1-per-session");
  });

  check("ryder points-per-session — a typed number overrides the preset", () => {
    for (const mode of ["match", "session", "round18"] as RyderScoring[]) {
      const sc = ryderScore(split, mode, 9, undefined, 3);
      assert(sc.total === 3, `${mode} with 3 typed → total ${sc.total}`);
    }
  });

  check("ryder points-per-session — junk and zero fall back to the preset", () => {
    for (const bad of [0, -2, NaN, undefined]) {
      const sc = ryderScore(split, "match", 9, undefined, bad as number | undefined);
      assert(sc.total === 2, `${bad} should fall back to 1-per-match (got ${sc.total})`);
    }
  });

  check("ryder pointsOnTheLine — reports the session's stake", () => {
    assert(pointsOnTheLine(split, 1, "session", 9, undefined, 2) === 2, "typed stake wrong");
    assert(pointsOnTheLine(split, 1, "match", 9) === 2, "1-per-match stake wrong");
    assert(pointsOnTheLine(split, 1, "session", 9) === 1, "1-per-session stake wrong");
  });
}

// ---- Reading one scorecard three ways --------------------------------------
// Same holes, same handicaps — match play, stroke play and Stableford should each
// pick their own winner, and only match play may settle before the last hole.
{
  const P: Participant[] = [
    { id: "a1", name: "A1", team: 0, handicap: 0 },
    { id: "b1", name: "B1", team: 1, handicap: 0 },
  ];
  const single = (): Match => ({
    id: "s1", phase: "ryder", round: 1, order: 0, label: "Singles",
    sideA: ["a1"], sideB: ["b1"], scoreA: null, scoreB: null,
  });
  // 3 holes, all par 4. A wins two holes by a shot; B wins one hole by five.
  //   A: 3, 3, 9   (15)   B: 4, 4, 4   (12)
  // Match play → A wins 2 holes to 1. Stroke play → B by 3. Stableford: A 3+3+0=6,
  // B 2+2+2=6 → tied.
  const build = (holes: number) => {
    const t = tour({
      format: "ryder", participants: P, matches: [single()],
      config: cfg({ teamNames: ["A", "B"] }),
    }) as Tournament;
    t.ryderGolf = {
      holes, pars: [4, 4, 4], strokeIndex: [1, 2, 3],
      scores: { s1: { a1: [3, 3, 9], b1: [4, 4, 4] } },
    };
    return t;
  };

  const expect: Record<string, { a: number; decided: boolean }> = {
    match: { a: 1, decided: true },
    stroke: { a: 0, decided: true },
    stableford: { a: 0.5, decided: true },
  };
  for (const method of ["match", "stroke", "stableford"] as const)
    check(`ryder method ${method} — same card, its own winner`, () => {
      const t = build(3);
      t.ryderGolf!.sessionMethods = { 1: method };
      const o = matchOutcome(t, t.matches[0]);
      assert(o.method === method, `method read as ${o.method}`);
      assert(o.decided === expect[method].decided, `${method} decided=${o.decided}`);
      assert(o.a === expect[method].a, `${method}: A got ${o.a}, want ${expect[method].a}`);
      assert(o.a + o.b === 1, `${method}: points ${o.a}+${o.b} ≠ 1`);
    });

  check("ryder method — stroke and Stableford wait for the last hole", () => {
    for (const method of ["stroke", "stableford"] as const) {
      const t = build(4); // a 4th hole nobody has played
      t.ryderGolf!.pars = [4, 4, 4, 4];
      t.ryderGolf!.strokeIndex = [1, 2, 3, 4];
      t.ryderGolf!.sessionMethods = { 1: method };
      const o = matchOutcome(t, t.matches[0]);
      assert(!o.decided, `${method} settled with a hole outstanding`);
      assert(o.thru === 3, `${method} thru ${o.thru}, want 3`);
    }
  });

  check("ryder method — match play can still close out early", () => {
    const t = build(3);
    t.ryderGolf!.scores = { s1: { a1: [3, 3, null], b1: [5, 5, null] } }; // 2 up with 1 to play
    const o = matchOutcome(t, t.matches[0]);
    assert(o.decided && o.a === 1, `dormie-2 not closed out (decided=${o.decided}, a=${o.a})`);
  });

  check("ryder method — Vegas and Team Stableford keep their own scoring", () => {
    assert(!methodIsChoosable("Vegas"), "Vegas offered a scoring method");
    assert(!methodIsChoosable("Team Stableford"), "Team Stableford offered a scoring method");
    assert(methodIsChoosable("Best Ball"), "Best Ball should be re-scorable");
    const t = build(3);
    t.ryderGolf!.sessionMethods = { 1: "stroke" }; // must be ignored for a fixed game
    t.matches[0].label = "Vegas";
    assert(methodForMatch(t, t.matches[0]) === "vegas", "Vegas took the session method");
  });

  check("ryder Vegas — the hole pays the difference, not one up", () => {
    // Per-player balls, combined low-first: hole 1 is 4&5=45 vs 5&5=55 → A +10;
    // hole 2 pushes 44–44; hole 3 is 5&5=55 vs 4&6=46 → B +9. A leads 10–9 and
    // takes the session by 1 point — a match-play read would call it 1 hole each.
    const t = build(3);
    t.matches[0].label = "Vegas";
    t.matches[0].sideA = ["a1", "a2"];
    t.matches[0].sideB = ["b1", "b2"];
    t.ryderGolf!.scores = {
      s1: { a1: [4, 4, 5], a2: [5, 4, 5], b1: [5, 4, 4], b2: [5, 4, 6] },
    };
    const o = matchOutcome(t, t.matches[0]);
    assert(o.method === "vegas", `method read as ${o.method}`);
    assert(o.marginA === 10 && o.marginB === 9, `points ${o.marginA}–${o.marginB}, want 10–9`);
    assert(o.decided && o.a === 1, `A should take the session (decided=${o.decided}, a=${o.a})`);
    assert(/1 pt/.test(o.text), `status text should carry the point margin: "${o.text}"`);
  });

  check("ryder Vegas house rules — the flip swings the cup point", () => {
    // One hole, par 4. A pair cards 3 & 5 (birdie), B pair 4 & 4.
    // Plain game: 35 vs 44 → A +9. With flips on birdie+, A's birdie turns B's
    // number around: 44 stays 44 — so use 4 & 6: raw 46, flipped 64 → A +29.
    const t = build(1);
    t.ryderGolf!.pars = [4];
    t.matches[0].label = "Vegas";
    t.matches[0].sideA = ["a1", "a2"];
    t.matches[0].sideB = ["b1", "b2"];
    t.ryderGolf!.scores = { s1: { a1: [3], a2: [5], b1: [4], b2: [6] } };
    t.config.vegasRules = { ...VEGAS_BASIC, flipOn: "off" };
    const plain = matchOutcome(t, t.matches[0]);
    assert(plain.marginA === 11 && plain.marginB === 0, `plain ${plain.marginA}–${plain.marginB}, want 11–0`);
    t.config.vegasRules = { ...VEGAS_BASIC, flipOn: "birdie" };
    const flipped = matchOutcome(t, t.matches[0]);
    assert(
      flipped.marginA === 29 && flipped.marginB === 0,
      `flipped ${flipped.marginA}–${flipped.marginB}, want 29–0 (46 → 64)`,
    );
    assert(flipped.a === 1, "A should hold the cup point either way");
  });
}

// ---- Reading a golf card as a match ----------------------------------------
// Team games (Best Ball & co.) used to be locked to stroke play. They can now be read
// as Stableford, skins, or — with two sides on the card — as a match.
{
  const twoSided = (mode: GolfMode, scores: Record<string, (number | null)[]>) => {
    const P: Participant[] = [
      { id: "t1", name: "Red", handicap: 0 },
      { id: "t2", name: "Blue", handicap: 0 },
    ];
    const t = tour({ format: "golf", participants: P, config: cfg({ golfMode: mode }) }) as Tournament;
    t.golf = { holes: 3, pars: [4, 4, 4], strokeIndex: [1, 2, 3], scores };
    return t;
  };

  check("golf match — holes won, halves, and the closeout line", () => {
    // Red takes 1 and 2, hole 3 is halved → Red 2 up with none to play.
    const t = twoSided("bestball", { t1: [3, 3, 4], t2: [4, 4, 4] });
    const m = computeGolfMatch(t)!;
    assert(m !== null, "no match computed for a two-sided card");
    assert(m.upA === 2 && m.upB === 0, `holes ${m.upA}–${m.upB}, want 2–0`);
    assert(m.halved === 1, `halved ${m.halved}, want 1`);
    assert(m.decided && m.thru === 3, `decided=${m.decided} thru=${m.thru}`);
    assert(m.text.startsWith("Red wins"), `text "${m.text}"`);
    assert(m.holeWinners.join(",") === "A,A,", `ribbon ${m.holeWinners.join(",")}`);
  });

  check("golf match — closes out early when the lead outruns the holes left", () => {
    const t = twoSided("bestball", { t1: [3, 3, null], t2: [5, 5, null] });
    const m = computeGolfMatch(t)!;
    assert(m.decided, "2 up with 1 to play should be closed out");
    assert(m.text.includes("2 & 1"), `text "${m.text}"`);
  });

  check("golf match — all square reads as square, then halved", () => {
    const live = computeGolfMatch(twoSided("bestball", { t1: [4, 4, null], t2: [4, 4, null] }))!;
    assert(!live.decided && live.text.includes("All Square"), `live "${live.text}"`);
    const done = computeGolfMatch(twoSided("bestball", { t1: [4, 4, 4], t2: [4, 4, 4] }))!;
    assert(done.decided && done.text === "Halved", `done "${done.text}"`);
  });

  check("golf match — net strokes decide the hole, not gross", () => {
    const P: Participant[] = [
      { id: "t1", name: "Red", handicap: 0 },
      { id: "t2", name: "Blue", handicap: 3 }, // one stroke on each of the three holes
    ];
    const t = tour({ format: "golf", participants: P, config: cfg({ golfMode: "bestball" }) }) as Tournament;
    t.golf = { holes: 3, pars: [4, 4, 4], strokeIndex: [1, 2, 3], scores: { t1: [4, 4, 4], t2: [5, 5, 5] } };
    const m = computeGolfMatch(t)!;
    assert(m.upA === 0 && m.upB === 0 && m.halved === 3, `net strokes ignored: ${m.upA}–${m.upB}`);
  });

  check("golf match — only offered with exactly two sides", () => {
    const three = tour({
      format: "golf",
      participants: [
        { id: "p1", name: "A", handicap: 0 },
        { id: "p2", name: "B", handicap: 0 },
        { id: "p3", name: "C", handicap: 0 },
      ],
      config: cfg({ golfMode: "bestball" }),
    }) as Tournament;
    three.golf = { holes: 3, pars: [4, 4, 4], strokeIndex: [1, 2, 3], scores: {} };
    assert(computeGolfMatch(three) === null, "a three-way card produced a match");
    assert(!golfMatchAvailable(three), "match offered to a three-way field");
    assert(!golfScoringOptions(three).includes("match"), "match listed for three sides");
  });

  check("golf scoring options — Vegas has no re-reading, team games have three or four", () => {
    const vegas = twoSided("vegas", { t1: [45, 45, 45], t2: [44, 44, 44] });
    assert(golfScoringOptions(vegas).length === 0, "Vegas offered scoring views");
    assert(!golfMatchAvailable(vegas), "Vegas offered match play");
    const bb = twoSided("bestball", { t1: [4, 4, 4], t2: [4, 4, 4] });
    const opts = golfScoringOptions(bb);
    assert(opts.length === 4 && opts.includes("match"), `best ball options ${opts.join(",")}`);
  });

  check("golf scoring — the same card ranks by the chosen reading", () => {
    // Red blows up one hole: better on holes won, worse on total strokes.
    const t = twoSided("bestball", { t1: [3, 3, 9], t2: [4, 4, 4] });
    const byStroke = computeGolf(t, "stroke");
    assert(byStroke[0].name === "Blue", `stroke leader ${byStroke[0].name}, want Blue`);
    const m = computeGolfMatch(t)!;
    assert(m.upA === 2 && m.upB === 1, `match ${m.upA}–${m.upB}, want 2–1 to Red`);
  });
}

// ---- Vegas, worked through the rules as written ----------------------------
{
  // Four players, no handicaps unless a case sets them. Teams A = p0/p1, B = p2/p3.
  const vegasRound = (
    pars: number[],
    cards: [number[], number[], number[], number[]],
    handicaps: [number, number, number, number] = [0, 0, 0, 0],
  ): Tournament => {
    const P: Participant[] = ["A1", "A2", "B1", "B2"].map((n, i) => ({
      id: `v${i}`, name: n, handicap: handicaps[i],
    }));
    const t = tour({
      format: "golf", participants: P, config: cfg({ golfMode: "vegas" }),
    }) as Tournament;
    t.golf = {
      holes: pars.length, pars,
      strokeIndex: pars.map((_, i) => i + 1),
      scores: Object.fromEntries(P.map((p, i) => [p.id, cards[i]])),
    };
    return t;
  };

  check("vegas — the plain hole: 4+6 vs 5+5 is 46 to 55, nine points", () => {
    const t = vegasRound([4], [[4], [6], [5], [5]]);
    const L = computeVegasLedger(t, VEGAS_BASIC)!;
    const r = L.rows[0];
    assert(r.numA === 46 && r.numB === 55, `numbers ${r.numA} v ${r.numB}, want 46 v 55`);
    assert(r.winner === "A" && r.points === 9, `${r.winner} by ${r.points}, want A by 9`);
    assert(L.pointsA === 9 && L.pointsB === 0, `ledger ${L.pointsA}–${L.pointsB}`);
  });

  check("vegas — pick-per-hole partners carry forward until the next pick", () => {
    const ids = ["p1", "p2", "p3", "p4"];
    const pairs: (0 | 1 | 2 | null)[] = [null, 1, null, 2];
    // Hole 1: no pick yet → default pairing (p1+p2). Hole 2: picked p1+p3.
    // Hole 3: no pick → still p1+p3. Hole 4: picked p1+p4.
    assert(vegasTeamsForHole(ids, 0, "byHole", pairs)![0].join() === "p1,p2", "hole 1 default");
    assert(vegasTeamsForHole(ids, 1, "byHole", pairs)![0].join() === "p1,p3", "hole 2 pick");
    assert(vegasTeamsForHole(ids, 2, "byHole", pairs)![0].join() === "p1,p3", "hole 3 carry");
    assert(vegasTeamsForHole(ids, 3, "byHole", pairs)![0].join() === "p1,p4", "hole 4 pick");
    // The ledger pays each hole under that hole's partners.
    const t = vegasRound([4, 4], [[4, 4], [5, 6], [4, 5], [6, 4]]);
    t.golf!.vegasPairs = [null, 1];
    const L = computeVegasLedger(t, { ...VEGAS_BASIC, teams: "byHole" })!;
    // Hole 1 (p1+p2 vs p3+p4): 45 vs 46 → A +1. Hole 2 (p1+p3 vs p2+p4): 45 vs 46 → A +1.
    assert(
      L.rows[0].numA === 45 && L.rows[0].numB === 46 && L.rows[1].numA === 45 && L.rows[1].numB === 46,
      `numbers h1 ${L.rows[0].numA}v${L.rows[0].numB}, h2 ${L.rows[1].numA}v${L.rows[1].numB}`,
    );
    assert(L.pointsA === 2 && L.pointsB === 0, `ledger ${L.pointsA}–${L.pointsB}, want 2–0`);
  });

  check("vegas — low ball goes first regardless of entry order", () => {
    assert(vegasNumber([6, 4], false) === 46, "high-first input not normalised");
    assert(vegasNumber([4, 6], false) === 46, "low-first input changed");
    assert(vegasNumber([4, 6], true) === 64, "flip did not put the high ball first");
    assert(vegasNumber([4, 12], false) === 49, "ball over 9 not capped at 9");
  });

  check("vegas — a birdie flips the OPPONENT's number (3+5 vs 4+6 → 29)", () => {
    // Par 4: A's 3 is a birdie, so B's 46 becomes 64. A wins 64 − 35 = 29.
    const t = vegasRound([4], [[3], [5], [4], [6]]);
    const L = computeVegasLedger(t, { ...VEGAS_BASIC, flipOn: "birdie" })!;
    const r = L.rows[0];
    assert(r.birdieA && !r.birdieB, `birdie read A=${r.birdieA} B=${r.birdieB}`);
    assert(r.flippedB && !r.flippedA, "the birdie team flipped its own number");
    assert(r.numA === 35 && r.numB === 64, `${r.numA} v ${r.numB}, want 35 v 64`);
    assert(r.winner === "A" && r.points === 29, `${r.winner} by ${r.points}, want A by 29`);
  });

  check("vegas — the round's worked example: 45 vs 36 with B's birdie → B by 18", () => {
    // Par 4. A: 4+5 = 45. B: 3+6 with a birdie, so A flips to 54. B wins 54 − 36 = 18.
    const t = vegasRound([4], [[4], [5], [3], [6]]);
    const L = computeVegasLedger(t, { ...VEGAS_BASIC, flipOn: "birdie" })!;
    const r = L.rows[0];
    assert(r.numA === 54 && r.numB === 36, `${r.numA} v ${r.numB}, want 54 v 36`);
    assert(r.winner === "B" && r.points === 18, `${r.winner} by ${r.points}, want B by 18`);
    assert(L.moneyA === -18, `money to A ${L.moneyA}, want -18 at $1/pt`);
  });

  check("vegas — flip off leaves the same hole at 45 v 36, nine points", () => {
    const t = vegasRound([4], [[4], [5], [3], [6]]);
    const L = computeVegasLedger(t, VEGAS_BASIC)!;
    assert(L.rows[0].numA === 45 && L.rows[0].points === 9, "flip applied while off");
  });

  check("vegas — eagle-only flipping ignores a mere birdie", () => {
    const birdie = vegasRound([4], [[3], [5], [4], [6]]);
    const onEagle = computeVegasLedger(birdie, { ...VEGAS_BASIC, flipOn: "eagle" })!;
    assert(!onEagle.rows[0].flippedB, "a birdie flipped under an eagle-only rule");
    const eagle = vegasRound([4], [[2], [5], [4], [6]]);
    const flips = computeVegasLedger(eagle, { ...VEGAS_BASIC, flipOn: "eagle" })!;
    assert(flips.rows[0].flippedB, "an eagle failed to flip");
    // "Birdie or better" must include the eagle too.
    const orBetter = computeVegasLedger(eagle, { ...VEGAS_BASIC, flipOn: "birdie" })!;
    assert(orBetter.rows[0].flippedB, "birdie-or-better missed an eagle");
  });

  check("vegas — both teams birdie: each flips the other", () => {
    const t = vegasRound([4], [[3], [5], [3], [6]]);
    const L = computeVegasLedger(t, { ...VEGAS_BASIC, flipOn: "birdie" })!;
    const r = L.rows[0];
    assert(r.flippedA && r.flippedB, "a mutual birdie hole did not flip both");
    assert(r.numA === 53 && r.numB === 63, `${r.numA} v ${r.numB}, want 53 v 63`);
  });

  check("vegas — net scoring takes handicap strokes off before combining", () => {
    // One hole, stroke index 1. B1 gets a shot, turning a 5 into a net 4.
    const t = vegasRound([4], [[4], [5], [5], [5]], [0, 0, 1, 0]);
    const gross = computeVegasLedger(t, { ...VEGAS_BASIC, net: false })!;
    assert(gross.rows[0].numB === 55, `gross B ${gross.rows[0].numB}, want 55`);
    const net = computeVegasLedger(t, { ...VEGAS_BASIC, net: true })!;
    assert(net.rows[0].numB === 45, `net B ${net.rows[0].numB}, want 45`);
  });

  check("vegas — tied holes carry the stake into the next one", () => {
    // Hole 1 tied, hole 2 won by 9 → pays double with carry on, single with it off.
    const t = vegasRound([4, 4], [[4, 4], [5, 6], [4, 5], [5, 5]]);
    const off = computeVegasLedger(t, { ...VEGAS_BASIC, carryTies: false })!;
    const on = computeVegasLedger(t, { ...VEGAS_BASIC, carryTies: true })!;
    assert(off.rows[0].winner === null, "hole 1 was meant to tie");
    assert(on.rows[1].carriedIn === 1, `carriedIn ${on.rows[1].carriedIn}, want 1`);
    assert(on.rows[1].points === off.rows[1].points * 2, "carry did not double the hole");
  });

  check("vegas — auto-press opens at the margin and pays from the next hole", () => {
    // Every hole won by A by 9 → the margin passes 5 after hole 1.
    const cards: [number[], number[], number[], number[]] =
      [[4, 4, 4], [4, 4, 4], [5, 5, 5], [5, 5, 5]];
    const t = vegasRound([4, 4, 4], cards);
    const L = computeVegasLedger(t, { ...VEGAS_BASIC, pressAt: 5, maxPresses: 3, pressValue: 5 })!;
    assert(L.presses.length > 0, "no press opened past the trigger");
    assert(L.presses[0].from === 1, `first press starts on hole ${L.presses[0].from}, want 1`);
    // The press only collects holes from its start, never the one that triggered it.
    const fromStart = L.rows.slice(1).reduce((n, r) => n + (r.winner === "A" ? r.points : 0), 0);
    assert(L.presses[0].pointsA === fromStart, `press has ${L.presses[0].pointsA}, want ${fromStart}`);
    assert(L.pointsA === 33 && L.pointsB === 0, `original bet ${L.pointsA}–${L.pointsB}, want 33–0`);
  });

  check("vegas — presses respect the cap", () => {
    const cards: [number[], number[], number[], number[]] = [
      [4, 4, 4, 4, 4, 4], [4, 4, 4, 4, 4, 4], [5, 5, 5, 5, 5, 5], [5, 5, 5, 5, 5, 5],
    ];
    const t = vegasRound([4, 4, 4, 4, 4, 4], cards);
    const capped = computeVegasLedger(t, { ...VEGAS_BASIC, pressAt: 5, maxPresses: 2 })!;
    assert(capped.presses.length <= 2, `${capped.presses.length} presses past a cap of 2`);
    const none = computeVegasLedger(t, { ...VEGAS_BASIC, pressAt: 0 })!;
    assert(none.presses.length === 0, "presses opened while switched off");
  });

  check("vegas — money nets the original bet and every press", () => {
    const cards: [number[], number[], number[], number[]] =
      [[4, 4, 4], [4, 4, 4], [5, 5, 5], [5, 5, 5]];
    const t = vegasRound([4, 4, 4], cards);
    const L = computeVegasLedger(t, {
      ...VEGAS_BASIC, pressAt: 5, maxPresses: 3, pointValue: 1, pressValue: 5,
    })!;
    const expected =
      (L.pointsA - L.pointsB) * 1 + L.presses.reduce((n, p) => n + (p.pointsA - p.pointsB) * 5, 0);
    assert(L.moneyA === expected, `money ${L.moneyA} ≠ ${expected}`);
    assert(L.moneyA > L.pointsA, "presses added nothing to the settlement");
  });

  check("vegas — fixed teams hold; rotate6 runs all three pairings", () => {
    const ids = ["p0", "p1", "p2", "p3"];
    const fixed = [0, 5, 6, 11, 12, 17].map((h) => vegasTeamsForHole(ids, h, "fixed")![0].join("+"));
    assert(new Set(fixed).size === 1, `fixed teams changed: ${fixed.join(" ")}`);
    const rot = [0, 6, 12].map((h) => vegasTeamsForHole(ids, h, "rotate6")![0].join("+"));
    assert(new Set(rot).size === 3, `rotate6 gave ${rot.join(" ")}`);
    assert(rot[0] === "p0+p1" && rot[1] === "p0+p2" && rot[2] === "p0+p3", `rotation ${rot.join(" ")}`);
    // Holes 1-6 share a pairing, then it changes.
    assert(
      vegasTeamsForHole(ids, 5, "rotate6")![0].join("+") === "p0+p1" &&
        vegasTeamsForHole(ids, 6, "rotate6")![0].join("+") === "p0+p2",
      "rotation did not switch at the six-hole boundary",
    );
  });

  check("vegas — needs four players with their own scores", () => {
    const three = tour({
      format: "golf",
      participants: [
        { id: "a", name: "A", handicap: 0 },
        { id: "b", name: "B", handicap: 0 },
        { id: "c", name: "C", handicap: 0 },
      ],
      config: cfg({ golfMode: "vegas" }),
    }) as Tournament;
    three.golf = { holes: 1, pars: [4], strokeIndex: [1], scores: {} };
    assert(computeVegasLedger(three, VEGAS_DEFAULTS) === null, "a three-player card produced a ledger");
    assert(vegasTeamsForHole(["a", "b", "c"], 0, "fixed") === null, "three players formed teams");
  });

  check("vegas — a round predating the flag still gets the full game", () => {
    // The bug: the full game was gated on a config flag only written by saves made
    // after it shipped, so every Vegas round created before was stuck on pair scoring
    // with no flip — while the screen kept advertising one.
    const t = vegasRound([4, 4], [[3, 4], [5, 5], [4, 4], [6, 5]]);
    delete (t.config as { vegasPerPlayer?: boolean }).vegasPerPlayer;
    assert(vegasIsPerPlayer(t), "a four-player card with single-digit balls read as a pair card");
    const L = computeVegasLedger(t, { ...VEGAS_BASIC, flipOn: "birdie" })!;
    assert(L.rows[0].flippedB, "the flip still did not fire on a pre-flag round");
    assert(L.rows[0].numB === 64 && L.rows[0].points === 29, `${L.rows[0].numB} / ${L.rows[0].points}`);
  });

  check("vegas — a blow-up hole doesn't demote a per-player round", () => {
    // One score of 11+ is a bad hole, not a combined pair number. Only a card where
    // EVERY entered score looks combined is the old format.
    const t = vegasRound([4, 4], [[3, 12], [5, 5], [4, 4], [6, 5]]);
    delete (t.config as { vegasPerPlayer?: boolean }).vegasPerPlayer;
    assert(vegasIsPerPlayer(t), "an 11+ on one hole threw the round back to pair scoring");
  });

  check("vegas — an empty four-player card is the new game", () => {
    const t = vegasRound([4], [[null as unknown as number], [null as unknown as number],
                               [null as unknown as number], [null as unknown as number]]);
    delete (t.config as { vegasPerPlayer?: boolean }).vegasPerPlayer;
    assert(vegasIsPerPlayer(t), "a fresh four-player card was treated as a pair card");
  });

  check("vegas — an explicit flag still wins over the card", () => {
    const t = vegasRound([4], [[3], [5], [4], [6]]);
    (t.config as { vegasPerPlayer?: boolean }).vegasPerPlayer = false;
    assert(!vegasIsPerPlayer(t), "an explicit false flag was ignored");
  });

  check("vegas — a legacy pair card is never read as the full game", () => {
    // Four PAIRS with pre-combined numbers. Without the per-player flag this must keep
    // its old pair scoring, or two duels would be misread as one four-player game.
    const pairs: Participant[] = ["A&B", "C&D", "E&F", "G&H"].map((n, i) => ({
      id: `pair${i}`, name: n, handicap: 0,
    }));
    const t = tour({ format: "golf", participants: pairs, config: cfg({ golfMode: "vegas" }) }) as Tournament;
    t.golf = {
      holes: 1, pars: [4], strokeIndex: [1],
      scores: { pair0: [45], pair1: [56], pair2: [44], pair3: [55] },
    };
    assert(!t.config.vegasPerPlayer, "fixture should have no per-player flag");
    // The old duel scoring still reads it: pair0 beats pair1 by 11, pair2 beats pair3 by 11.
    assert(!vegasIsPerPlayer(t), "four pairs of combined numbers read as four players");
    const legacy = computeVegas(t);
    const byName = (n: string) => legacy.find((r) => r.name === n)!;
    assert(byName("A&B").points === 11, `legacy pair scoring changed: ${byName("A&B").points}`);
    assert(byName("E&F").points === 11, `second duel wrong: ${byName("E&F").points}`);
  });

  check("vegas — unplayed holes are skipped, not scored as zeros", () => {
    const t = vegasRound([4, 4], [[4, null as unknown as number], [4, 4], [5, 5], [5, 5]]);
    const L = computeVegasLedger(t, VEGAS_BASIC)!;
    assert(L.thru === 1, `thru ${L.thru}, want 1`);
    assert(L.rows.length === 1, `${L.rows.length} rows for one played hole`);
  });
}

// ---- Edit setup must not cost you the round --------------------------------
// Re-saving setup used to rebuild the card from scratch, which threw away every score
// already entered. scoreCount is what both the warning and the undo banner read.
{
  check("scoreCount — counts entered scoring in every format that holds it", () => {
    const empty = tour({ format: "golf", participants: players(2) }) as Tournament;
    assert(scoreCount(empty) === 0, "empty tournament counted scores");
    assert(scoreSummary(empty) === "", "empty tournament produced a warning");

    const golf = tour({ format: "golf", participants: players(2) }) as Tournament;
    golf.golf = {
      holes: 3, pars: [4, 4, 4], strokeIndex: [1, 2, 3],
      scores: { p0: [4, 5, null], p1: [4, null, null] },
    };
    assert(scoreCount(golf) === 3, `golf holes counted ${scoreCount(golf)}, want 3`);

    const cup = tour({ format: "ryder", participants: players(4, true) }) as Tournament;
    cup.ryderGolf = {
      holes: 2, pars: [4, 4], strokeIndex: [1, 2],
      scores: { m1: { p0: [4, 4], p1: [5, null] } },
    };
    assert(scoreCount(cup) === 3, `cup holes counted ${scoreCount(cup)}, want 3`);

    const rr = tour({
      format: "round-robin",
      participants: players(4),
      matches: [
        { id: "a", phase: "rr", round: 1, order: 0, sideA: ["p0"], sideB: ["p1"], scoreA: 11, scoreB: 5 },
        { id: "b", phase: "rr", round: 1, order: 1, sideA: ["p2"], sideB: ["p3"], scoreA: null, scoreB: null },
      ],
    }) as Tournament;
    assert(scoreCount(rr) === 1, `finished matches counted ${scoreCount(rr)}, want 1`);
    assert(scoreSummary(rr).includes("1 result"), `summary read "${scoreSummary(rr)}"`);
  });

  check("scoreCount — a live, unfinished game is not a result to protect", () => {
    const live = tour({
      format: "round-robin",
      participants: players(2),
      matches: [
        { id: "a", phase: "rr", round: 1, order: 0, sideA: ["p0"], sideB: ["p1"], scoreA: 3, scoreB: 2, final: false },
      ],
    }) as Tournament;
    assert(scoreCount(live) === 0, "a game still being scored counted as a saved result");
  });
}

// ---- Alt Shot is Foursomes under its plain-English name ---------------------
// Same game, two names — mirroring Best Ball / Fourball, which the cup already
// offers both ways. So it has to behave identically, not merely look similar.
{
  const P = players(4, true);
  const cupWith = (label: string) => {
    const ms = genRyderSession(P, label as RyderSessionType, 1);
    const t = tour({ format: "ryder", participants: P, matches: ms, config: cfg() }) as Tournament;
    t.ryderGolf = {
      holes: 2, pars: [4, 4], strokeIndex: [1, 2],
      // One ball per side: the card is keyed "A"/"B", not per player.
      scores: { [ms[0].id]: { A: [4, 4], B: [5, 5] } },
    };
    return { t, m: ms[0] };
  };

  check("alt shot — pairs up 2v2 like Foursomes, not as a whole team", () => {
    const ms = genRyderSession(P, "Alt Shot", 1);
    assert(ms.length === 1, `${ms.length} matches for 4 players`);
    assert(ms[0].sideA.length === 2 && ms[0].sideB.length === 2, "Alt Shot was not 2v2");
    assert(!TEAM_SESSION_TYPES.includes("Alt Shot" as RyderSessionType), "Alt Shot listed as a whole-team game");
  });

  check("alt shot — one shared ball per side, like Foursomes", () => {
    const alt = entitiesForMatch(cupWith("Alt Shot").m);
    const four = entitiesForMatch(cupWith("Foursomes").m);
    assert(alt.length === 2, `${alt.length} score columns — should be one per side`);
    assert(
      alt.map((e) => e.key).join() === four.map((e) => e.key).join(),
      "Alt Shot's score entry differs from Foursomes'",
    );
  });

  check("alt shot — scores the same hole the same way Foursomes does", () => {
    const a = cupWith("Alt Shot");
    const f = cupWith("Foursomes");
    const an = holeNets(a.t, a.m, 0)!;
    const fn = holeNets(f.t, f.m, 0)!;
    assert(an.netA === fn.netA && an.netB === fn.netB, `${an.netA}/${an.netB} vs ${fn.netA}/${fn.netB}`);
    assert(matchOutcome(a.t, a.m).text === matchOutcome(f.t, f.m).text, "results read differently");
  });

  check("alt shot — has its rules written, and can be re-scored", () => {
    assert(!!RYDER_SESSION_BLURBS["Alt Shot" as RyderSessionType], "Alt Shot has no rules blurb");
    assert(methodIsChoosable("Alt Shot"), "Alt Shot should offer match/stroke/Stableford");
  });
}

// ---- Swapping a session's game ---------------------------------------------
// A whole-team game and a 2v2 game don't put the same players against each other,
// so changing one rebuilds the session's matchups rather than relabelling them.
{
  const eight = players(8, true);
  check("session game — whole-team is one 4v4 match, pairs are 2v2 matches", () => {
    const team = genRyderSession(eight, "Team Scramble", 1);
    assert(team.length === 1, `Team Scramble made ${team.length} matches, want 1`);
    assert(team[0].sideA.length === 4, `Team Scramble side of ${team[0].sideA.length}, want 4`);

    const pairs = genRyderSession(eight, "Scramble", 1);
    assert(pairs.length === 2, `Scramble made ${pairs.length} matches, want 2`);
    assert(
      pairs.every((m) => m.sideA.length === 2 && m.sideB.length === 2),
      "Scramble was not 2v2",
    );
    // Everyone still plays, either way.
    const played = (ms: Match[]) => new Set(ms.flatMap((m) => [...m.sideA, ...m.sideB])).size;
    assert(played(team) === 8 && played(pairs) === 8, "someone was left out of a session");
  });

  check("session game — every pairs game fields the same 2v2 matchups", () => {
    const shapes = ["Fourball", "Foursomes", "Alt Shot", "Best Ball", "Shamble", "Scramble", "Vegas"]
      .map((ty) => {
        const ms = genRyderSession(eight, ty as RyderSessionType, 1);
        return `${ms.length}x${ms[0].sideA.length}v${ms[0].sideB.length}`;
      });
    assert(new Set(shapes).size === 1, `pairs games disagree on shape: ${shapes.join(" ")}`);
    // Eight players is four a side, so two pairs per team meeting in two matches.
    assert(shapes[0] === "2x2v2", `pairs shape is ${shapes[0]}, want 2x2v2 for eight players`);
  });
}

// ---- A cup's Vegas session flips by default --------------------------------
// The flip is the game: a birdie turning the other pair's number around is the point
// of Vegas. A cup session used to default to "no flips", so the headline rule was off
// unless the host found the 🎰 card.
{
  const cupVegas = (rules?: Partial<typeof CUP_VEGAS_DEFAULTS>) => {
    const P: Participant[] = ["A1", "A2", "B1", "B2"].map((n, i) => ({
      id: `v${i}`, name: n, team: (i < 2 ? 0 : 1) as 0 | 1, handicap: 0,
    }));
    const m: Match = {
      id: "m1", phase: "ryder", round: 1, order: 0, label: "Vegas",
      sideA: ["v0", "v1"], sideB: ["v2", "v3"], scoreA: null, scoreB: null,
    };
    const t = tour({
      format: "ryder", participants: P, matches: [m],
      config: cfg(rules ? { vegasRules: { ...CUP_VEGAS_DEFAULTS, ...rules } } : {}),
    }) as Tournament;
    // Par 4. A: 3 + 5 (a birdie) = 35. B: 4 + 6 = 46, which a flip turns into 64.
    t.ryderGolf = {
      holes: 1, pars: [4], strokeIndex: [1],
      scores: { m1: { v0: [3], v1: [5], v2: [4], v3: [6] } },
    };
    return { t, m };
  };

  check("cup vegas — a birdie flips the other pair with no house rules set", () => {
    const { t, m } = cupVegas();
    assert(cupVegasRules(t).flipOn === "birdie", `default flip is ${cupVegasRules(t).flipOn}`);
    const n = holeNets(t, m, 0)!;
    assert(n.netA === 35 && n.netB === 64, `${n.netA} v ${n.netB}, want 35 v 64`);
  });

  check("cup vegas — balls stay gross by default", () => {
    assert(!cupVegasRules(cupVegas().t).net, "the cup default went to net balls");
  });

  check("cup vegas — a host who turns flips off keeps them off", () => {
    const { t, m } = cupVegas({ flipOn: "off" });
    assert(cupVegasRules(t).flipOn === "off", "an explicit off was overridden by the default");
    const n = holeNets(t, m, 0)!;
    assert(n.netB === 46, `flip applied while explicitly off (${n.netB})`);
  });

  check("cup vegas — presses and money never reach cup points", () => {
    const r = cupVegasRules(cupVegas().t);
    assert(r.pressAt === 0 && r.pressValue === 0, "the cup default carries a press bet");
  });
}

// ---- Removing a session ----------------------------------------------------
// Everything a session owns has to go with it. The scorecards are keyed by match id
// and the course card and scoring method by round, so leaving either behind meant
// dead weight in storage — and a round-keyed pair waiting to be inherited by whoever
// a later re-order renumbered into that slot.
{
  const cup = () => {
    const P = players(4, true);
    const mk = (round: number, label: string): Match => ({
      id: `s${round}`, phase: "ryder", round, order: 0, label,
      sideA: [P[0].id, P[1].id], sideB: [P[2].id, P[3].id], scoreA: null, scoreB: null,
    });
    const t = tour({
      format: "ryder", participants: P,
      matches: [mk(1, "Fourball"), mk(2, "Foursomes"), mk(3, "Singles")],
      config: cfg(),
    }) as Tournament;
    t.ryderGolf = {
      holes: 1, pars: [4], strokeIndex: [1],
      scores: { s1: { [P[0].id]: [4] }, s2: { [P[0].id]: [5] }, s3: { [P[0].id]: [6] } },
      sessionMethods: { 1: "match", 2: "stroke", 3: "stableford" },
      sessionCourses: { 2: { courseName: "Back nine", pars: [3], strokeIndex: [1] } },
    };
    return t;
  };

  check("remove session — takes its matches, card, course and method with it", () => {
    const t = removeRyderRoundFrom(cup(), 2);
    assert(!t.matches.some((m) => m.round === 2), "the session's matches survived");
    assert(!t.ryderGolf!.scores.s2, "the removed session's scorecard was left behind");
    assert(t.ryderGolf!.sessionMethods![2] === undefined, "its scoring method was left behind");
    assert(t.ryderGolf!.sessionCourses![2] === undefined, "its course card was left behind");
  });

  check("remove session — leaves every other session untouched", () => {
    const t = removeRyderRoundFrom(cup(), 2);
    assert(Object.keys(t.ryderGolf!.scores).sort().join() === "s1,s3", "other cards were disturbed");
    assert(t.ryderGolf!.sessionMethods![1] === "match", "session 1 lost its method");
    assert(t.ryderGolf!.sessionMethods![3] === "stableford", "session 3 lost its method");
    assert(t.config.ryderProgram!.join() === "Fourball,Singles", `program: ${t.config.ryderProgram}`);
  });

  check("remove session — a later re-order can't inherit the gap's leftovers", () => {
    // Drop the middle session, then pull the last one to the front. Nothing should
    // pick up the removed session's back-nine card or its stroke-play rule.
    const t = reorderRyderRounds(removeRyderRoundFrom(cup(), 2), 1, 0);
    const g = t.ryderGolf!;
    assert(Object.keys(g.sessionCourses ?? {}).length === 0, "a stale course card was inherited");
    const roundOf = (label: string) => t.matches.find((m) => m.label === label)!.round;
    assert(g.sessionMethods![roundOf("Singles")] === "stableford", "Singles lost its method");
    assert(g.sessionMethods![roundOf("Fourball")] === "match", "Fourball lost its method");
    assert(!Object.values(g.sessionMethods!).includes("stroke"), "the dropped rule came back");
  });

  check("remove session — removing one that isn't there changes nothing", () => {
    const before = cup();
    assert(removeRyderRoundFrom(before, 9) === before, "a no-op removal rebuilt the cup");
  });
}

// ---- Reordering a cup's sessions -------------------------------------------
// Scorecards are keyed by match id so they ride along with their matches; the course
// card and scoring method are keyed by ROUND and have to be remapped to follow.
{
  const cupOf3 = () => {
    const P = players(4, true);
    const mk = (round: number, label: string): Match => ({
      id: `s${round}`, phase: "ryder", round, order: 0, label,
      sideA: [P[0].id, P[1].id], sideB: [P[2].id, P[3].id], scoreA: null, scoreB: null,
    });
    const t = tour({
      format: "ryder", participants: P,
      matches: [mk(1, "Fourball"), mk(2, "Foursomes"), mk(3, "Singles")],
      config: cfg({ ryderProgram: ["Fourball", "Foursomes", "Singles"] }),
    }) as Tournament;
    t.ryderGolf = {
      holes: 2, pars: [4, 4], strokeIndex: [1, 2],
      scores: {
        s1: { [P[0].id]: [4, 4] },
        s2: { [P[0].id]: [5, 5] },
        s3: { [P[0].id]: [6, 6] },
      },
      sessionMethods: { 1: "match", 2: "stroke", 3: "stableford" },
      sessionCourses: {
        2: { courseName: "Back nine", pars: [3, 3], strokeIndex: [1, 2] },
      },
    };
    return t;
  };

  // The very function the store calls — no mirror to drift out of step with it.
  const moveRound = (t: Tournament, from: number, to: number) => reorderRyderRounds(t, from, to);

  const labelsInOrder = (t: Tournament) =>
    t.matches
      .filter((m) => m.phase === "ryder")
      .sort((a, b) => a.round - b.round)
      .map((m) => m.label)
      .join(",");

  check("cup reorder — the last session can be played first", () => {
    const t = moveRound(cupOf3(), 2, 0);
    assert(labelsInOrder(t) === "Singles,Fourball,Foursomes", labelsInOrder(t));
  });

  check("cup reorder — a session's scorecard follows it", () => {
    const t = moveRound(cupOf3(), 2, 0);
    // Singles is now round 1, and its card (match id s3) is untouched.
    const singles = t.matches.find((m) => m.label === "Singles")!;
    assert(singles.round === 1, `Singles landed on round ${singles.round}`);
    const card = t.ryderGolf!.scores[singles.id];
    assert(card && Object.values(card)[0][0] === 6, "the Singles card did not travel with it");
    // And no card was lost or duplicated.
    assert(Object.keys(t.ryderGolf!.scores).length === 3, "scorecards changed in number");
  });

  check("cup reorder — scoring method and course card follow their session", () => {
    const t = moveRound(cupOf3(), 2, 0);
    const g = t.ryderGolf!;
    const roundOf = (label: string) => t.matches.find((m) => m.label === label)!.round;
    assert(g.sessionMethods![roundOf("Foursomes")] === "stroke", "stroke method left behind");
    assert(g.sessionMethods![roundOf("Singles")] === "stableford", "stableford method left behind");
    assert(g.sessionMethods![roundOf("Fourball")] === "match", "match method left behind");
    assert(
      g.sessionCourses![roundOf("Foursomes")]?.courseName === "Back nine",
      "the back-nine card did not follow Foursomes",
    );
    assert(Object.keys(g.sessionCourses!).length === 1, "a course card was duplicated");
  });

  check("cup reorder — rounds stay 1..n with no gaps or repeats", () => {
    for (const [from, to] of [[0, 2], [2, 0], [1, 2], [0, 1]] as const) {
      const t = moveRound(cupOf3(), from, to);
      const rs = t.matches.filter((m) => m.phase === "ryder").map((m) => m.round).sort();
      assert(rs.join(",") === "1,2,3", `move ${from}→${to} produced rounds ${rs.join(",")}`);
    }
  });

  check("cup reorder — moving a session back where it was restores the cup", () => {
    const before = cupOf3();
    const there = moveRound(before, 0, 2);
    const back = moveRound(there, 2, 0);
    assert(labelsInOrder(back) === labelsInOrder(before), `${labelsInOrder(back)}`);
    assert(
      JSON.stringify(back.ryderGolf!.sessionMethods) ===
        JSON.stringify(before.ryderGolf!.sessionMethods),
      "methods did not come back",
    );
  });

  check("cup reorder — the points on the board don't change with the order", () => {
    const t = cupOf3();
    t.matches = t.matches.map((m) => ({ ...m, scoreA: 1, scoreB: 0 }));
    const before = ryderScore(t.matches, "match");
    const after = ryderScore(moveRound(t, 2, 0).matches, "match");
    assert(before.a === after.a && before.b === after.b, `${before.a}-${before.b} → ${after.a}-${after.b}`);
  });
}

// Live scoring drives the round-robin hero card, so walk a real game point by
// point for every sport that offers it — 1–1 stays on, the winning point ends it.
for (const sport of SPORTS.filter((s) => formatsForSport(s).includes("round-robin")))
  for (const [mode, winBy, endA, endB] of [
    ["win by 2", 2, 12, 10],
    ["straight up", 1, 11, 10],
  ] as [string, number, number, number][])
    check(`point-by-point — ${sport} / ${mode}`, () => {
      const c = cfg({ pointsTo: 11, winBy });
      // Rally up to the score just before the winning point; nothing may finish early.
      for (let a = 0; a <= endA; a++)
        for (let b = 0; b <= endB; b++) {
          const won = isWon(a, b, c);
          const shouldWin = Math.max(a, b) >= 11 && Math.abs(a - b) >= winBy;
          assert(won === shouldWin, `${sport}: ${a}-${b} won=${won}, want ${shouldWin}`);
        }
      assert(isWon(endA, endB, c), `${sport}: ${endA}-${endB} should end the game`);
    });

// Mirrors store.generateFinals for round-robin: top N advance, doubles pair
// best-with-worst, and when the final is only two teams the next tier down plays a
// bronze match. Without this the placement sweep below never builds a podium, so it
// would silently pass while the bug it guards is wide open.
function addFinals(t: Tournament, advanceCount: number, thirdPlace: boolean): Match[] {
  const base = t.matches.filter((m) => m.phase === "rr");
  const st = computeStandings(t.participants, base, t.config.tiebreaker, t.config.rankByWinPct);
  const n = Math.min(advanceCount, st.length);
  const seedIds = st.slice(0, n).map((r) => r.participantId);
  let finals: Match[] = [];
  if (t.playStyle === "doubles") {
    const sides: string[][] = [];
    for (let i = 0; i < Math.floor(seedIds.length / 2); i++) sides.push([seedIds[i], seedIds[seedIds.length - 1 - i]]);
    if (sides.length >= 2) finals = genSingleElimSides(sides, "winners", { thirdPlace });
  } else if (seedIds.length >= 2) {
    finals = genSingleElim(seedIds, "winners", { thirdPlace });
  }
  if (thirdPlace && finals.length && !finals.some((m) => m.phase === "placement")) {
    const need = t.playStyle === "doubles" ? 4 : 2;
    const b = st.slice(n, n + need).map((r) => r.participantId);
    if (b.length === need)
      finals.push({
        id: "bronze", phase: "placement", round: 1, order: 99, label: "Bronze Medal Match",
        sideA: need === 4 ? [b[0], b[3]] : [b[0]],
        sideB: need === 4 ? [b[1], b[2]] : [b[1]],
        scoreA: null, scoreB: null,
      });
  }
  return finals;
}

// ---- Placement numbering: places, counted once, never skipped ----
// The bug this guards: the podium was numbered by place (1st, 2nd, 3rd, 4th) while
// the field kept its raw round-robin number, so a results list read
// "🥉 🥉 4th 4th 9th 10th" — a repeated number followed by a jump. Every place must
// now appear exactly once, in order, with no gaps. Partners share a place, so a
// place can cover several names; that's the only legitimate repeat.
// Doubles is where this bites: partners share a place, so a raw round-robin number
// no longer equals the place and the two systems diverge. Singles hides the bug —
// one player per place makes them coincide — so both styles are swept.
// golf/ryder declare no play styles (they're neither singles nor doubles), so they
// fall back to one pass rather than being silently dropped from the sweep.
const placementStyles = (fmt: Format): PlayStyle[] => {
  const s = playStylesForFormat(fmt).filter((x) => x === "singles" || x === "doubles");
  return s.length ? s : ["singles"];
};
// Who is drawn against whom in the finals, order-independent — the thing that must
// track the standings while the bracket is unplayed.
const seedSig = (t: Tournament): string =>
  t.matches
    .filter((m) => m.phase !== "rr" && m.phase !== "pool")
    .map((m) => `${m.phase}:${m.round}:${m.order}:${[...m.sideA].sort().join("+")}v${[...m.sideB].sort().join("+")}`)
    .sort()
    .join("|");

// Mirrors records.rosterOf — a team participant expands to the people on it.
const rosterOfAll = (t: Tournament): string[] =>
  t.participants.flatMap((p) => (p.members?.length ? p.members : [p.name]));

function checkPlacementNumbering(
  sport: string,
  fmt: Format,
  style: PlayStyle,
  advanceCount: number,
  n: number,
  thirdPlace = true,
) {
  check(`placement numbering — ${sport} / ${fmt} / ${style} / top ${advanceCount} / n=${n}${thirdPlace ? "" : " / no bronze"}`, () => {
        const P = players(n, fmt === "ryder");
        const t = tour({
          sport,
          format: fmt,
          playStyle: style,
          participants: P,
          config: cfg({ rounds: 2, courts: 2, poolCount: 2, advanceCount, thirdPlace }),
        });
        t.matches = fmt === "ryder" ? genRyder(P, { foursomes: 1, fourball: 1, singles: 1 }) : buildMatches(t);
        if (fmt === "golf") {
          t.golf = defaultGolf(9, P.map((p) => p.id));
          // Every card filled, all different, so the leaderboard has a strict order.
          P.forEach((p, i) => (t.golf!.scores[p.id] = Array.from({ length: 9 }, () => 3 + (i % 4))));
        }
        for (const m of t.matches) {
          if (!m.sideA.length || !m.sideB.length) continue;
          m.scoreA = 11;
          m.scoreB = 4 + (m.round % 3);
        }
        // Round-robin only crowns a podium once its finals bracket exists — build and
        // play it, or this sweep never reaches the code that numbers the field.
        // Doubles with only 2 advancing is a single team, so the app builds no bracket
        // at all; that's a legitimate pure-standings result, not a vacuous test.
        if (fmt === "round-robin") {
          const finals = addFinals(t, advanceCount, true);
          if (finals.length) {
            t.matches = propagateBracket([...t.matches, ...finals]);
            for (let guard = 0; guard < 50; guard++) {
              const next = t.matches.find((m) => m.phase !== "rr" && m.sideA.length && m.sideB.length && m.scoreA === null);
              if (!next) break;
              next.scoreA = 11;
              next.scoreB = 6;
              t.matches = propagateBracket(t.matches);
            }
            assert(t.matches.some((m) => m.phase !== "rr"), "finals vanished — sweep would be vacuous");
          }
        }
        t.matches = propagateBracket(t.matches);

        const places = getPlacements(t);
        if (!places.length) return; // nothing finished — nothing to number
        const ranks = places.map((p) => p.rank);
        // Placements come back best → worst.
        for (let i = 1; i < ranks.length; i++)
          assert(ranks[i] > ranks[i - 1], `places out of order: ${ranks.join(",")}`);
        // Each place counted once, no gaps: 1, 2, 3, … k.
        assert(ranks[0] === 1, `first place is ${ranks[0]}, want 1`);
        ranks.forEach((r, i) => assert(r === i + 1, `place ${r} at index ${i} — gap in ${ranks.join(",")}`));
        // A medal must sit on the place it names.
        for (const p of places) {
          if (p.medal === "gold") assert(p.rank === 1, `gold at place ${p.rank}`);
          if (p.medal === "silver") assert(p.rank === 2, `silver at place ${p.rank}`);
          if (p.medal === "bronze") assert(p.rank === 3, `bronze at place ${p.rank}`);
        }
        // Everyone rostered lands somewhere, exactly once.
        const named = places.flatMap((p) => p.names);
        assert(new Set(named).size === named.length, `someone placed twice: ${named.join(",")}`);
        // Nobody is dropped: a finished event places its whole field.
        assert(
          named.length === rosterOfAll(t).length,
          `${named.length} of ${rosterOfAll(t).length} players placed`,
        );
  });
}

// Every sport × every format it offers, at a normal party size.
for (const sport of SPORTS)
  for (const fmt of formatsForSport(sport).filter((f) => f !== "custom" && f !== "ladder"))
    for (const style of placementStyles(fmt))
      for (const advanceCount of [2, 4]) checkPlacementNumbering(sport, fmt, style, advanceCount, 12);

// Size sweep — the numbering must hold for a big field, not just a 12-player night.
// 30 and 33 are the awkward ones: not powers of two, so the finals bracket carries byes,
// and an odd count leaves someone sitting out each round.
for (const n of [4, 8, 16, 20, 24, 30, 32, 33])
  for (const style of ["singles", "doubles"] as PlayStyle[])
    for (const advanceCount of [2, 4, 8, 16])
      for (const thirdPlace of [true, false]) {
        if (advanceCount > n) continue;
        checkPlacementNumbering("Pickleball", "round-robin", style, advanceCount, n, thirdPlace);
      }

// ---- Nobody is silently benched ----
// Rotating doubles builds rounds × games-per-round games, and games per round are capped
// by COURTS, not headcount — so a big field can outrun the schedule and some players get
// zero games. SetupPanel warns using the arithmetic below; if the scheduler and the
// warning ever disagree, the warning is lying to the host. This pins them together.
for (const n of [8, 12, 16, 24, 30, 33])
  for (const courts of [1, 2, 4, 8])
    for (const rounds of [1, 3, 5, 10])
      check(`bench warning matches the schedule — n=${n} / ${courts} courts / ${rounds} rounds`, () => {
        const P = players(n);
        const ms = genDoublesRR(P.map((p) => p.id), rounds, courts);
        const games = new Map<string, number>();
        for (const m of ms) [...m.sideA, ...m.sideB].forEach((id) => games.set(id, (games.get(id) ?? 0) + 1));
        const actualBenched = P.filter((p) => !games.get(p.id)).length;

        // The exact arithmetic SetupPanel shows the host.
        const perGame = 4;
        const maxCourts = Math.max(1, Math.floor(n / perGame));
        const seatsPerRound = Math.min(Math.max(1, courts), maxCourts) * perGame;
        const predicted = Math.max(0, n - rounds * seatsPerRound);

        assert(
          predicted === actualBenched,
          `warning says ${predicted} benched, scheduler benched ${actualBenched}`,
        );
        // And the round count it recommends must genuinely seat everyone.
        const roundsForAll = Math.ceil(n / seatsPerRound);
        const fixed = genDoublesRR(P.map((p) => p.id), roundsForAll, courts);
        const played = new Set(fixed.flatMap((m) => [...m.sideA, ...m.sideB]));
        assert(played.size === n, `advice of ${roundsForAll} rounds still leaves ${n - played.size} out`);
      });

// ---- The finals bracket must never be stale or duplicated ----
// Seeding the bracket early froze whoever led at that moment. Play the round robin out
// and the wrong people were still in the final — Standings said "top 4 advance" with one
// name while the bracket had another, and nothing said so. An unplayed draw is only a
// projection, so it tracks the standings until someone actually starts playing it.
for (const style of ["singles", "doubles"] as PlayStyle[])
  for (const n of [8, 12, 16, 30]) {
    check(`bracket tracks standings until it starts — ${style} / n=${n}`, () => {
      const P = players(n);
      const t = tour({
        format: "round-robin",
        playStyle: style,
        participants: P,
        config: cfg({ rounds: 3, courts: 2, advanceCount: 4, thirdPlace: true }),
      });
      t.matches = buildMatches(t);

      // Seed the bracket with an EMPTY table — the footgun the app allows.
      t.matches = [...t.matches, ...buildFinals(t)];
      const seededEarly = seedSig(t);

      // Now play the round robin, with the BACK half of the field winning everything,
      // so the true top 4 cannot be who was seeded from an empty table.
      const strong = new Set(P.slice(-Math.ceil(n / 2)).map((p) => p.id));
      let out = t;
      for (const m of out.matches.filter((m) => m.phase === "rr")) {
        if (!m.sideA.length || !m.sideB.length) continue;
        const aStrong = m.sideA.filter((i) => strong.has(i)).length;
        const bStrong = m.sideB.filter((i) => strong.has(i)).length;
        const aWins = aStrong >= bStrong;
        m.scoreA = aWins ? 11 : 3;
        m.scoreB = aWins ? 3 : 11;
        m.final = true;
        out = resyncFinals(out); // what the store now does on every score
      }

      // The seeded draw must have followed the results.
      const want = seedSig({ ...out, matches: [...out.matches.filter((m) => m.phase === "rr"), ...buildFinals(out)] });
      assert(seedSig(out) === want, `bracket is stale: ${seedSig(out)} vs standings ${want}`);
      if (n >= 12) assert(seedSig(out) !== seededEarly, "test is vacuous — the draw never needed to change");

      // Exactly one bronze match, ever — re-seeding used to stack up copies.
      const bronze = out.matches.filter((m) => m.phase === "placement");
      assert(bronze.length <= 1, `${bronze.length} bronze matches`);
    });

    check(`a started bracket is never rewritten — ${style} / n=${n}`, () => {
      const P = players(n);
      const t = tour({
        format: "round-robin",
        playStyle: style,
        participants: P,
        config: cfg({ rounds: 3, courts: 2, advanceCount: 4, thirdPlace: true }),
      });
      t.matches = buildMatches(t);
      for (const m of t.matches) {
        if (!m.sideA.length || !m.sideB.length) continue;
        m.scoreA = 11;
        m.scoreB = 3;
        m.final = true;
      }
      t.matches = [...t.matches, ...buildFinals(t)];
      // Someone starts the final.
      const f = t.matches.find((m) => m.phase === "winners" && m.sideA.length && m.sideB.length);
      if (!f) return;
      f.scoreA = 5;
      f.scoreB = 4;
      f.final = false;
      const locked = seedSig(t);
      // Re-scoring a round-robin game must NOT redraw a final that's under way.
      const rr = t.matches.find((m) => m.phase === "rr")!;
      rr.scoreA = 3;
      rr.scoreB = 11;
      const after = resyncFinals(t);
      assert(seedSig(after) === locked, "a live final was redrawn under the players");
    });
  }

// The bronze match is part of the bracket, not the round robin: its result must not
// move the standings, and clearing the bracket must take it with it.
check("bronze match belongs to the bracket, not the standings", () => {
  const P = players(12);
  const t = tour({
    format: "round-robin",
    participants: P,
    config: cfg({ rounds: 3, courts: 2, advanceCount: 4, thirdPlace: true }),
  });
  t.matches = buildMatches(t);
  for (const m of t.matches) {
    if (!m.sideA.length || !m.sideB.length) continue;
    m.scoreA = 11;
    m.scoreB = 3;
    m.final = true;
  }
  const before = computeStandings(P, t.matches.filter((m) => m.phase === "rr")).map((r) => r.participantId + ":" + r.wins).join(",");
  t.matches = [...t.matches, ...buildFinals(t)];
  const bronze = t.matches.find((m) => m.phase === "placement");
  assert(bronze, "no bronze match generated");
  bronze!.scoreA = 11;
  bronze!.scoreB = 2;
  bronze!.final = true;
  // buildFinals seeds from base matches — the bronze result must not leak into them.
  const after = computeStandings(
    P,
    t.matches.filter((m) => m.phase === "rr"),
  ).map((r) => r.participantId + ":" + r.wins).join(",");
  assert(before === after, "bronze match result changed the round-robin standings");
});

// ---- The draw is a draw, not the order you typed ----
// Every generator seeds off the roster list, so without a shuffle the schedule just reads
// down the order players were entered: type a couple in together and they partner up every
// single time. `order` is the seam generate() shuffles through.
for (const n of [8, 12, 16, 30]) {
  check(`shuffled draw changes the matchups — n=${n}`, () => {
    const P = players(n);
    const ids = P.map((p) => p.id);
    const t = tour({ format: "round-robin", playStyle: "doubles", participants: P, config: cfg({ rounds: 3, courts: 3 }) });
    const sig = (ms: Match[]) => ms.map((m) => `${m.round}:${m.sideA.join("+")}v${m.sideB.join("+")}`).join("|");

    const typed = sig(buildMatches(t, ids));
    // Same order in ⇒ same schedule out: the generator itself stays reproducible.
    assert(typed === sig(buildMatches(t, ids)), "same order produced two different schedules");

    // Across many shuffles the draw must actually move.
    const seen = new Set<string>();
    for (let i = 0; i < 25; i++) seen.add(sig(buildMatches(t, shuffled(ids))));
    assert(seen.size > 1, "shuffling the order changed nothing — the draw is not random");
  });

  check(`typed order is honoured when random draw is off — n=${n}`, () => {
    const P = players(n);
    const ids = P.map((p) => p.id);
    const t = tour({ format: "round-robin", playStyle: "doubles", participants: P, config: cfg({ rounds: 1, courts: 2 }) });
    const first = buildMatches(t, ids).filter((m) => m.round === 1 && m.sideA.length && m.sideB.length)[0];
    // With the list untouched, round 1 opens with the first four people typed.
    assert(first, "no round-1 game");
    const opening = [...first.sideA, ...first.sideB];
    assert(
      opening.every((id) => ids.slice(0, 4).includes(id)),
      `round 1 should open with the first four typed, got ${opening.join(",")}`,
    );
  });
}

check("shuffled keeps everyone exactly once", () => {
  const ids = players(30).map((p) => p.id);
  for (let i = 0; i < 50; i++) {
    const s = shuffled(ids);
    assert(s.length === ids.length, `shuffle changed the roster size: ${s.length}`);
    assert(new Set(s).size === ids.length, "shuffle duplicated or dropped someone");
  }
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
