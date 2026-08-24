"use client";

import type { ReactNode, SVGProps } from "react";

// Custom duotone sport icons (v2 "Direction B") — one 24px grid, a soft
// currentColor fill (18% opacity) behind a crisp 1.8px line, solid accents for
// small details. Each inherits the per-sport accent tint on its chip, so the
// soft layer picks up the sport's color automatically.
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
  | "flagfootball"
  | "discgolf"
  | "darts"
  | "pool"
  | "bowling"
  | "badminton"
  | "racquetball"
  | "popashot"
  | "beerpong"
  | "chess"
  | "videogames"
  | "boardgames"
  | "custom";

// The two duotone layers: SOFT is the tinted wash behind the linework, SOLID
// the fully-inked accents (balls, bags, buttons).
const SOFT = { fill: "currentColor", opacity: 0.18, stroke: "none" } as const;
const SOLID = { fill: "currentColor", stroke: "none" } as const;

const ICONS: Record<Key, ReactNode> = {
  // Pickleball — wiffle ball
  pickleball: (
    <>
      <circle cx="12" cy="12" r="8.3" {...SOFT} />
      <circle cx="12" cy="12" r="8.3" />
      <circle cx="12" cy="6.8" r="1.05" {...SOLID} />
      <circle cx="8.2" cy="9.4" r="1.05" {...SOLID} />
      <circle cx="15.8" cy="9.4" r="1.05" {...SOLID} />
      <circle cx="12" cy="12" r="1.05" {...SOLID} />
      <circle cx="8.2" cy="14.6" r="1.05" {...SOLID} />
      <circle cx="15.8" cy="14.6" r="1.05" {...SOLID} />
      <circle cx="12" cy="17.2" r="1.05" {...SOLID} />
    </>
  ),
  // Golf — angled club + ball, with a soft swing-arc wash behind the shaft
  golf: (
    <>
      <path
        d="M16.5 3.5 A 14.5 14.5 0 0 1 9.6 14 L 8.7 15.3 A 16.3 16.3 0 0 0 16.5 3.5 Z"
        {...SOFT}
      />
      <path d="M16.5 3.5 L8.7 15.3" />
      <ellipse
        cx="7.3"
        cy="16.4"
        rx="3.1"
        ry="1.85"
        transform="rotate(-38 7.3 16.4)"
        {...SOLID}
      />
      <circle cx="16.8" cy="18.9" r="1.9" {...SOFT} />
      <circle cx="16.8" cy="18.9" r="1.9" />
      <path d="M11.8 20.9 L21 20.9" opacity="0.4" />
    </>
  ),
  // Tennis — strung racquet (soft head) + solid ball
  tennis: (
    <>
      <g transform="rotate(-22 10 9)">
        <ellipse cx="10" cy="8.5" rx="5" ry="6" {...SOFT} />
        <ellipse cx="10" cy="8.5" rx="5" ry="6" />
        <path d="M10 3.2 L10 13.8 M5.4 7 L14.6 7 M6.2 10.5 L13.8 10.5" opacity="0.75" />
        <path d="M10.5 14 L12.5 20.5" />
      </g>
      <circle cx="18.5" cy="6.5" r="2.2" {...SOLID} />
    </>
  ),
  // Table tennis — bat (soft blade) + solid ball
  tabletennis: (
    <>
      <g transform="rotate(-28 9 9)">
        <circle cx="9" cy="8" r="4.8" {...SOFT} />
        <circle cx="9" cy="8" r="4.8" />
        <rect x="7.5" y="12" width="3" height="7.5" rx="1.5" {...SOLID} />
      </g>
      <circle cx="18.3" cy="14.5" r="2" {...SOLID} />
    </>
  ),
  // Foosball — rod figure with a soft head
  foosball: (
    <>
      <path d="M3 6 L21 6" />
      <circle cx="12" cy="9.4" r="2" {...SOFT} />
      <circle cx="12" cy="9.4" r="2" />
      <path d="M12 11.4 L12 16 M8.8 12.8 L15.2 12.8 M12 16 L9 20.5 M12 16 L15 20.5" />
    </>
  ),
  // Basketball
  basketball: (
    <>
      <circle cx="12" cy="12" r="8.7" {...SOFT} />
      <circle cx="12" cy="12" r="8.7" />
      <path d="M12 3.3 L12 20.7 M3.3 12 L20.7 12" />
      <path d="M5.8 5.8 Q12 12 5.8 18.2" />
      <path d="M18.2 5.8 Q12 12 18.2 18.2" />
    </>
  ),
  // Cornhole — soft angled board + solid bag
  cornhole: (
    <>
      <path d="M3 15 L13 6.5 L21 9 L11 17.5 Z" {...SOFT} />
      <path d="M3 15 L13 6.5 L21 9 L11 17.5 Z" />
      <ellipse cx="14.5" cy="10.6" rx="1.7" ry="1.2" transform="rotate(-14 14.5 10.6)" />
      <rect
        x="4.5"
        y="15.5"
        width="4"
        height="3.4"
        rx="1"
        transform="rotate(-14 6.5 17.2)"
        {...SOLID}
      />
    </>
  ),
  // Spikeball — soft net ring + solid ball
  spikeball: (
    <>
      <ellipse cx="12" cy="15" rx="7" ry="2.6" {...SOFT} />
      <ellipse cx="12" cy="15" rx="7" ry="2.6" />
      <path d="M5.6 14 Q12 11.5 18.4 14 M6 15.6 L18 15.6" />
      <path d="M7 17.2 L6 20.2 M17 17.2 L18 20.2 M12 17.6 L12 20.6" />
      <circle cx="15.5" cy="6.5" r="2" {...SOLID} />
    </>
  ),
  // Volleyball
  volleyball: (
    <>
      <circle cx="12" cy="12" r="8.7" {...SOFT} />
      <circle cx="12" cy="12" r="8.7" />
      <path d="M12 3.3 Q6.6 11 8.6 20.4" />
      <path d="M12 3.3 Q17.4 11 15.4 20.4" />
      <path d="M3.6 9.5 Q12 13 20.4 9.5" />
    </>
  ),
  // Soccer — soft ball behind the solid panels
  soccer: (
    <>
      <circle cx="12" cy="12" r="9" {...SOFT} />
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8 L15.3 10.4 L14 14.3 L10 14.3 L8.7 10.4 Z" {...SOLID} />
      <path d="M12 8 L12 3.4 M15.3 10.4 L19.3 8.7 M14 14.3 L16.7 18 M10 14.3 L7.3 18 M8.7 10.4 L4.7 8.7" />
      <path d="M12 3.6 L13.6 4.5 L13.1 6.2 L10.9 6.2 L10.4 4.5 Z" {...SOLID} />
      <path d="M6.6 17.3 L8.4 17.1 L9 18.8 L7.6 20 L6.2 19 Z" {...SOLID} />
      <path d="M17.4 17.3 L15.6 17.1 L15 18.8 L16.4 20 L17.8 19 Z" {...SOLID} />
    </>
  ),
  // Flag football — soft football with pulled flags
  flagfootball: (
    <>
      <g transform="rotate(-25 12 9.5)">
        <path d="M12 4.6 C 16 4.6 18.6 6.8 19.2 9.5 C 18.6 12.2 16 14.4 12 14.4 C 8 14.4 5.4 12.2 4.8 9.5 C 5.4 6.8 8 4.6 12 4.6 Z" {...SOFT} />
        <path d="M12 4.6 C 16 4.6 18.6 6.8 19.2 9.5 C 18.6 12.2 16 14.4 12 14.4 C 8 14.4 5.4 12.2 4.8 9.5 C 5.4 6.8 8 4.6 12 4.6 Z" />
        <path
          d="M9.5 9.5 L14.5 9.5 M10.7 8.6 L10.7 10.4 M12 8.6 L12 10.4 M13.3 8.6 L13.3 10.4"
          strokeWidth={1.4}
        />
      </g>
      <path d="M9 16 L7.6 21 M15 16 L16.4 21" strokeWidth={2} />
    </>
  ),
  // Disc golf — chain basket (soft tray) with a solid flying disc
  discgolf: (
    <>
      <path d="M6 6.5 L18 6.5 M12 6.5 L12 21 M6 6.5 L9 13 M18 6.5 L15 13 M9.5 9 L9.5 13 M14.5 9 L14.5 13" />
      <path d="M8 13 L16 13 L15.2 17 L8.8 17 Z" {...SOFT} />
      <path d="M8 13 L16 13 L15.2 17 L8.8 17 Z" />
      <path d="M9 21 L15 21" />
      <ellipse cx="5.5" cy="3.5" rx="2.6" ry="1" {...SOLID} />
    </>
  ),
  // Darts — soft board with a dart in the bullseye
  darts: (
    <>
      <circle cx="12" cy="12" r="8.5" {...SOFT} />
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.2" {...SOLID} />
      <path d="M12 12 L19.5 4.5 M17.2 4.2 L19.5 4.5 L19.8 6.8" />
    </>
  ),
  // Pool / billiards — soft ball with number ring + cue
  pool: (
    <>
      <circle cx="9" cy="15" r="6" {...SOFT} />
      <circle cx="9" cy="15" r="6" />
      <circle cx="9" cy="12.6" r="2.1" />
      <path d="M15.5 8.5 L21 3" />
    </>
  ),
  // Bowling — soft pin + ball with solid finger holes
  bowling: (
    <>
      <path d="M9.5 3 C11.6 3 12 4.6 11.4 6.4 C10.9 7.9 11 9 11.8 10.6 C12.8 12.6 12.6 16.5 9.5 16.5 C6.4 16.5 6.2 12.6 7.2 10.6 C8 9 8.1 7.9 7.6 6.4 C7 4.6 7.4 3 9.5 3 Z" {...SOFT} />
      <path d="M9.5 3 C11.6 3 12 4.6 11.4 6.4 C10.9 7.9 11 9 11.8 10.6 C12.8 12.6 12.6 16.5 9.5 16.5 C6.4 16.5 6.2 12.6 7.2 10.6 C8 9 8.1 7.9 7.6 6.4 C7 4.6 7.4 3 9.5 3 Z" />
      <path d="M8.1 7.5 L10.9 7.5" />
      <circle cx="17" cy="17" r="4" />
      <circle cx="16" cy="15.8" r="0.5" {...SOLID} />
      <circle cx="18" cy="15.8" r="0.5" {...SOLID} />
      <circle cx="17" cy="17.6" r="0.5" {...SOLID} />
    </>
  ),
  // Badminton — shuttlecock: soft cork + feather fan
  badminton: (
    <>
      <circle cx="8" cy="17.5" r="2.5" {...SOFT} />
      <circle cx="8" cy="17.5" r="2.5" />
      <path
        d="M9.8 15.7 L15 4 M11.6 16.6 L20 8.5 M15 4 L20 8.5 M12.8 9 L17.3 11.1 M11.2 12.6 L18.8 12.6"
        strokeWidth={1.4}
      />
    </>
  ),
  // Racquetball — angled round racquet (soft head) + solid ball
  racquetball: (
    <>
      <g transform="rotate(-35 11 8)">
        <circle cx="11" cy="7.5" r="4.6" {...SOFT} />
        <circle cx="11" cy="7.5" r="4.6" />
        <path d="M8 4.5 L14 10.5 M14 4.5 L8 10.5" strokeWidth={1.2} />
        <path d="M11 12.1 L11 14" />
        <rect x="9.8" y="14" width="2.4" height="6" rx="1.2" {...SOLID} />
      </g>
      <circle cx="17.5" cy="17.5" r="2.4" {...SOLID} />
    </>
  ),
  // Pop-A-Shot — soft backboard, rim + net, solid ball arcing in
  popashot: (
    <>
      <rect x="8" y="3" width="9" height="6.5" rx="1" {...SOFT} />
      <rect x="8" y="3" width="9" height="6.5" rx="1" />
      <ellipse cx="12.5" cy="11" rx="3" ry="1.1" />
      <path d="M10 12 L11 15 M15 12 L14 15 M12.5 12.1 L12.5 15.5" />
      <circle cx="5.5" cy="17.5" r="2.8" {...SOLID} />
    </>
  ),
  // Cup pong — soft cup + solid ball
  beerpong: (
    <>
      <path d="M7.5 8 L16.5 8 L15.2 21 L8.8 21 Z" {...SOFT} />
      <path d="M7.5 8 L16.5 8 L15.2 21 L8.8 21 Z" />
      <path d="M7.9 11.5 L16.1 11.5" />
      <circle cx="17.5" cy="4.5" r="2" {...SOLID} />
    </>
  ),
  // Chess — pawn with a soft body
  chess: (
    <>
      <circle cx="12" cy="6" r="2.8" {...SOLID} />
      <path d="M10.6 9 C10.6 11.8 10 13.6 9.2 15.2 L14.8 15.2 C14 13.6 13.4 11.8 13.4 9 Z" {...SOFT} />
      <path d="M10.6 9 C10.6 11.8 10 13.6 9.2 15.2 L14.8 15.2 C14 13.6 13.4 11.8 13.4 9" />
      <path d="M9.2 15.2 L8.2 18.5 L15.8 18.5 L14.8 15.2" />
      <path d="M7 21 L17 21" />
    </>
  ),
  // Video games — gamepad: soft body, d-pad, two solid buttons
  videogames: (
    <>
      <rect x="3.5" y="7.5" width="17" height="9.5" rx="4.7" {...SOFT} />
      <rect x="3.5" y="7.5" width="17" height="9.5" rx="4.7" />
      <path d="M8.2 10.5 L8.2 14.5 M6.2 12.5 L10.2 12.5" />
      <circle cx="15.2" cy="11.3" r="1" {...SOLID} />
      <circle cx="17.6" cy="13.5" r="1" {...SOLID} />
    </>
  ),
  // Board games — soft die showing five solid pips
  boardgames: (
    <>
      <rect x="5" y="5" width="14" height="14" rx="3" {...SOFT} />
      <rect x="5" y="5" width="14" height="14" rx="3" />
      <circle cx="9" cy="9" r="1.1" {...SOLID} />
      <circle cx="15" cy="9" r="1.1" {...SOLID} />
      <circle cx="12" cy="12" r="1.1" {...SOLID} />
      <circle cx="9" cy="15" r="1.1" {...SOLID} />
      <circle cx="15" cy="15" r="1.1" {...SOLID} />
    </>
  ),
  // Custom — Sporos sprout, duotoned: one leaf washes back, one stays inked
  custom: (
    <>
      <path d="M12 21 L12 10" />
      <path
        d="M12 13 C 8.8 13 6.3 10.8 6 7.5 C 9.2 7.5 11.7 9.7 12 13 Z"
        fill="currentColor"
        opacity="0.45"
        stroke="none"
      />
      <path
        d="M12 11 C 15.2 11 17.7 8.8 18 5.5 C 14.8 5.5 12.3 7.7 12 11 Z"
        {...SOLID}
      />
      <circle cx="12" cy="5.4" r="1.1" {...SOLID} />
    </>
  ),
};

