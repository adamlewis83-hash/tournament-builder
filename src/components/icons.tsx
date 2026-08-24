"use client";

// App chrome icons (Phosphor duotone) + custom format glyphs. The format tile
// icons are hand-drawn in the same style as SportIcon — one 24px grid, 1.8px
// stroke, a 26% currentColor wash behind the linework — so the New Tournament
// picker speaks one visual language from sports through formats.
import type { ReactNode } from "react";
import {
  Trophy as PhTrophy,
  Crown as PhCrown,
  Plant,
  Plus as PhPlus,
  Broadcast,
  House,
  Copy as PhCopy,
  ShareNetwork,
  Printer as PhPrinter,
  Image as PhImage,
  Cloud as PhCloud,
  Envelope,
  Moon as PhMoon,
  Sun as PhSun,
  Flag as PhFlag,
  FloppyDisk,
  Gear as PhGear,
  Cards as PhCards,
  type Icon,
  type IconProps,
} from "@phosphor-icons/react";

const duo = (Comp: Icon) => {
  const Wrapped = (props: IconProps) => <Comp weight="duotone" {...props} />;
  Wrapped.displayName = "DuotoneIcon";
  return Wrapped;
};

export const Trophy = duo(PhTrophy);
export const Crown = duo(PhCrown);
export const Sprout = duo(Plant);
export const Plus = duo(PhPlus);
export const Radio = duo(Broadcast);
export const Home = duo(House);
export const Copy = duo(PhCopy);
export const Share2 = duo(ShareNetwork);
export const Printer = duo(PhPrinter);
export const Image = duo(PhImage);
export const Cloud = duo(PhCloud);
export const Mail = duo(Envelope);
export const Moon = duo(PhMoon);
export const Sun = duo(PhSun);
export const Flag = duo(PhFlag);
export const Save = duo(FloppyDisk);
export const Settings = duo(PhGear);
export const Cards = duo(PhCards);

// ---- Custom format glyphs (SportIcon's hand: 1.8px line + 26% wash) --------

const SOFT = { fill: "currentColor", opacity: 0.26, stroke: "none" } as const;
const SOLID = { fill: "currentColor", stroke: "none" } as const;

const glyph = (name: string, children: ReactNode) => {
  const C = ({ className }: IconProps) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className as string}
    >
      {children}
    </svg>
  );
  C.displayName = name;
  return C;
};

// Round robin — the cycle: everyone comes back around to play everyone.
export const IconRoundRobin = glyph(
  "IconRoundRobin",
  <>
    <circle cx="12" cy="12" r="6.5" {...SOFT} />
    <path d="M5.8 10.2 A 6.5 6.5 0 0 1 18.2 10.2" />
    <path d="M18.2 10.2 L18.6 7.4 M18.2 10.2 L15.4 9.5" />
    <path d="M18.2 13.8 A 6.5 6.5 0 0 1 5.8 13.8" />
    <path d="M5.8 13.8 L5.4 16.6 M5.8 13.8 L8.6 14.5" />
  </>,
);

// Swiss — ranked rows: you play whoever sits on your line.
export const IconSwiss = glyph(
  "IconSwiss",
  <>
    <rect x="4" y="4.5" width="4.2" height="4.2" rx="1.2" {...SOFT} />
    <rect x="4" y="4.5" width="4.2" height="4.2" rx="1.2" />
    <path d="M11.2 6.6 L20 6.6" />
    <rect x="4" y="10" width="4.2" height="4.2" rx="1.2" {...SOFT} />
    <rect x="4" y="10" width="4.2" height="4.2" rx="1.2" />
    <path d="M11.2 12.1 L17.5 12.1" />
    <rect x="4" y="15.5" width="4.2" height="4.2" rx="1.2" {...SOFT} />
    <rect x="4" y="15.5" width="4.2" height="4.2" rx="1.2" />
    <path d="M11.2 17.6 L19 17.6" />
  </>,
);

// King of the Court — the crown you hold until someone takes it.
export const IconKotc = glyph(
  "IconKotc",
  <>
    <path d="M4.5 8.3 L8.6 11.4 L12 5.8 L15.4 11.4 L19.5 8.3 L18.1 17.2 L5.9 17.2 Z" {...SOFT} />
    <path d="M4.5 8.3 L8.6 11.4 L12 5.8 L15.4 11.4 L19.5 8.3 L18.1 17.2 L5.9 17.2 Z" />
    <path d="M7 20.2 L17 20.2" opacity="0.4" />
  </>,
);

// Single elimination — the bracket funnels to one champion node.
export const IconSingleElim = glyph(
  "IconSingleElim",
  <>
    <path d="M4 5 L8 5 M4 9.4 L8 9.4 M8 5 L8 9.4 M8 7.2 L12.6 7.2" />
    <path d="M4 14.6 L8 14.6 M4 19 L8 19 M8 14.6 L8 19 M8 16.8 L12.6 16.8" />
    <path d="M12.6 7.2 L12.6 16.8 M12.6 12 L16.9 12" />
    <circle cx="19" cy="12" r="2.1" {...SOFT} />
    <circle cx="19" cy="12" r="2.1" />
  </>,
);

// Double elimination — the faded losers rail earns its way back to the same node.
export const IconDoubleElim = glyph(
  "IconDoubleElim",
  <>
    <path d="M3.5 5 L7 5 M3.5 8.6 L7 8.6 M7 5 L7 8.6 M7 6.8 L10.5 6.8" />
    <path d="M3.5 15.4 L7 15.4 M3.5 19 L7 19 M7 15.4 L7 19 M7 17.2 L10.5 17.2" opacity="0.55" />
    <path d="M10.5 6.8 L13.5 6.8 L13.5 12 M10.5 17.2 L13.5 17.2 L13.5 12 M13.5 12 L16.9 12" />
    <circle cx="19" cy="12" r="2.1" {...SOFT} />
    <circle cx="19" cy="12" r="2.1" />
  </>,
);

