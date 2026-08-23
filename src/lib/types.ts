// Core domain types for the tournament builder.

export type Format =
  | "round-robin"
  | "swiss"
  | "kotc"
  | "single-elim"
  | "double-elim"
  | "pool-bracket"
  | "americano"
  | "mexicano"
  | "ryder"
  | "golf"
  | "custom"
  | "score-challenge"
  | "ladder";

// singles: each participant is one person, matches are 1v1
// doubles: individuals enter; round-robin/pool rotate partners; standings are per-person
// teams: each participant IS a team (e.g. a fixed doubles pair "Cody / Adam")
export type PlayStyle = "singles" | "doubles" | "doubles-fixed" | "teams";

export type Phase =
  | "rr"
  | "pool"
  | "winners"
  | "losers"
  | "final"
  | "championship"
  | "placement" // 3rd-place / consolation games
  | "ryder"; // Ryder Cup team match-play games

export interface Participant {
  id: string;
  name: string;
  seed?: number; // optional manual seed override
  team?: 0 | 1; // Ryder Cup team assignment
  handicap?: number; // golf handicap (for net scoring)
  members?: string[]; // roster for fixed-doubles pairs & teams (the unit still competes as one)
  photo?: string; // small inline data-URL thumbnail (shown instead of initials)
  color?: string; // chosen avatar/jersey color (overrides the palette assignment)
  tee?: string; // golf: name of the tee set they play (drives course-handicap math)
}

export type GolfMode =
  | "stroke"
  | "stableford"
  | "skins"
  | "scramble"
  | "bestball"
  | "shamble"
  | "vegas"
  | "nassau"
  | "bingo"
  | "wolf"
  | "mixed";

export const GOLF_MODE_LABELS: Record<GolfMode, string> = {
  stroke: "Stroke Play",
  stableford: "Stableford",
  skins: "Skins",
  scramble: "Scramble (teams)",
  bestball: "Best Ball (pairs)",
  shamble: "Shamble (pairs)",
  vegas: "Vegas (2v2)",
  nassau: "Nassau",
  bingo: "Bingo Bango Bongo",
  wolf: "Wolf",
  mixed: "Build Your Own",
};

export const GOLF_MODE_BLURBS: Record<GolfMode, string> = {
  stroke: "Count every stroke — lowest net total wins. Standard golf.",
  stableford: "Earn points each hole by net score vs par (e.g. birdie 3, par 2, bogey 1). Most points wins.",
  skins: "Every hole is a 'skin' — the lowest net score takes it; a tie carries the skin to the next hole.",
  scramble: "Team game: everyone tees off, the team plays its next shot from the best ball, and repeats. One score per team per hole.",
  bestball: "Pairs: everyone plays their own ball, and the pair counts its better score each hole. Enter one score per pair — the better ball.",
  shamble: "Pairs take the best drive, then each plays their own ball in; the pair counts its better score. Enter one score per pair.",
  vegas: "2v2: each hole both partners' scores combine into one number, low ball first (4 & 5 → 45), and the lower number wins the difference in points. Four players, teams are the first two vs the last two, and balls pick up at 9. House rules add the flip (your birdie turns the other team's number around), auto-presses, carries and the money.",
  nassau: "Three matches in one — front 9, back 9, and overall 18 — each scored as net match play.",
  bingo: "A point for first on the green (bingo), closest to the pin once all are on (bango), and first in the hole (bongo).",
  wolf: "Each hole one player is the 'Wolf' and picks a partner after the tee shots — or plays alone (Lone Wolf) for bigger points.",
  mixed: "Build Your Own: assign a different game to each stretch of holes; the winner of each segment earns a point.",
};

// How a golf card is read into a result. "match" needs exactly two sides on the card
// (two players, or two pairs/teams) — with three or more there is no match to play,
// so it is offered only when the field is two.
export type GolfScoring = "stroke" | "stableford" | "skins" | "match";

export const GOLF_SCORING_LABELS: Record<GolfScoring, { label: string; hint: string }> = {
  stroke: { label: "Stroke play", hint: "lowest net total wins" },
  stableford: { label: "Stableford", hint: "points vs par each hole — most points wins" },
  skins: { label: "Skins", hint: "low net takes the hole; a tie carries it over" },
  match: { label: "Match play", hint: "hole by hole — most holes won wins (two sides only)" },
};

