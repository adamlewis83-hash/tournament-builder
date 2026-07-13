"use client";

import Link from "next/link";
import { Crown } from "@/components/icons";
import { Match, Participant } from "@/lib/types";
import { bracketChampion } from "@/lib/bracket";
import { colorFor, photoFor } from "@/lib/colors";
import { Avatar } from "./Avatar";
import { Confetti } from "./Confetti";

// The runner-up is whoever lost the deciding match (mirrors bracketChampion's
// notion of which match decided it).
function bracketRunnerUp(matches: Match[]): string[] | null {
  const decided = (m: Match) => m.scoreA !== null && m.scoreB !== null;
  const reset = matches.find((m) => m.phase === "championship");
  if (reset && reset.sideA.length && reset.sideB.length && decided(reset)) {
    return (reset.scoreA as number) > (reset.scoreB as number) ? reset.sideB : reset.sideA;
  }
  const grandFinal = matches.find((m) => m.phase === "final");
  if (grandFinal && decided(grandFinal)) {
    if ((grandFinal.scoreB as number) > (grandFinal.scoreA as number)) return null; // reset pending
    return grandFinal.sideB;
  }
  const terminal = matches.filter((m) => m.phase === "winners" && !m.nextMatchId);
  const finalM = terminal.sort((a, b) => b.round - a.round)[0];
  if (!finalM || !decided(finalM)) return null;
  return (finalM.scoreA as number) > (finalM.scoreB as number) ? finalM.sideB : finalM.sideA;
}

// The CROWN moment (slogan arc: Seed → Play → Crown): gold-ringed champion
// avatars under "«Name» is crowned", the runner-up's silver, and a Record Book
// action in amber.
export function Champion({
  matches,
  participants,
}: {
  matches: Match[];
  participants: Participant[];
}) {
  const champ = bracketChampion(matches);
  if (!champ) return null;
  const name = (id: string) => participants.find((p) => p.id === id)?.name ?? "?";
  const label = champ.map(name).join(" & ");
  const runnerUp = bracketRunnerUp(matches);

  return (
    <>
      <Confetti trigger={label} />
      <div className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/15 via-yellow-400/10 to-[var(--brand-soft)] p-6 text-center glow-brand">
        <Crown className="h-12 w-12 mx-auto text-amber-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]" />
        <div className="mt-3 flex items-center justify-center -space-x-2">
          {champ.map((id) => (
            <Avatar
              key={id}
              name={name(id)}
              color={colorFor(participants, id)}
              photo={photoFor(participants, id)}
              className="h-12 w-12 text-base ring-2 ring-amber-400 shadow-[0_0_14px_rgba(250,204,21,0.45)]"
            />
          ))}
        </div>
        <div className="mt-2 text-2xl font-extrabold">
          {label} <span className="font-bold">is crowned</span>
        </div>
        {runnerUp && runnerUp.length > 0 && (
          <div className="mt-1.5 text-sm text-[var(--muted)]">
            🥈 {runnerUp.map(name).join(" & ")}
          </div>
        )}
        <Link
          href="/records"
          className="mt-4 inline-block rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-black/80 hover:brightness-105"
        >
          To the Record Book →
        </Link>
      </div>
    </>
  );
}
