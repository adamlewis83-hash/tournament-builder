"use client";

import type { ReactNode, SVGProps } from "react";

// Custom monoline sport icons — one 24px grid, 1.7px stroke, equipment silhouettes,
// drawn in currentColor so each inherits the per-sport accent tint on its chip.
// Replaces the generic/shared Phosphor glyphs (no more ph-target for cornhole).
type Key =
  | "pickleball"
  | "golf"
  | "tennis"
  | "tabletennis"
  | "foosball"
  | "basketball"
  | "cornhole"
  | "spikeball"
  | "volleyball"
  | "soccer"
  | "custom";

const ICONS: Record<Key, ReactNode> = {
  // Pickleball — wiffle ball
  pickleball: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="6.8" r="1" fill="currentColor" stroke="none" />
      <circle cx="8.2" cy="9.4" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.8" cy="9.4" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="8.2" cy="14.6" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.8" cy="14.6" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17.2" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  // Golf — angled club (driver) + ball on the ground. The 4a "pole + pennant"
  // glyph read as a flag; this reshapes it into an unmistakable club.
  golf: (
    <>
      <path d="M16.5 3.5 L8.7 15.3" />
      <ellipse
        cx="7.3"
        cy="16.4"
        rx="3.1"
        ry="1.85"
        transform="rotate(-38 7.3 16.4)"
        fill="currentColor"
        stroke="none"
      />
      <circle cx="16.8" cy="18.9" r="1.6" fill="currentColor" stroke="none" />
      <path d="M11.8 20.7 L21 20.7" opacity="0.4" />
    </>
  ),
  // Tennis — strung racquet + ball
  tennis: (
    <>
      <g transform="rotate(-22 10 9)">
        <ellipse cx="10" cy="8.5" rx="5" ry="6" />
        <path d="M10 3 L10 14 M5.2 7 L14.8 7 M6 10.5 L14 10.5 M10.5 14 L12.5 20.5" opacity="0.9" />
      </g>
      <circle cx="18.5" cy="6.5" r="2.3" />
      <path d="M16.4 5.7 A2.3 2.3 0 0 1 18.9 8.7" strokeWidth={1} />
    </>
  ),
  // Table tennis — solid bat + ball
  tabletennis: (
    <>
      <g transform="rotate(-28 9 9)">
        <circle cx="9" cy="8" r="4.8" fill="currentColor" stroke="none" />
        <rect x="7.5" y="12" width="3" height="7.5" rx="1.5" fill="currentColor" stroke="none" />
      </g>
      <circle cx="18.3" cy="14.5" r="2" />
    </>
  ),
  // Foosball — rod figure
  foosball: (
    <>
      <path d="M3 6 L21 6" />
      <circle cx="12" cy="9.4" r="2" />
      <path d="M12 11.4 L12 16 M8.8 12.8 L15.2 12.8 M12 16 L9 20.5 M12 16 L15 20.5" />
    </>
  ),
  // Basketball
  basketball: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3 L12 21 M3 12 L21 12" />
      <path d="M5.6 5.6 Q12 12 5.6 18.4" />
      <path d="M18.4 5.6 Q12 12 18.4 18.4" />
    </>
  ),
  // Cornhole — angled board + bag
  cornhole: (
    <>
      <path d="M3 15 L13 6.5 L21 9 L11 17.5 Z" />
      <ellipse cx="14.5" cy="10.6" rx="1.7" ry="1.2" transform="rotate(-14 14.5 10.6)" />
      <rect
        x="4.5"
        y="15.5"
        width="4"
        height="3.4"
        rx="1"
        transform="rotate(-14 6.5 17.2)"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  // Spikeball — net ring + ball
  spikeball: (
    <>
      <ellipse cx="12" cy="15" rx="7" ry="2.6" />
      <path d="M5.6 14 Q12 11.5 18.4 14 M6 15.6 L18 15.6" />
      <path d="M7 17.2 L6 20.2 M17 17.2 L18 20.2 M12 17.6 L12 20.6" />
      <circle cx="15.5" cy="6.5" r="2" />
    </>
  ),
  // Volleyball
  volleyball: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3 Q6.5 11 8.5 20.6" />
      <path d="M12 3 Q17.5 11 15.5 20.6" />
      <path d="M3.3 9.5 Q12 13 20.7 9.5" />
    </>
  ),
  // Soccer
  soccer: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8 L15.3 10.4 L14 14.3 L10 14.3 L8.7 10.4 Z" fill="currentColor" stroke="none" />
      <path d="M12 8 L12 3.4 M15.3 10.4 L19.3 8.7 M14 14.3 L16.7 18 M10 14.3 L7.3 18 M8.7 10.4 L4.7 8.7" />
      <path d="M12 3.6 L13.6 4.5 L13.1 6.2 L10.9 6.2 L10.4 4.5 Z" fill="currentColor" stroke="none" />
      <path d="M6.6 17.3 L8.4 17.1 L9 18.8 L7.6 20 L6.2 19 Z" fill="currentColor" stroke="none" />
      <path d="M17.4 17.3 L15.6 17.1 L15 18.8 L16.4 20 L17.8 19 Z" fill="currentColor" stroke="none" />
    </>
  ),
  // Custom — Sporos sprout in a trophy (also the generic fallback)
  custom: (
    <>
      <path
        d="M8.7 6.3 L9.3 3.9 L10.85 5.1 L12 2.6 L13.15 5.1 L14.7 3.9 L15.3 6.3 Z"
        fill="currentColor"
        stroke="none"
      />
      <circle cx="9.3" cy="3.5" r="0.85" fill="currentColor" stroke="none" />
      <circle cx="12" cy="2.2" r="0.95" fill="currentColor" stroke="none" />
      <circle cx="14.7" cy="3.5" r="0.85" fill="currentColor" stroke="none" />
      <path d="M12 6.3 V 16" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      <path
        d="M12 13.4 C 14.3 13.2 16.5 12.1 17.3 9.6 C 14.8 10.4 13.1 11.7 12 13.4 Z"
        fill="currentColor"
        stroke="none"
      />
      <path
        d="M12 13.4 C 9.7 13.2 7.5 12.1 6.7 9.6 C 9.2 10.4 10.9 11.7 12 13.4 Z"
        fill="currentColor"
        stroke="none"
      />
      <g stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M6.8 16 H 17.2" />
        <path d="M6.8 16 V 18 H 10.7" />
        <path d="M17.2 16 V 18 H 13.3" />
        <path d="M12 16 V 19" />
        <path d="M10.6 20.6 L 12 19 L 13.4 20.6" />
      </g>
    </>
  ),
};

// First match wins — order matters (e.g. "disc golf" before generic "golf",
// "pickle" before "table tennis"). Racquet sports and pop-a-shot borrow the
// closest custom shape; anything else falls back to the Custom mark.
const RULES: [RegExp, Key][] = [
  [/pickle/i, "pickleball"],
  [/ping|table tennis/i, "tabletennis"],
  [/badmin|racquet|squash/i, "tennis"],
  [/tennis/i, "tennis"],
  [/basket|pop-?a-?shot|hoop/i, "basketball"],
  [/soccer|futbol/i, "soccer"],
  [/foos/i, "foosball"],
  [/corn/i, "cornhole"],
  [/spike/i, "spikeball"],
  [/volley/i, "volleyball"],
  [/disc|frisbee/i, "custom"],
  [/golf/i, "golf"],
];

function keyFor(sport: string): Key {
  for (const [re, k] of RULES) if (re.test(sport)) return k;
  return "custom";
}

export function SportIcon({
  sport,
  className = "h-5 w-5",
  ...props
}: { sport: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {ICONS[keyFor(sport)]}
    </svg>
  );
}
