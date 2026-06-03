// Core domain types for the tournament builder.

export type Format =
  | "round-robin"
  | "swiss"
  | "single-elim"
  | "double-elim"
  | "pool-bracket";

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
  | "placement"; // 3rd-place / consolation games

export interface Participant {
  id: string;
  name: string;
  seed?: number; // optional manual seed override
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
}

export interface Tournament {
  id: string;
  name: string;
  sport: string;
  format: Format;
  playStyle: PlayStyle;
  participants: Participant[];
  matches: Match[];
  config: TournamentConfig;
  createdAt: number;
  updatedAt: number;
  generated: boolean; // schedule/bracket built
}

export const FORMAT_LABELS: Record<Format, string> = {
  "round-robin": "Round Robin",
  swiss: "Swiss",
  "single-elim": "Single Elimination",
  "double-elim": "Double Elimination",
  "pool-bracket": "Pool Play → Bracket",
};

export const FORMAT_BLURBS: Record<Format, string> = {
  "round-robin":
    "Everyone plays. Standings by wins, then point differential. Top N advance to a final.",
  swiss:
    "Fixed number of rounds; each round you're paired against someone with a similar record. No one's eliminated — scales to lots of players.",
  "single-elim": "Seeded knockout bracket. Lose once and you're out.",
  "double-elim": "Knockout with a losers bracket — one loss before elimination.",
  "pool-bracket": "Group-stage round robin, then top finishers seed into a knockout bracket.",
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
