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
}

export type GolfMode =
  | "stroke"
  | "stableford"
  | "skins"
  | "scramble"
  | "nassau"
  | "bingo"
  | "wolf"
  | "mixed";

export const GOLF_MODE_LABELS: Record<GolfMode, string> = {
  stroke: "Stroke Play",
  stableford: "Stableford",
  skins: "Skins",
  scramble: "Scramble (teams)",
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
  nassau: "Three matches in one — front 9, back 9, and overall 18 — each scored as net match play.",
  bingo: "A point for first on the green (bingo), closest to the pin once all are on (bango), and first in the hole (bongo).",
  wolf: "Each hole one player is the 'Wolf' and picks a partner after the tee shots — or plays alone (Lone Wolf) for bigger points.",
  mixed: "Build Your Own: assign a different game to each stretch of holes; the winner of each segment earns a point.",
};

// A stretch of holes (1-based, inclusive) scored by a chosen format — for "Build Your Own".
// Individual formats: stroke/stableford/skins/bingo. Team formats (one ball per team):
// scramble/bestball/altshot — all scored to-par like stroke, just played differently.
export type SegmentFormat =
  | "stroke"
  | "stableford"
  | "skins"
  | "bingo"
  | "scramble"
  | "bestball"
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
  altshot: "Alternate Shot",
};

export const SEGMENT_BLURBS: Record<SegmentFormat, string> = {
  stroke: "Lowest net score over these holes wins the segment.",
  stableford: "Most Stableford points (net score vs par) over these holes wins.",
  skins: "Win the most holes outright on low net over this stretch — ties carry over.",
  bingo: "Bingo Bango Bongo points (first on, closest once all on, first in) over these holes.",
  scramble: "Team plays one ball from the best shot each time — lowest team score wins.",
  bestball: "Each teammate plays their own ball; the team takes the lower score each hole.",
  altshot: "Alternate Shot: partners share one ball, taking turns hitting each shot.",
};

// Segment formats that are team games (one ball per team).
export const TEAM_SEGMENT_FORMATS: SegmentFormat[] = ["scramble", "bestball", "altshot", "stableford", "skins"];
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

// A reusable course saved to the library (pars + stroke index per hole).
export interface Course {
  id: string;
  name: string;
  holes: number;
  pars: number[];
  strokeIndex: number[];
}

export interface GolfData {
  holes: number; // 9 or 18
  startHole?: number; // first hole number played (1 for front/18-hole, 10 for back 9) — display only
  courseName?: string; // name of the course being played
  pars: number[]; // par for each hole
  strokeIndex: number[]; // 1..holes difficulty ranking (for net allocation)
  scores: Record<string, (number | null)[]>; // participantId -> strokes per hole
  bbb?: BbbData; // Bingo Bango Bongo awards
  wolf?: WolfData; // Wolf partner choices
  segments?: GolfSegment[]; // "Build Your Own": format per hole range
  teams?: boolean; // "Build Your Own" played as teams (one ball per team)
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
}

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
  pointsTo: number; // games played to N (display hint)
  timeLimitMin: number; // 0 = no clock; otherwise games end at N points OR this many minutes, whichever first
  advanceCount: number; // top N advance from RR / overall pools
  poolCount: number; // pool-bracket: number of pools
  bracketType: "single" | "double"; // pool-bracket: knockout style after pools
  tiebreaker: Tiebreaker; // how to break equal win-loss records
  thirdPlace: boolean; // add a 3rd-place game to single-elimination brackets
  teamNames: [string, string]; // Ryder Cup team names
  ryderFoursomes: number; // Ryder Cup: # of Foursomes (alternate shot) sessions
  ryderFourball: number; // Ryder Cup: # of Fourball (best ball) sessions
  ryderSingles: number; // Ryder Cup: # of Singles sessions
  golfMode: GolfMode; // golf scoring mode
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
  ryder: "Ryder Cup (Team Match Play)",
  golf: "Golf",
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
    "Two teams face off in pairs + singles matches. Each match is worth a point (½ for a tie); first team past half the points wins the cup. Great for golf.",
  golf:
    "Hole-by-hole scorecard with handicaps. Score it as Stroke Play (gross/net), Stableford, Skins, or a team Scramble — switch anytime.",
  custom:
    "A blank slate — add players, then create each round's matchups yourself. The app tracks scores and the leaderboard. For events that don't fit a standard format.",
  "score-challenge":
    "Everyone posts a score each round and is ranked by total — no head-to-head. Perfect for bowling, pop-a-shot, darts, or disc golf. Pick whether highest or lowest total wins.",
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
  "Beer Pong",
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
  "Beer Pong",
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
  "Beer Pong",
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
  if (/golf/i.test(sport)) return ["golf", "ryder", "score-challenge", "custom"];
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
