import { MarketingLanding } from "@/components/MarketingLanding";

export const metadata = {
  title: "Free Tournament Bracket Maker — Sporos",
  description:
    "Make a single or double elimination bracket in seconds, free. Seed players, score live from any phone, and crown a champion — no sign-up, no ads.",
  alternates: { canonical: "https://sporos.app/bracket-maker" },
};

const related = [
  { href: "/pickleball-round-robin", label: "Pickleball round robin" },
  { href: "/golf-scorecard", label: "Golf scorecard & skins" },
  { href: "/cornhole-bracket", label: "Cornhole bracket" },
];

export default function BracketMakerPage() {
  return (
    <MarketingLanding
      kicker="Free bracket maker"
      title="Make a tournament bracket in seconds"
      intro="Type your players, tap Seed, and you've got a real bracket — single or double elimination, with live scoring on every phone and a champion crowned at the end. Free, no sign-up, no ads."
      bullets={[
        "Single elimination, double elimination, round robin, Swiss, pools → bracket, and more",
        "Random draw or custom seeding, with byes handled automatically",
        "Score from your phone — or go live so every player and spectator follows along with a join code",
        "Optional bronze-medal match, win-by-2 rules, timed games, multiple courts",
        "Works for any sport or game: pickleball, tennis, cornhole, cup pong, foosball, chess, video games…",
        "Free on the web, and on iPhone with the Sporos app",
      ]}
      steps={[
        ["Seed it", "Add players (or let them register themselves via QR code), pick a format, and generate the bracket."],
        ["Play on", "Enter scores as games finish — winners advance automatically, round by round."],
        ["Crown a champion", "The winner gets their moment, and every result lands in your Record Book."],
      ]}
      faqs={[
        {
          q: "Is the bracket maker really free?",
          a: "Yes — creating brackets, scoring, and live sharing are free. No account is required; an optional email sign-in backs your tournaments up across devices.",
        },
        {
          q: "How many players can a bracket have?",
          a: "Any number — byes are placed automatically when the field isn't a power of two.",
        },
        {
          q: "Can other people watch the bracket live?",
          a: "Yes. Start a live session and share the join code or QR — everyone sees scores update in real time from their own phone, no app required.",
        },
        {
          q: "Does it work for doubles or teams?",
          a: "Yes — singles, fixed doubles partners, rotating partners, or full teams, depending on the format you pick.",
        },
      ]}
      related={related}
    />
  );
}
