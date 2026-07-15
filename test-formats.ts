/* Headless glitch sweep: every format × many sizes × sports, through generate→score→result.
   Run: npx tsx test-formats.ts                                                            */
import { genSinglesRR, genDoublesRR, genSwissRound, genKotcNext, genMexicanoRound } from "./src/lib/schedule";
import { genSingleElim, genSingleElimSides, genDoubleElim, propagateBracket, bracketChampion } from "./src/lib/bracket";
import { buildMatches } from "./src/lib/store";
import { genRyder, genRyderSession, ryderScore, RyderSessionType } from "./src/lib/ryder";
import { computeStandings, pointsLeaderboard } from "./src/lib/standings";
import {
  defaultGolf,
  computeGolf,
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
