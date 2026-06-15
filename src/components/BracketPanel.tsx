"use client";

import { Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Button, Card } from "./ui";
import { BracketView } from "./BracketView";

// The finals knockout bracket for a round-robin: generate from standings, then play it out.
export function BracketPanel({ t }: { t: Tournament }) {
  const generateFinals = useStore((s) => s.generateFinals);
  const clearFinals = useStore((s) => s.clearFinals);

  const rrMatches = t.matches.filter((m) => m.phase === "rr");
  const finals = t.matches.filter(
    (m) =>
      m.phase === "winners" || m.phase === "losers" || m.phase === "final" || m.phase === "championship",
  );
  const rrComplete =
    rrMatches.length > 0 && rrMatches.every((m) => m.scoreA !== null && m.scoreB !== null);
  const hasFinals = finals.length > 0;

  if (!hasFinals) {
    return (
      <Card className="p-6 text-center">
        <p className="font-medium">Finals bracket: top {t.config.advanceCount} advance</p>
        <p className="text-sm text-[var(--muted)] mt-1 mb-3">
          {t.playStyle === "doubles"
            ? `Seeds are paired best-with-worst (e.g. 1 & ${t.config.advanceCount} vs 2 & ${t.config.advanceCount - 1}).`
            : "Seeds are drawn from the current standings."}
          {!rrComplete && " You can generate now or wait until every round-robin game is in."}
        </p>
        <Button onClick={() => generateFinals(t.id)}>Generate bracket →</Button>
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Finals bracket</h3>
        <Button
          variant="outline"
          onClick={() => generateFinals(t.id)}
          title="Rebuild the bracket from the current standings"
        >
          Re-seed
        </Button>
      </div>
      <BracketView matches={finals} participants={t.participants} tournamentId={t.id} />
      <div className="text-right">
        <Button variant="danger" onClick={() => clearFinals(t.id)}>
          Clear bracket
        </Button>
      </div>
    </Card>
  );
}
