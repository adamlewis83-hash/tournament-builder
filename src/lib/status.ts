import { Tournament } from "./types";
import { getResult } from "./result";

export type StatusKind = "setup" | "live" | "play" | "final";
export type TournamentStatus = { label: string; kind: StatusKind };

// Single source of truth for a tournament's lifecycle pill. The precedence
// below (first match wins) is deliberate and shared by the Home cards and the
// detail header, so the two surfaces can never disagree:
//   SETUP   — not generated yet (no schedule/bracket)
//   FINAL   — result is complete (wins even if a live session is still open)
//   LIVE    — published live session (liveCode set), actively scored
//   IN PLAY — generated and underway, not yet complete
// Labels are rendered uppercase by StatusPill.
export function tournamentStatus(t: Tournament): TournamentStatus {
  if (!t.generated) return { label: "Setup", kind: "setup" };
  if (getResult(t).complete) return { label: "Final", kind: "final" };
  if (t.liveCode) return { label: "Live", kind: "live" };
  return { label: "In play", kind: "play" };
}
