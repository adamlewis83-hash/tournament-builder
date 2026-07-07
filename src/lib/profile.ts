// Your player profile — set once in Settings, auto-applied to every tournament
// you start (matched by name) and pre-filled when you join one by code.
export interface Profile {
  name: string;
  photo: string | null; // small square JPEG data-URL (see lib/image resizePhoto)
  color: string | null; // chosen initials-circle color (used when no photo)
}

const KEY = "sporos-profile";
const DEFAULTS: Profile = { name: "", photo: null, color: null };

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

// Stamp the saved profile photo/color onto any participant with the same name (case-
// insensitive) that doesn't already have one set. Called when participants are set.
export function applyProfilePhoto<T extends { name: string; photo?: string; color?: string }>(
  list: T[],
): T[] {
  if (typeof window === "undefined") return list;
  const prof = getProfile();
  if ((!prof.photo && !prof.color) || !prof.name.trim()) return list;
  const target = prof.name.trim().toLowerCase();
  return list.map((p) => {
    if (p.name.trim().toLowerCase() !== target) return p;
    const next = { ...p };
    if (!next.photo && prof.photo) next.photo = prof.photo;
    if (!next.color && prof.color) next.color = prof.color;
    return next;
  });
}
