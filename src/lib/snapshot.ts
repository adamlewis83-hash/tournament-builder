import { Tournament } from "./types";
import { isFinal } from "./score";

/**
 * How much entered scoring a tournament is holding — every format counted the same
 * way, as "things a person typed in that they would hate to lose".
 *
 * Used to decide whether a setup save is about to destroy work, and to tell the
 * host afterwards how much a restore would bring back.
 */
export function scoreCount(t: Tournament): number {
  let n = 0;
  for (const m of t.matches) if (isFinal(m) && (m.scoreA !== null || m.scoreB !== null)) n++;
  for (const card of Object.values(t.golf?.scores ?? {}))
    n += card.filter((v) => v != null).length;
  for (const match of Object.values(t.ryderGolf?.scores ?? {}))
    for (const card of Object.values(match)) n += card.filter((v) => v != null).length;
  for (const card of Object.values(t.scoreChallenge?.scores ?? {}))
    n += card.filter((v) => v != null).length;
  return n;
}

/** A one-line description of what is on the card, for confirm dialogs. */
export function scoreSummary(t: Tournament): string {
  const n = scoreCount(t);
  if (!n) return "";
  const holes = Object.keys(t.golf?.scores ?? {}).length || Object.keys(t.ryderGolf?.scores ?? {}).length;
  return holes ? `${n} scores already on the card` : `${n} results already entered`;
}
