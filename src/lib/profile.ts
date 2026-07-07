// Your player profile — set once in Settings, auto-applied to every tournament
// you start (matched by name) and pre-filled when you join one by code.
export interface Profile {
  name: string;
  photo: string | null; // small square JPEG data-URL (see lib/image resizePhoto)
}

const KEY = "sporos-profile";
const DEFAULTS: Profile = { name: "", photo: null };

export function getProfile(): Profile {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return DEFAULTS;
  }
}

export function setProfile(p: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

// Stamp the saved profile photo onto any participant with the same name (case-
// insensitive) that doesn't already have a photo. Called when participants are set.
export function applyProfilePhoto<T extends { name: string; photo?: string }>(list: T[]): T[] {
  if (typeof window === "undefined") return list;
  const prof = getProfile();
  if (!prof.photo || !prof.name.trim()) return list;
  const target = prof.name.trim().toLowerCase();
  return list.map((p) =>
    !p.photo && p.name.trim().toLowerCase() === target ? { ...p, photo: prof.photo! } : p,
  );
}
