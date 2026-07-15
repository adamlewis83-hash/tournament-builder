import { Match, TournamentConfig } from "./types";

// When is a game over? Single source of truth for live scoring.
//
// A match used to be "done" the instant both sides had any number, which made
// point-by-point scoring impossible (1–1 read as a final score). `Match.final`
// now carries that state explicitly; this module owns the rules around it.

/** Is the result in? Legacy matches (no `final`) count as done once both scores exist. */
export function isFinal(m: Match): boolean {
  return m.final ?? (m.scoreA !== null && m.scoreB !== null);
}

/** Being scored right now — has a live score and hasn't been finished. */
export function isLive(m: Match): boolean {
  return m.final === false;
}

/**
 * Has someone won outright? Reaching the target ends it; with winByTwo (the
 * default — pickleball, tennis, ping pong) they must also lead by 2, so 11–10
 * plays on. No clock rule here: a timed game is ended by the host, never
 * automatically, so a long rally is never cut off mid-point.
 */
export function isWon(
  a: number | null,
  b: number | null,
  cfg: Pick<TournamentConfig, "pointsTo" | "winByTwo">,
): boolean {
  if (a === null || b === null) return false;
  const target = cfg.pointsTo;
  if (!target || target < 1) return false; // no target configured — host ends it
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  if (hi < target) return false;
  return (cfg.winByTwo ?? true) ? hi - lo >= 2 : hi > lo;
}
