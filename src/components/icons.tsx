"use client";

// Premium duotone icon set (Phosphor), re-exported under the names the app uses.
// Duotone draws a solid accent + a translucent fill in currentColor, so setting the
// text color (e.g. text-[var(--brand)]) gives a designed two-tone look.
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
  ArrowsClockwise,
  ListNumbers,
  Tree,
  TreeStructure,
  GridFour,
  Shuffle,
  UsersThree,
  Users,
  PuzzlePiece,
  Target,
  Ladder,
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

// Format tile icons (Phosphor duotone) for the New Tournament picker.
export const IconRoundRobin = duo(ArrowsClockwise);
export const IconSwiss = duo(ListNumbers);
export const IconSingleElim = duo(Tree);
export const IconDoubleElim = duo(TreeStructure);
export const IconPools = duo(GridFour);
export const IconAmericano = duo(Shuffle);
export const IconMexicano = duo(UsersThree);
export const IconRyder = duo(Users);
// Golf format tile — the custom monoline club + ball on ground (matches the
// SportIcon set's weight), not the thin Phosphor flag it replaced.
export const IconGolf = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M9 4 L9 18" />
    <path d="M9 4 L16 6 L9 8.5 Z" fill="currentColor" />
    <ellipse cx="10" cy="18.5" rx="5.5" ry="1.8" />
  </svg>
);
IconGolf.displayName = "IconGolf";
export const IconCustom = duo(PuzzlePiece);
export const IconScore = duo(Target);
export const IconLadder = duo(Ladder);
