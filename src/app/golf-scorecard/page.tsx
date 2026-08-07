import { MarketingLanding } from "@/components/MarketingLanding";

export const metadata = {
  title: "Free Golf Scorecard App — Stroke Play, Skins & Nassau — Sporos",
  description:
    "Score your golf group free: stroke play (gross/net), Stableford, skins with carryovers, Nassau, and match play. Handicaps, live leaderboard, GPS distances.",
  alternates: { canonical: "https://sporos.app/golf-scorecard" },
};

const related = [
  { href: "/bracket-maker", label: "Bracket maker" },
  { href: "/pickleball-round-robin", label: "Pickleball round robin" },
  { href: "/cornhole-bracket", label: "Cornhole bracket" },
];

export default function GolfScorecardPage() {
  return (
    <MarketingLanding
      kicker="Free golf scoring"
      title="The golf scorecard that runs your whole game"
      intro="Stroke play, Stableford, skins with carryovers, Nassau, match play — with handicaps applied per hole, a live to-par leaderboard, and GPS distance to the pin. Free, in your browser or on iPhone."
      bullets={[
        "Stroke play (gross and net), Stableford, Skins, Nassau, and head-to-head match play",
        "Handicaps auto-applied hole by hole from each player's index",
        "Course search loads real tees, pars, and hole handicaps — or enter a custom course once and save it",
        "Live to-par leaderboard above the full scorecard as you play",
        "GPS satellite view with live distance to the green (phone in hand, rangefinder in pocket)",
        "Friends and the group chat can follow along live with a join code",
      ]}
      steps={[
        ["Seed it", "Pick your course (search loads the scorecard for you), add players and handicaps, choose your games."],
        ["Play on", "Tap scores in as you walk. Skins carry, presses trigger, the leaderboard sorts itself."],
        ["Crown a champion", "Settle the bets on the 18th with every side game already computed — then it's in the Record Book."],
      ]}
      faqs={[
        {
          q: "Does it calculate skins carryovers automatically?",
          a: "Yes — tied holes carry the skin forward, and the running skins count per player updates live.",
        },
        {
          q: "How are handicaps applied?",
          a: "Each player's course handicap is distributed across holes by the course's hole-handicap ratings, so net scoring is correct on every hole.",
        },
        {
          q: "Can we play multiple games at once?",
          a: "Yes — score once and run stroke play, skins, and a Nassau on the same round simultaneously.",
        },
        {
          q: "Does the GPS work on any course?",
          a: "The satellite map and distance-to-pin work anywhere; course data comes from OpenStreetMap and your saved custom courses.",
        },
      ]}
      related={related}
    />
  );
}
