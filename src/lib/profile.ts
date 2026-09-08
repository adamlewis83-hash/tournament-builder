// Your player profile — set once in Settings, auto-applied to every tournament
// you start (matched by name) and pre-filled when you join one by code.
/** An index the player already had before Sporos — from GHIN, a club, or their
 *  own honest number. It seeds the Seed Index so a player who plays off 8
 *  doesn't spend their first three rounds with no index at all. Sporos never
 *  presents this as an official index; it is a starting position. */
export interface StartingIndex {
  index: number;
  source: "GHIN" | "Club" | "Self";
  at: number; // the date that index was current
}

export interface Profile {
  name: string;
  photo: string | null; // small square JPEG data-URL (see lib/image resizePhoto)
  color: string | null; // chosen initials-circle color (used when no photo)
  golfHandicap: number | null; // handicap index — auto-fills golf & Ryder Cup events
  // Keep golfHandicap tracking the Seed Index as rounds finish (default). Off =
  // the handicap is typed by hand and the index only moves in with a tap.
  seedIndexAuto: boolean;
  startingIndex?: StartingIndex | null; // the index they arrived with, if any
}

const KEY = "sporos-profile";
const DEFAULTS: Profile = {
  name: "",
  photo: null,
  color: null,
  golfHandicap: null,
  seedIndexAuto: true,
  startingIndex: null,
};

export function getProfile(): Profile {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return DEFAULTS;
  }
}

/** Fired after any save, so two cards editing the same profile on one screen
 *  (your name here, your starting index there) never show each other stale. */
export const PROFILE_EVENT = "sporos:profile";

export function setProfile(p: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PROFILE_EVENT));
}

// Stamp the saved profile photo/color (and, for golf events, handicap) onto any
// participant with the same name (case-insensitive) that doesn't already have one
// set. Called when participants are set.
export function applyProfilePhoto<
  T extends { name: string; photo?: string; color?: string; handicap?: number },
>(list: T[], opts?: { golfHandicap?: boolean }): T[] {
  if (typeof window === "undefined") return list;
  const prof = getProfile();
  if ((!prof.photo && !prof.color && prof.golfHandicap == null) || !prof.name.trim()) return list;
  const target = prof.name.trim().toLowerCase();
  return list.map((p) => {
    if (p.name.trim().toLowerCase() !== target) return p;
    const next = { ...p };
    if (!next.photo && prof.photo) next.photo = prof.photo;
    if (!next.color && prof.color) next.color = prof.color;
    // Only fill the handicap when the host left it empty/zero — a typed value wins.
    if (opts?.golfHandicap && !next.handicap && prof.golfHandicap != null)
      next.handicap = prof.golfHandicap;
    return next;
  });
}