/**
 * Vegas à la carte. Every rule past the basic combined-number scoring is optional,
 * so a group can play the plain game, the full money game, or anything between.
 */
export interface VegasRules {
  /** Combine net scores rather than gross (handicap strokes come off per hole). */
  net: boolean;
  /** What in a team's own scores flips the OPPONENT's number (high ball first).
   *  "birdie" means birdie-or-better, so an eagle flips too. */
  flipOn: "off" | "birdie" | "eagle";
  /** Teams for the round: fixed all 18, partners rotating every 6 holes, or
   *  picked hole by hole (true Vegas: whoever's tee shots land left & right). */
  teams: "fixed" | "rotate6" | "byHole";
  /** Auto-press when the margin reaches this many points. 0 = no presses. */
  pressAt: number;
  /** Cap on presses running at once. 0 = uncapped. */
  maxPresses: number;
  /** A tied hole's stake carries into the next hole, on every live bet. */
  carryTies: boolean;
  /** Money per point on the original bet, and on each press. */
  pointValue: number;
  pressValue: number;
}

export const VEGAS_DEFAULTS: VegasRules = {
  net: true,
  flipOn: "birdie",
  teams: "fixed",
  pressAt: 5,
  maxPresses: 3,
  carryTies: true,
  pointValue: 1,
  pressValue: 5,
};

/** The plain game: combine, low ball first, lower number takes the difference. */
export const VEGAS_BASIC: VegasRules = {
  net: false,
  flipOn: "off",
  teams: "fixed",
  pressAt: 0,
  maxPresses: 0,
  carryTies: false,
  pointValue: 1,
  pressValue: 0,
};

/**
 * What a cup's Vegas session plays when the host hasn't set house rules.
 *
 * The plain game but with the flip on, because the flip is Vegas — a birdie turning
 * the other pair's number around is the whole point of the game, and a cup session
 * defaulting to "no flips" meant the headline rule was off unless you found the 🎰
 * card. Balls stay gross: the combined number is its own equalizer.
 *
 * Presses and money are deliberately absent. They're side bets that belong to the
 * standalone game, never to cup points.
 */
export const CUP_VEGAS_DEFAULTS: VegasRules = { ...VEGAS_BASIC, flipOn: "birdie" };

// A stretch of holes (1-based, inclusive) scored by a chosen format — for "Build Your Own".
// Individual formats: stroke/stableford/skins/bingo. Team formats (one score per team):
// scramble/bestball/altshot — all scored to-par like stroke, just played differently.
export type SegmentFormat =
  | "stroke"
  | "stableford"
  | "skins"
  | "bingo"
  | "scramble"
  | "bestball"
  | "shamble"
  | "altshot";
export interface GolfSegment {
  from: number;
  to: number;
  format: SegmentFormat;
}

export const SEGMENT_LABELS: Record<SegmentFormat, string> = {
  stroke: "Stroke Play",
  stableford: "Stableford",
  skins: "Skins",
  bingo: "Bingo Bango Bongo",
  scramble: "Scramble",
  bestball: "Best Ball",
  shamble: "Shamble",
  altshot: "Alternate Shot",
};

export const SEGMENT_BLURBS: Record<SegmentFormat, string> = {
  stroke: "Lowest net score over these holes wins the segment.",
  stableford: "Most Stableford points (net score vs par) over these holes wins.",
  skins: "Win the most holes outright on low net over this stretch — ties carry over.",
  bingo: "Bingo Bango Bongo points (first on, closest once all on, first in) over these holes.",
  scramble: "Everyone hits, then the team plays from the best shot — lowest team score wins.",
  bestball: "Each teammate plays their own ball; the team takes the lower score each hole.",
  shamble: "Take the best drive, then everyone plays their own ball in; the team takes the lower score.",
  altshot: "Alternate Shot: partners share one ball, taking turns hitting each shot.",
};

// Segment formats that are team games (one score per team).
export const TEAM_SEGMENT_FORMATS: SegmentFormat[] = ["scramble", "bestball", "shamble", "altshot", "stableford", "skins"];
export const SOLO_SEGMENT_FORMATS: SegmentFormat[] = ["stroke", "stableford", "skins", "bingo"];

// Per-hole award winners for Bingo Bango Bongo (participantId or null).
export interface BbbData {
  bingo: (string | null)[]; // first on the green
  bango: (string | null)[]; // closest once all are on
  bongo: (string | null)[]; // first in the hole
}

