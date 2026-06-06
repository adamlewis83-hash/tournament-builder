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
  return colorForIndex(i < 0 ? 0 : i);
}

/** Stable color from a name (for cross-event records where ids differ). */
export function colorForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return colorForIndex(h % PALETTE.length);
}