// Pool play → bracket — a pool of dots feeding a bracket.
export const IconPools = glyph(
  "IconPools",
  <>
    <rect x="3.5" y="6.5" width="9" height="11" rx="2" {...SOFT} />
    <rect x="3.5" y="6.5" width="9" height="11" rx="2" />
    <circle cx="6.6" cy="10" r="1.15" {...SOLID} />
    <circle cx="10.4" cy="10" r="1.15" {...SOLID} />
    <circle cx="6.6" cy="14" r="1.15" {...SOLID} />
    <circle cx="10.4" cy="14" r="1.15" {...SOLID} />
    <path d="M15.5 8.5 L18 8.5 M15.5 15.5 L18 15.5 M18 8.5 L18 15.5 M18 12 L21 12" />
  </>,
);

// Americano — partners swap ends every round.
export const IconAmericano = glyph(
  "IconAmericano",
  <>
    <circle cx="7.5" cy="7" r="2.1" {...SOLID} />
    <circle cx="16.5" cy="17" r="2.1" {...SOFT} />
    <circle cx="16.5" cy="17" r="2.1" />
    <path d="M14.5 5.5 A 7.5 7.5 0 0 1 19.5 11.5" />
    <path d="M19.5 11.5 L20.6 8.9 M19.5 11.5 L16.9 10.6" />
    <path d="M9.5 18.5 A 7.5 7.5 0 0 1 4.5 12.5" />
    <path d="M4.5 12.5 L3.4 15.1 M4.5 12.5 L7.1 13.4" />
  </>,
);

// Mexicano — the field, ranked: your next partner comes from the standings.
export const IconMexicano = glyph(
  "IconMexicano",
  <>
    <circle cx="12" cy="7.6" r="2.3" {...SOLID} />
    <path d="M7.8 19 A 4.2 4.6 0 0 1 16.2 19 Z" {...SOFT} />
    <path d="M7.8 19 A 4.2 4.6 0 0 1 16.2 19" />
    <circle cx="4.9" cy="9.6" r="1.7" />
    <path d="M2 18.6 A 2.9 3.2 0 0 1 7.8 18.6" opacity="0.55" />
    <circle cx="19.1" cy="9.6" r="1.7" />
    <path d="M16.2 18.6 A 2.9 3.2 0 0 1 22 18.6" opacity="0.55" />
  </>,
);

// Ryder Cup — two team pennants, crossed.
export const IconRyder = glyph(
  "IconRyder",
  <>
    <path d="M6.5 4 L6.5 20" />
    <path d="M6.5 4.8 L12.5 7.2 L6.5 9.6 Z" {...SOLID} />
    <path d="M17.5 4 L17.5 20" />
    <path d="M17.5 4.8 L11.5 7.2 L17.5 9.6 Z" {...SOFT} />
    <path d="M17.5 4.8 L11.5 7.2 L17.5 9.6 Z" />
    <path d="M4.5 20.5 L19.5 20.5" opacity="0.4" />
  </>,
);

// Golf — the same angled club + ball as SportIcon, swing-arc wash and all.
export const IconGolf = glyph(
  "IconGolf",
  <>
    <path
      d="M16.5 3.5 A 14.5 14.5 0 0 1 9.6 14 L 8.7 15.3 A 16.3 16.3 0 0 0 16.5 3.5 Z"
      {...SOFT}
    />
    <path d="M16.5 3.5 L8.7 15.3" />
    <ellipse cx="7.3" cy="16.4" rx="3.1" ry="1.85" transform="rotate(-38 7.3 16.4)" {...SOLID} />
    <circle cx="16.8" cy="18.9" r="1.9" {...SOFT} />
    <circle cx="16.8" cy="18.9" r="1.9" />
    <path d="M11.8 20.9 L21 20.9" opacity="0.4" />
  </>,
);

// Custom — sliders: set it up exactly how you play it.
export const IconCustom = glyph(
  "IconCustom",
  <>
    <path d="M4 7 L7.2 7 M11.2 7 L20 7" />
    <circle cx="9.2" cy="7" r="2" {...SOFT} />
    <circle cx="9.2" cy="7" r="2" />
    <path d="M4 12 L12.8 12 M16.8 12 L20 12" />
    <circle cx="14.8" cy="12" r="2" {...SOFT} />
    <circle cx="14.8" cy="12" r="2" />
    <path d="M4 17 L5.2 17 M9.2 17 L20 17" />
    <circle cx="7.2" cy="17" r="2" {...SOFT} />
    <circle cx="7.2" cy="17" r="2" />
  </>,
);

// Score challenge — post your number at the target.
export const IconScore = glyph(
  "IconScore",
  <>
    <circle cx="12" cy="12" r="8.3" {...SOFT} />
    <circle cx="12" cy="12" r="8.3" />
    <circle cx="12" cy="12" r="4.6" />
    <circle cx="12" cy="12" r="1.3" {...SOLID} />
  </>,
);

// Ladder — climb a rung by beating whoever holds it.
export const IconLadder = glyph(
  "IconLadder",
  <>
    <rect x="7" y="4" width="10" height="16.5" {...SOFT} />
    <path d="M7 3.8 L7 20.5 M17 3.8 L17 20.5" />
    <path d="M7 7.5 L17 7.5 M7 11.75 L17 11.75 M7 16 L17 16" />
  </>,
);