// Per-hole Wolf choice: the wolf's partner id, "lone", or null (undecided).
export interface WolfData {
  partner: (string | "lone" | null)[];
}

// One set of tees at a course. Rating/slope drive the USGA course-handicap math:
// course handicap = round(index × slope/113 + (rating − par)).
export interface TeeSet {
  name: string; // e.g. "Blue", "White (M)"
  gender?: "M" | "F";
  rating: number; // course rating for these tees
  slope: number; // slope rating (55–155, 113 = standard)
  par: number; // total par from these tees
  yards?: number;
}

// A reusable course saved to the library (pars + stroke index per hole).
export interface Course {
  id: string;
  name: string;
  holes: number;
  pars: number[];
  strokeIndex: number[];
  tees?: TeeSet[]; // available tee sets (for course-handicap adjustment)
}

// A saved player you compete with often — pick them into a tournament instead of retyping.
export interface Friend {
  id: string;
  name: string;
  handicap?: number; // golf handicap index, carried into golf/Ryder events
  photo?: string;
  color?: string;
}

export interface GolfData {
  holes: number; // 9 or 18
  startHole?: number; // first hole number played (1 for front/18-hole, 10 for back 9) — display only
  courseName?: string; // name of the course being played
  pars: number[]; // par for each hole
  strokeIndex: number[]; // 1..holes difficulty ranking (for net allocation)
  tees?: TeeSet[]; // tee sets at this course; players' `tee` picks drive course handicaps
  scores: Record<string, (number | null)[]>; // participantId -> strokes per hole
  pins?: ([number, number] | null)[]; // per-hole green/pin location [lng, lat] for GPS distance
  bbb?: BbbData; // Bingo Bango Bongo awards
  wolf?: WolfData; // Wolf partner choices
  segments?: GolfSegment[]; // "Build Your Own": format per hole range
  teams?: boolean; // "Build Your Own" played as teams (one score per team per hole)
  // Vegas "pick per hole" partners: per-hole pairing choice for player 1 —
  // 0 = with player 2, 1 = with player 3, 2 = with player 4. null inherits the
  // previous hole's pairing (holes before any pick use pairing 0).
  vegasPairs?: (0 | 1 | 2 | null)[];
}

export interface Match {
  id: string;
  phase: Phase;
  round: number; // 1-based within phase
  order: number; // position within the round (for layout)
  court?: number;
  poolId?: string;
  label?: string; // e.g. "Semifinal", "Court 2"

  // Participant ids occupying each side. 1 id (singles/teams) or 2 ids (rotating doubles).
  sideA: string[];
  sideB: string[];
  // Placeholder text when a side is filled by a future result (brackets).
  sideALabel?: string;
  sideBLabel?: string;

  scoreA: number | null;
  scoreB: number | null;
  // Is the result in? Distinguishes a live score from a finished one — without it,
  // scoring point-by-point ends the game the moment both sides have any number.
  //   undefined = legacy/typed result (both scores present ⇒ final)
  //   false     = being scored live, still on court
  //   true      = finished (target reached, or the host ended it)
  final?: boolean;

  // Bracket routing
  nextMatchId?: string;
  nextSlot?: "A" | "B";
  loserNextMatchId?: string; // double elimination
  loserNextSlot?: "A" | "B";
}

// Ryder Cup played on a course: per-hole gross scores per match, with handicaps.
export interface RyderGolf {
  holes: number;
  pars: number[];
  strokeIndex: number[];
  courseName?: string;
  // matchId -> entityKey -> per-hole gross. entityKey is a participantId (singles/fourball)
  // or "A"/"B" for a Foursomes team ball.
  scores: Record<string, Record<string, (number | null)[]>>;
  // Multi-course cups: an optional per-session (round number) card override —
  // e.g. four 18-hole rounds at four courses, each split into front/back nine
  // sessions. pars/strokeIndex are pre-sliced to the session length, with the
  // stroke index re-ranked 1..n within the nine.
  sessionCourses?: Record<
    number,
    { courseName?: string; nine?: "front" | "back"; pars: number[]; strokeIndex: number[] }
  >;
  // How each session (round number) decides its matches. Absent = match play, the
  // classic cup default. Vegas and Team Stableford ignore this: their comparison is
  // the game itself, so there is nothing to re-score.
  sessionMethods?: Record<number, RyderMethod>;
  // Points on the line in a given session, overriding the cup-wide number and the
  // preset. Lets a day escalate — a 2-point Fourball, a 4-point Scramble, then
  // Singles worth 8 — instead of every session being worth the same.
  sessionPoints?: Record<number, number>;
}

