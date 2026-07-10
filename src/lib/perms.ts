import { Tournament } from "./types";
import { getProfile } from "./profile";

// Who can enter/change scores on this device:
//  - the host/owner (not a spectator) always can;
//  - a spectator (joined via the live link) can only if the host granted their name as a
//    scorekeeper — matched to their profile name, since there are no accounts.
export function canEditScores(t: Tournament): boolean {
  if (!t.spectator) return true;
  const me = getProfile().name.trim().toLowerCase();
  if (!me) return false;
  return (t.scorers ?? []).some((n) => n.trim().toLowerCase() === me);
}

// True only for a granted co-scorer (a spectator the host let keep score) — used to show
// "you can keep score" affordances without implying they're the host.
export function isGrantedScorer(t: Tournament): boolean {
  return !!t.spectator && canEditScores(t);
}
