"use client";

import { Tournament } from "@/lib/types";
import { finalsStarted, useStore } from "@/lib/store";
import { isFinal } from "@/lib/score";
import { Button, Card } from "./ui";
import { BracketView } from "./BracketView";

// The finals knockout bracket for a round-robin: generate from standings, then play it out.
export function BracketPanel({ t }: { t: Tournament }) {
  const generateFinals = useStore((s) => s.generateFinals);
  const clearFinals = useStore((s) => s.clearFinals);

  const rrMatches = t.matches.filter((m) => m.phase === "rr");
  const finals = t.matches.filter(
    (m) =>
      m.phase === "winners" ||
      m.phase === "losers" ||
      m.phase === "final" ||
      m.phase === "championship" ||
      m.phase === "placement",
  );
  const rrComplete = rrMatches.length > 0 && rrMatches.every(isFinal);
  const hasFinals = finals.length > 0;
  const started = finalsStarted(t.matches);

  if (!hasFinals) {
    return (
      <Card className="p-6 text-center">
        <p className="font-medium">Play off for the title — top {t.config.advanceCount} advance</p>
        <p className="text-sm text-[var(--muted)] mt-1 mb-3">
          This is the knockout played <em>after</em> the round robin — it doesn&apos;t change your
          schedule.{" "}
          {t.playStyle === "doubles"
            ? `The top ${t.config.advanceCount} are re-paired into new teams, best with worst (1 & ${t.config.advanceCount} vs 2 & ${t.config.advanceCount - 1}), so the draw is even.`
            : "The top seeds are taken straight from the standings."}
          {!rrComplete && " Seed it now and it keeps up with the standings until the first game starts."}
        </p>
        <Button onClick={() => generateFinals(t.id)}>Seed it →</Button>
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Finals bracket</h3>
          <p className="text-xs text-[var(--muted)]">
            {started
              ? "Under way — the draw is locked, so results stay put."
              : "Tracking the standings. Locks as soon as the first finals game is scored."}
          </p>
        </div>
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