// How a session's winner is worked out from the same scorecard:
//   "match"      — hole by hole; most holes won takes it (can close out early).
//   "stroke"     — lowest net total over the session takes it.
//   "stableford" — points vs par each hole; most points takes it.
export type RyderMethod = "match" | "stroke" | "stableford" | "vegas";

export const RYDER_METHOD_LABELS: Record<RyderMethod, { label: string; hint: string }> = {
  match: { label: "Match play", hint: "hole by hole — most holes won wins, and it can close out early" },
  stroke: { label: "Stroke play", hint: "lowest net total over the whole session wins" },
  stableford: { label: "Stableford", hint: "points vs par each hole — most points wins" },
  // Fixed to Vegas sessions (never offered in the picker): the lower combined
  // number takes the DIFFERENCE in points each hole — 45 vs 55 pays 10.
  vegas: { label: "Vegas points", hint: "the lower combined number wins the difference each hole — 45 vs 55 pays 10" },
};

export type Tiebreaker = "record" | "diff" | "headToHead" | "pointsFor";

export const TIEBREAKER_LABELS: Record<Tiebreaker, string> = {
  record: "Wins & losses, then point differential",
  diff: "Point differential",
  headToHead: "Head-to-head, then point differential",
  pointsFor: "Total points scored",
};

export interface TournamentConfig {
  rounds: number; // round-robin rounds
  courts: number; // simultaneous games
  pointsTo: number; // games played to N — live scoring auto-finishes a game here
  randomDraw?: boolean; // shuffle the draw instead of using the order players were typed. Default true.
  winBy?: number; // margin needed to win: 1 = straight up, 2 = pickleball/tennis. Default 2 (see lib/score).
  winByTwo?: boolean; // superseded by winBy; still read so older tournaments keep their rules.
  timeLimitMin: number; // 0 = no clock; otherwise games end at N points OR this many minutes, whichever first
  advanceCount: number; // top N advance from RR / overall pools
  poolCount: number; // pool-bracket: number of pools
  bracketType: "single" | "double"; // pool-bracket: knockout style after pools
  tiebreaker: Tiebreaker; // how to break equal win-loss records
  rankByWinPct?: boolean; // rank by win % (wins ÷ games played) instead of raw wins — fairer when byes leave players with unequal game counts
  bronzeMatch?: boolean; // add a 3rd-place (bronze) match among the next tier after the finalists
  thirdPlace: boolean; // add a 3rd-place game to single-elimination brackets
  teamNames: [string, string]; // Ryder Cup team names
  ryderFoursomes: number; // Ryder Cup: # of Foursomes (alternate shot) sessions
  ryderFourball: number; // Ryder Cup: # of Fourball (best ball) sessions
  ryderSingles: number; // Ryder Cup: # of Singles sessions
  // Ryder Cup scoring granularity:
  //   "match" (default) — classic: every match is worth 1 point.
  //   "session"         — each session (round) is worth 1 point, split across
  //                       its matches (a 2-match pairs session pays ½ per match).
  //   "round18"         — each 18 holes is worth 1 point: with 9-hole sessions,
  //                       consecutive sessions pair up (front+back nine) and
  //                       split the point across all their matches.
  ryderScoring?: "match" | "session" | "round18";
  // Points on the line in each session, set as a plain number (2, 1, 0.5…) and split
  // evenly across the session's matches. Takes precedence over `ryderScoring`, which
  // stays as the preset form of the same idea for cups that never set a number.
  ryderPointsPerSession?: number;
  // The cup's session program (labels in playing order), mirrored from the
  // generated sessions so Edit setup can restore the list instead of wiping it.
  ryderProgram?: string[];
  golfMode: GolfMode; // how the golf round is PLAYED (drives score entry: per player, or one ball per team)
  // How that same card is READ. Independent of golfMode, so a Best Ball round can be
  // settled on strokes, Stableford points, skins, or as a match — without re-entering
  // anything or changing how scores are typed in. Absent = the format's own default.
  golfScoring?: GolfScoring;
  // Vegas house rules — which parts of the full game this round is playing.
  vegasRules?: VegasRules;
  // True when the Vegas card holds each player's own ball (four players) rather than
  // one pre-combined number per pair. Only a per-player card can show a birdie, so
  // only these rounds can run flips, presses and the settlement.
  vegasPerPlayer?: boolean;
  scoreLowWins: boolean; // Score Challenge: lowest total wins (e.g. disc golf) vs highest
}

