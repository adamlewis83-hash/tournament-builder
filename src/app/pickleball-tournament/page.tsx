import { MarketingLanding } from "@/components/MarketingLanding";

export const metadata = {
  title: "Free Pickleball Tournament Maker — Brackets, King of the Court & More — Sporos",
  description:
    "Run any pickleball tournament free: single or double elimination brackets, King of the Court, ladders, pools, round robin. Live scoring on every phone.",
  alternates: { canonical: "https://sporos.app/pickleball-tournament" },
};

const related = [
  { href: "/pickleball-round-robin", label: "Pickleball round robin & Americano" },
  { href: "/bracket-maker", label: "Bracket maker" },
  { href: "/cornhole-bracket", label: "Cornhole bracket" },
  { href: "/golf-scorecard", label: "Golf scorecard & skins" },
];

export default function PickleballTournamentPage() {
  return (
    <MarketingLanding
      kicker="Free pickleball tournament maker"
      title="Run any pickleball tournament — brackets, King of the Court, ladders"
      intro="From a 4-player driveway showdown to a 32-player club championship: pick a format, add players (or let them scan a QR to join), and score live from every phone. Free, no sign-up."
      bullets={[
        "Every format organizers actually use: single & double elimination, King of the Court, ladder, Swiss, pools into a playoff bracket, round robin, Americano, Mexicano",
        "Singles, fixed doubles partners, or rotating partners",
        "Seeded draws with byes handled automatically — or random draw for casual nights",
        "Courts assigned per round; multiple courts run at once",
        "Live scoring with a join code — players and spectators follow standings and brackets from their own phones",
        "Champions and results saved to your Record Book, event after event",
      ]}
      steps={[
        ["Seed it", "Pick your format and play style, add players or open QR self-registration, and generate the draw."],
        ["Play on", "Courts fill, scores go in from any phone, winners advance — no whiteboard, no spreadsheet."],
        ["Crown a champion", "The final ends, someone's crowned, and the results live in the Record Book."],
      ]}
      faqs={[
        {
          q: "Which format should I pick?",
          a: "Brackets (single or double elimination) for a champion-day feel; King of the Court for continuous play with limited courts; round robin or Americano for social nights where everyone plays the same amount; pools-to-bracket for big fields that want both.",
        },
        {
          q: "How does King of the Court work here?",
          a: "Winners move up a court, others move down, rounds run on a shared clock — Sporos tracks the movement and the running standings for you.",
        },
        {
          q: "Can players sign themselves up?",
          a: "Yes — share a QR code and each player registers with their own name and photo. You just pair teams and hit go.",
        },
        {
          q: "Is it really free?",
          a: "Yes — all formats, live scoring, and sharing are free, in the browser at sporos.app or in the Sporos iPhone app.",
        },
      ]}
      related={related}
    />
  );
}
