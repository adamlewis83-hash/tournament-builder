// Core domain types for the tournament builder.

export type Format =
  | "round-robin"
  | "swiss"
  | "kotc"
  | "single-elim"
  | "double-elim"
  | "pool-bracket"
  | "ryder"
  | "golf";

// singles: each participant is one person, matches are 1v1
// doubles: individuals enter; round-robin/pool rotate partners; standings are per-person
// teams: each participant IS a team (e.g. a fixed doubles pair "Cody / Adam")
export type PlayStyle = "singles" | "doubles" | "teams";

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
}

export type GolfMode = "stroke" | "stableford" | "skins" | "scramble";

export const GOLF_MODE_LABELS: Record<GolfMode, string> = {
  stroke: "Stroke Play",
  stableford: "Stableford",
  skins: "Skins",
  scramble: "Scramble (teams)",
};

export interface GolfData {
  holes: number; // 9 or 18
  pars: number[]; // par for each hole
  strokeIndex: number[]; // 1..holes difficulty ranking (for net allocation)
  scores: Record<string, (number | null)[]>; // participantId -> strokes per hole
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

export type Tiebreaker = "diff" | "headToHead" | "pointsFor";

export const TIEBREAKER_LABELS: Record<Tiebreaker, string> = {
  diff: "Point differential",
  headToHead: "Head-to-head, then point differential",
  pointsFor: "Total points scored",
};

export interface TournamentConfig {
  rounds: number; // round-robin rounds
  courts: number; // simultaneous games
  pointsTo: number; // games played to N (display hint)
  advanceCount: number; // top N advance from RR / overall pools
  poolCount: number; // pool-bracket: number of pools
  bracketType: "single" | "double"; // pool-bracket: knockout style after pools
  tiebreaker: Tiebreaker; // how to break equal win-loss records
  thirdPlace: boolean; // add a 3rd-place game to single-elimination brackets
  teamNames: [string, string]; // Ryder Cup team names
  golfMode: GolfMode; // golf scoring mode
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
  config: TournamentConfig;
  createdAt: number;
  updatedAt: number;
  generated: boolean; // schedule/bracket built
  liveCode?: string; // when set, this tournament is synced to a live session
  liveVersion?: number; // last server version this device has applied
}

export const FORMAT_LABELS: Record<Format, string> = {
  "round-robin": "Round Robin",
  swiss: "Swiss",
  kotc: "King of the Court",
  "single-elim": "Single Elimination",
  "double-elim": "Double Elimination",
  "pool-bracket": "Pool Play → Bracket",
  ryder: "Ryder Cup (Team Match Play)",
  golf: "Golf",
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
  ryder:
    "Two teams face off in pairs + singles matches. Each match is worth a point (½ for a tie); first team past half the points wins the cup. Great for golf.",
  golf:
    "Hole-by-hole scorecard with handicaps. Score it as Stroke Play (gross/net), Stableford, Skins, or a team Scramble — switch anytime.",
};

// Common tournament-able sports/activities for the picklist. "Other…" is added
// by the UI to allow any custom sport or non-sport bracket.
export const SPORTS: string[] = [
  "Pickleball",
  "Tennis",
  "Table Tennis (Ping Pong)",
  "Foosball",
  "Basketball",
  "Cornhole",
  "Spikeball",
  "Volleyball",
  "Soccer",
  "Golf",
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

export const PLAYSTYLE_LABELS: Record<PlayStyle, string> = {
  singles: "Singles (1v1)",
  doubles: "Doubles — rotating partners",
  teams: "Teams / fixed pairs",
};