export interface Tournament {
  id: string;
  name: string;
  sport: string;
  format: Format;
  playStyle: PlayStyle;
  participants: Participant[];
  matches: Match[];
  golf?: GolfData;
  ryderGolf?: RyderGolf;
  scoreChallenge?: { scores: Record<string, (number | null)[]> }; // Score Challenge: per-round scores
  ladder?: { order: string[] }; // Ladder: participant ids in rank order (index 0 = #1)
  config: TournamentConfig;
  createdAt: number;
  updatedAt: number;
  generated: boolean; // schedule/bracket built
  liveCode?: string; // when set, this tournament is synced to a live session
  liveVersion?: number; // last server version this device has applied
  spectator?: boolean; // joined via live code as a viewer — read-only, can't edit scores
  // Registration ids already imported into the roster once. A registrant the host
  // then removes stays removed — the lobby poll must not resurrect them.
  syncedRegs?: string[];
  scorers?: string[]; // participant names the host lets keep score from their own device
  // Per-match game clocks, synced so everyone watching sees the same countdown.
  // endAt = ms timestamp it hits zero (running); leftSec = frozen remaining (paused).
  clocks?: Record<string, { endAt?: number; leftSec?: number }>;
}

export const FORMAT_LABELS: Record<Format, string> = {
  "round-robin": "Round Robin",
  swiss: "Swiss",
  kotc: "King of the Court",
  "single-elim": "Single Elimination",
  "double-elim": "Double Elimination",
  "pool-bracket": "Pool Play → Bracket",
  americano: "Americano",
  mexicano: "Mexicano",
  ryder: "Ryder Cup Style (Team Golf)",
  golf: "Traditional",
  custom: "Custom (build your own)",
  "score-challenge": "Score Challenge",
  ladder: "Ladder",
};

export const FORMAT_BLURBS: Record<Format, string> = {
  "round-robin":
    "Everyone plays. Standings by wins, then point differential. Top N advance to a final.",
  swiss:
    "Fixed number of rounds; each round you're paired against someone with a similar record. No one's eliminated — scales to lots of players.",
  kotc:
    "Winner stays on, loser rotates out, next challenger comes on. First to the win target takes the crown. Fast and casual.",
  "single-elim": "Seeded knockout bracket. Lose once and you're out.",
  "double-elim": "Knockout with a losers bracket — one loss before elimination.",
  "pool-bracket": "Group-stage round robin, then top finishers seed into a knockout bracket.",
  americano:
    "Social mixer: rotate partners every round and play with & against everyone. You earn individual points each game — most points wins. A pickleball/padel favorite.",
  mexicano:
    "Like Americano, but each round's matchups are set by the current standings (top players paired together & against) to keep games balanced. Individual points decide it.",
  ryder:
    "Two teams battle for the cup — traditional Ryder Cup (foursomes, fourball, singles) or build your own: any mix of Best Ball, Shamble, Scramble, Vegas & team games in 6-, 9-, or 18-hole sessions, one course or many.",
  golf:
    "Hole-by-hole scorecard with handicaps. Score it as Stroke Play (gross/net), Stableford, Skins, or a team Scramble — switch anytime.",
  custom:
    "A blank slate — add players, then create each round's matchups yourself. The app tracks scores and the leaderboard. For events that don't fit a standard format.",
  "score-challenge":
    "Everyone posts a score each round and is ranked by total — no head-to-head. Perfect for bowling, pop-a-shot, or darts. Pick whether highest or lowest total wins.",
  ladder:
    "An ongoing challenge ladder — players are ranked, and you challenge someone above you. Win and you swap spots. Great for club/ongoing play (tennis, pickleball, racquetball, pool, foosball, chess).",
};

