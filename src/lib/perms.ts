import { Tournament } from "./types";
import { getProfile } from "./profile";

// Who can enter/change scores on this device:
//  - the host/owner (not a spectator) always can;
//  - a spectator (joined via the live link) can if the host granted their name as a
//    scorekeeper, or if their name is on the roster and the host lets players keep
//    score (the default). Both are matched to their profile name, since there are
//    no accounts.
export function canEditScores(t: Tournament): boolean {
  if (!t.spectator) return true;
  const me = getProfile().name.trim().toLowerCase();
  if (!me) return false;
  return claimableNames(t).some((n) => n.trim().toLowerCase() === me);
}

// Every name that unlocks scoring on a spectator's phone: the host's scorekeepers,
// plus the players themselves unless the host keeps the scoring to themselves.
export function claimableNames(t: Tournament): string[] {
  const names = [...(t.scorers ?? [])];
  if (t.playersScore !== false)
    for (const p of t.participants) names.push(...(p.members?.length ? p.members : [p.name]));
  const seen = new Set<string>();
  return names.filter((n) => {
    const k = n.trim().toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// True only for a granted co-scorer (a spectator the host let keep score) — used to show
// "you can keep score" affordances without implying they're the host.
export function isGrantedScorer(t: Tournament): boolean {
  return !!t.spectator && canEditScores(t);
}
