// Name aliases — "Adam" and "Adam Lewis" are the same human, but records are
// keyed by the name someone typed on the day. An alias folds one spelling into
// a canonical name at VIEW time: the tournaments themselves keep the names as
// entered (they're shared with everyone in the event), and this device's Trophy
// Room, trophy cases, and Seed Index read through the map.
import { Tournament } from "./types";
import { PROFILE_EVENT } from "./profile";

const KEY = "sporos-aliases";

// Merges are part of who you are — announce them like a profile save so the
// cloud backup (and anything else watching the profile) follows along.
function announce() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PROFILE_EVENT));
}

/** Adopt a whole map (cloud restore). */
export function replaceAliases(map: Record<string, string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** alias (lowercased) → canonical display name */
export function getAliases(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return typeof raw === "object" && raw ? raw : {};
  } catch {
    return {};
  }
}

export function setAlias(alias: string, canonical: string) {
  const a = alias.trim().toLowerCase();
  const c = canonical.trim();
  if (!a || !c || a === c.toLowerCase()) return;
  const map = getAliases();
  map[a] = c;
  // Re-point anything that aliased TO the alias, so chains stay one hop deep.
  for (const k of Object.keys(map)) if (map[k].toLowerCase() === a) map[k] = c;
  replaceAliases(map);
  announce();
}

export function removeAlias(alias: string) {
  const map = getAliases();
  delete map[alias.trim().toLowerCase()];
  replaceAliases(map);
  announce();
}

export function canonicalName(name: string, map: Record<string, string> = getAliases()): string {
  return map[name.trim().toLowerCase()] ?? name;
}

/**
 * The tournaments with every participant (and team member) name read through
 * the alias map. Pure — returns new objects, the store is never touched. Pass
 * the map in tests; the UI lets it default to this device's saved aliases.
 */
export function applyAliases(
  tournaments: Tournament[],
  map: Record<string, string> = getAliases(),
): Tournament[] {
  if (!Object.keys(map).length) return tournaments;
  return tournaments.map((t) => ({
    ...t,
    participants: t.participants.map((p) => ({
      ...p,
      name: canonicalName(p.name, map),
      members: p.members?.map((m) => canonicalName(m, map)),
    })),
  }));
}