// Common tournament-able sports/activities for the picklist. "Other…" is added
// by the UI to allow any custom sport or non-sport bracket.
export const SPORTS: string[] = [
  "Golf",
  "Pickleball",
  "Tennis",
  "Table Tennis (Ping Pong)",
  "Foosball",
  "Basketball",
  "Cornhole",
  "Spikeball",
  "Volleyball",
  "Soccer",
  "Flag Football",
  "Disc Golf",
  "Darts",
  "Pool / Billiards",
  "Bowling",
  "Badminton",
  "Racquetball",
  "Pop-A-Shot",
  "Cup Pong",
  "Chess",
  "Video Games / Esports",
  "Board Games",
];

export const ALL_FORMATS: Format[] = [
  "round-robin",
  "swiss",
  "kotc",
  "single-elim",
  "double-elim",
  "pool-bracket",
  "americano",
  "mexicano",
  "ryder",
  "golf",
  "custom",
  "score-challenge",
  "ladder",
];

// Specialist formats only fit certain kinds of sport, so they're layered onto a
// universal base instead of shown everywhere:
//  - kotc (winner-stays-on): fast games you "hold" a court/table/screen at.
//  - americano/mexicano (rotating-partner 2v2): doubles-capable point games only.
//  - score-challenge (post a number, high/low wins): solo-score games, not head-to-head.
const KOTC_SPORTS = new Set([
  "Pickleball",
  "Tennis",
  "Table Tennis (Ping Pong)",
  "Badminton",
  "Racquetball",
  "Spikeball",
  "Cornhole",
  "Cup Pong",
  "Beer Pong", // legacy alias — tournaments created before the rename keep their formats
  "Foosball",
  "Basketball",
  "Volleyball",
  "Soccer",
  "Flag Football",
  "Pool / Billiards",
  "Video Games / Esports",
]);
const AMERICANO_SPORTS = new Set([
  "Pickleball",
  "Tennis",
  "Table Tennis (Ping Pong)",
  "Badminton",
  "Racquetball",
  "Spikeball",
  "Cornhole",
  "Cup Pong",
  "Beer Pong", // legacy alias
  "Foosball",
]);
const SCORE_CHALLENGE_SPORTS = new Set([
  "Bowling",
  "Pop-A-Shot",
  "Darts",
  "Video Games / Esports",
]);

// Which formats make sense for a given sport. Golf-type sports get the golf
// formats; everything else gets the universal bracket/round-robin base plus any
// specialist formats that fit. "custom" (build-your-own) is offered everywhere.
export function formatsForSport(sport: string): Format[] {
  // Golf-family sports don't get Score Challenge: it is "post one bare number per
  // round", which for golf is a worse copy of the Traditional scorecard — no holes,
  // no pars, no handicaps. It stays for the sports where a round IS one number.
  if (/golf/i.test(sport)) return ["golf", "ryder", "custom"];
  const out: Format[] = ["round-robin", "swiss"];
  if (KOTC_SPORTS.has(sport)) out.push("kotc");
  out.push("single-elim", "double-elim", "pool-bracket");
  if (AMERICANO_SPORTS.has(sport)) out.push("americano", "mexicano");
  out.push("ladder");
  if (SCORE_CHALLENGE_SPORTS.has(sport)) out.push("score-challenge");
  out.push("custom");
  return out;
}

export const PLAYSTYLE_LABELS: Record<PlayStyle, string> = {
  singles: "Singles (1v1)",
  doubles: "Doubles — rotating partners",
  "doubles-fixed": "Doubles — fixed partners",
  teams: "Teams",
};

// Which play styles actually fit a given format. Only formats that pair up
// fresh partners each round (round robin / pool play, and the always-doubles
// social mixers) can honor "doubles — rotating partners". Every other format is
// head-to-head between a fixed unit (a person, a fixed pair, or a team), so
// rotating doubles is meaningless there and must NOT be offered — e.g. King of
// the Court can't rotate partners mid-rally. Golf & Ryder Cup run their own
// player/team setup and have no play-style picker.
export function playStylesForFormat(format: Format): PlayStyle[] {
  switch (format) {
    case "golf":
    case "ryder":
      return [];
    case "americano":
    case "mexicano":
      return ["doubles"]; // social mixers are always rotating-partner doubles
    case "round-robin":
    case "pool-bracket":
      return ["singles", "doubles", "doubles-fixed", "teams"];
    default:
      // swiss, kotc, single-elim, double-elim, ladder, score-challenge, custom
      return ["singles", "doubles-fixed", "teams"];
  }
}
