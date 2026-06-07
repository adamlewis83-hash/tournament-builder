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