// First match wins — order matters: "disc golf" before generic "golf",
// "pop-a-shot" before "basket", "table tennis"/"ping" before "tennis",
// "flag football" before a bare "football", "board game" before "game".
// Every built-in sport has its own glyph; the Custom sprout is ONLY the
// fallback for unknown/custom-typed sports.
const RULES: [RegExp, Key][] = [
  [/pickle/i, "pickleball"],
  [/ping|table tennis/i, "tabletennis"],
  [/badmin/i, "badminton"],
  [/racquet|squash/i, "racquetball"],
  [/tennis/i, "tennis"],
  [/pop-?a-?shot/i, "popashot"],
  [/basket|hoop/i, "basketball"],
  [/soccer|futbol/i, "soccer"],
  [/football/i, "flagfootball"],
  [/foos/i, "foosball"],
  [/corn/i, "cornhole"],
  [/spike/i, "spikeball"],
  [/volley/i, "volleyball"],
  [/disc|frisbee/i, "discgolf"],
  [/golf/i, "golf"],
  [/dart/i, "darts"],
  [/pool|billiard|snooker/i, "pool"],
  [/bowl/i, "bowling"],
  [/cup ?pong|beer/i, "beerpong"], // same cup-and-ball glyph — "Cup Pong" is the shipping name
  [/chess/i, "chess"],
  [/video|esport|arcade/i, "videogames"],
  [/board/i, "boardgames"],
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
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {ICONS[keyFor(sport)]}
    </svg>
  );
}
