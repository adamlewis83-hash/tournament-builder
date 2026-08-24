import { Participant } from "./types";

// Vibrant, high-contrast jersey colors for participants/teams.
export const PALETTE = [
  "#22d3ee", // cyan
  "#a3e635", // lime
  "#818cf8", // indigo
  "#f472b6", // pink
  "#fb923c", // orange
  "#34d399", // emerald
  "#facc15", // yellow
  "#f87171", // red
  "#60a5fa", // blue
  "#c084fc", // purple
  "#2dd4bf", // teal
  "#fbbf24", // amber
  "#4ade80", // green
  "#e879f9", // fuchsia
  "#38bdf8", // sky
  "#fda4af", // rose
];

export function colorForIndex(i: number): string {
  return PALETTE[((i % PALETTE.length) + PALETTE.length) % PALETTE.length];
}

export function colorFor(participants: Participant[], id: string): string {
  const i = participants.findIndex((p) => p.id === id);
  const chosen = i >= 0 ? participants[i].color : undefined;
  return chosen || colorForIndex(i < 0 ? 0 : i);
}

/** The player's photo thumbnail, if they uploaded one (else undefined → initials avatar). */
export function photoFor(participants: Participant[], id: string): string | undefined {
  return participants.find((p) => p.id === id)?.photo;
}

/** Stable color from a name (for cross-event records where ids differ). */
export function colorForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return colorForIndex(h % PALETTE.length);
}

// One deliberate accent per built-in sport — the color language a sport keeps
// everywhere it appears (home-card rail and chip, picker icons, record rows).
// Chosen from the sport's own world (basketball leather, tennis ball, red solo
// cup), not hashed from its name; custom sports fall back to the stable hash.
const SPORT_ACCENTS: [RegExp, string][] = [
  [/disc|frisbee/i, "#0284c7"], // sky — a disc in flight (before generic "golf")
  [/golf/i, "#16a34a"], // fairway green
  [/pickle/i, "#65a30d"], // lime wiffle ball
  [/ping|table tennis/i, "#f43f5e"], // paddle-rubber red
  [/badmin/i, "#c026d3"], // fuchsia — feathered and fast
  [/racquet|squash/i, "#3b82f6"], // blue racquetball
  [/tennis/i, "#ca8a04"], // optic-ball gold
  [/pop-?a-?shot/i, "#c2410c"], // deep arcade orange
  [/basket|hoop/i, "#ea580c"], // leather orange
  [/soccer|futbol/i, "#059669"], // pitch emerald
  [/football/i, "#5b21b6"], // deep violet flags
  [/foos/i, "#0891b2"], // table cyan
  [/corn/i, "#92400e"], // board wood
  [/spike/i, "#eab308"], // yellow rim & ball
  [/volley/i, "#2563eb"], // court blue
  [/dart/i, "#0d9488"], // board teal
  [/pool|billiard|snooker/i, "#4338ca"], // hall indigo
  [/bowl/i, "#db2777"], // alley neon pink
  [/cup ?pong|beer/i, "#dc2626"], // red solo cup
  [/chess/i, "#64748b"], // slate
  [/video|esport|arcade/i, "#a855f7"], // RGB purple
  [/board/i, "#0369a1"], // steel blue
];

/** The sport's signature accent — curated for built-ins, hash fallback for customs. */
export function sportAccent(sport: string): string {
  for (const [re, hex] of SPORT_ACCENTS) if (re.test(sport)) return hex;
  return colorForName(sport);
}
