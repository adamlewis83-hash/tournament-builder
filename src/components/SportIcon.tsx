"use client";

// Sport-specific duotone icons (Phosphor), matching the app's icon language — a crisp,
// designed two-tone look in currentColor, instead of flat generic emoji.
import {
  Basketball,
  SoccerBall,
  TennisBall,
  Volleyball,
  BowlingBall,
  PingPong,
  Football,
  Baseball,
  Golf,
  Disc,
  Target,
  GameController,
  BeerStein,
  Racquet,
  ForkKnife,
  Cube,
  Boules,
  Trophy,
  type Icon,
  type IconProps,
} from "@phosphor-icons/react";

// First match wins — order matters (e.g. "flag football" before generic "football").
const RULES: [RegExp, Icon][] = [
  [/ping|table tennis|pickle/i, PingPong],
  [/badmin|racquet|squash/i, Racquet],
  [/tennis/i, TennisBall],
  [/basket|pop-?a-?shot|hoop/i, Basketball],
  [/flag football|american football|gridiron/i, Football],
  [/soccer|football|futbol/i, SoccerBall],
  [/golf/i, Golf],
  [/disc|frisbee/i, Disc],
  [/bowl/i, BowlingBall],
  [/volley/i, Volleyball],
  [/baseball|softball|wiffle/i, Baseball],
  [/corn|dart|axe/i, Target],
  [/foos|pool|billiard|bocce|petanque/i, Boules],
  [/video|esport|gaming|game/i, GameController],
  [/board|dice|domino/i, Cube],
  [/beer|spike/i, BeerStein],
  [/cook|chili|bbq|food|grill/i, ForkKnife],
];

export function sportIcon(sport: string): Icon {
  for (const [re, Comp] of RULES) if (re.test(sport)) return Comp;
  return Trophy;
}

export function SportIcon({
  sport,
  className = "h-5 w-5",
  ...props
}: { sport: string } & IconProps) {
  const Comp = sportIcon(sport);
  return <Comp weight="duotone" className={className} {...props} />;
}
