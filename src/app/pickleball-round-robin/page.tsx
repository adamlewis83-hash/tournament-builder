import { MarketingLanding } from "@/components/MarketingLanding";

export const metadata = {
  title: "Free Pickleball Round Robin Generator — Sporos",
  description:
    "Generate a pickleball round robin in seconds — singles, fixed partners, or rotating partners (Americano/Mexicano). Live standings, court assignments, free.",
  alternates: { canonical: "https://sporos.app/pickleball-round-robin" },
};

const related = [
  { href: "/bracket-maker", label: "Bracket maker" },
  { href: "/golf-scorecard", label: "Golf scorecard & skins" },
  { href: "/cornhole-bracket", label: "Cornhole bracket" },
];

export default function PickleballRoundRobinPage() {
  return (
    <MarketingLanding
      kicker="Free pickleball scheduler"
      title="Pickleball round robin, generated in seconds"
      intro="Every player, the right number of games, courts assigned, standings updating live — without the spreadsheet. Singles, fixed doubles, or rotating partners (Americano and Mexicano), free and no sign-up."
      bullets={[
        "Round robin, Americano, Mexicano, King of the Court, Swiss, or pools into a playoff bracket",
        "Court assignments and rounds laid out automatically — no double-booked players",
        "Live standings: wins, point differential, and a 'top N advance' cut line for playoffs",
        "Players can register themselves from a QR code — no typing names at the kitchen counter",
        "Score on any phone; spectators follow live with a join code",
        "Optional playoff bracket seeded straight from the standings",
      ]}
      steps={[
        ["Seed it", "Add players or share the QR for self-registration, pick round robin (or Americano for rotating partners), set your courts."],
        ["Play on", "Each round shows who's on which court. Enter scores as games end — standings update instantly."],
        ["Crown a champion", "Finish the schedule or seed the top finishers into a playoff bracket for a proper final."],
      ]}
      faqs={[
        {
          q: "What's the difference between round robin, Americano, and Mexicano?",
          a: "Round robin keeps teams fixed and everyone plays everyone. Americano rotates partners randomly each round with individual scoring. Mexicano also rotates partners but matches players by current standing, so games stay close.",
        },
        {
          q: "How does it handle an odd number of players?",
          a: "Byes are rotated automatically so everyone sits out fairly.",
        },
        {
          q: "Can we run playoffs after the round robin?",
          a: "Yes — one tap seeds the top finishers from the standings into a knockout bracket, with an optional bronze-medal match.",
        },
        {
          q: "Is it free?",
          a: "Yes — scheduling, scoring, standings, and live sharing are free. It runs in your browser, or in the Sporos iPhone app.",
        },
      ]}
      related={related}
    />
  );
}
