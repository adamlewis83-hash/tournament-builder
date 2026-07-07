// What shows on the signed-in Home screen — set from Settings → Home layout.
export interface HomePrefs {
  banner: boolean; // rotating sports-photo banner
  join: boolean; // "Join a live tournament" card
}

const KEY = "sporos-home-prefs";
const DEFAULTS: HomePrefs = { banner: true, join: true };

export function getHomePrefs(): HomePrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return DEFAULTS;
  }
}

export function setHomePrefs(p: HomePrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}
