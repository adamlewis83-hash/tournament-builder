import { MarketingLanding } from "@/components/MarketingLanding";

export const metadata = {
  title: "Free Cornhole Tournament Bracket Maker — Sporos",
  description:
    "Run a backyard or bar-league cornhole tournament free: brackets or round robin, team play, live scoring on every phone, and a champion crowned at the end.",
  alternates: { canonical: "https://sporos.app/cornhole-bracket" },
};

const related = [
  { href: "/bracket-maker", label: "Bracket maker" },
  { href: "/pickleball-tournament", label: "Pickleball tournament maker" },
  { href: "/golf-scorecard", label: "Golf scorecard & skins" },
];

export default function CornholeBracketPage() {
  return (
    <MarketingLanding
      kicker="Free cornhole tournament"
      title="Run a cornhole tournament people take (too) seriously"
      intro="Backyard BBQ or bar league — build the bracket in seconds, let teams register from a QR code, score to 21 from any phone, and crown a champion. Free, no sign-up."
      bullets={[
        "Single elimination, double elimination (everyone gets a second chance), or round robin",
        "Fixed partners for proper cornhole teams — or rotating partners to mix the party up",
        "Score to 21 with optional win-by-2; multiple boards run at once",
        "Players register themselves by scanning a QR — you grill, the bracket fills",
        "Everyone follows the bracket live from their own phone with a join code",
        "Champions live forever in the Record Book (bragging rights included)",
      ]}
      steps={[
        ["Seed it", "Share the QR at the party, pair up teams, pick your format, and generate the bracket."],
        ["Play on", "Boards get assigned, scores go in from any phone, winners advance automatically."],
        ["Crown a champion", "The final ends, the champion's crowned, and the rematch demands begin."],
      ]}
      faqs={[
        {
          q: "How many teams can play?",
          a: "Any number — byes are handled automatically, and double elimination keeps early losers in the hunt through the losers bracket.",
        },
        {
          q: "Can people join without the app?",
          a: "Yes — registration and live following both work in the browser from a QR code or join code. Nobody has to install anything.",
        },
        {
          q: "Does it work for other backyard games?",
          a: "All of them — cup pong, spikeball, darts, pop-a-shot, bocce via custom sports. Same brackets, same live scoring.",
        },
        {
          q: "What does it cost?",
          a: "Nothing — brackets, scoring, and live sharing are free, on the web and in the Sporos iPhone app.",
        },
      ]}
      related={related}
    />
  );
}
