"use client";

import { Trophy } from "@/components/icons";
import { Match, Participant } from "@/lib/types";
import { bracketChampion } from "@/lib/bracket";
import { colorFor } from "@/lib/colors";
import { Confetti } from "./Confetti";

export function Champion({
  matches,
  participants,
}: {
  matches: Match[];
  participants: Participant[];
}) {
  const champ = bracketChampion(matches);
  if (!champ) return null;
  const label = champ.map((id) => participants.find((p) => p.id === id)?.name ?? "?").join(" & ");

  return (
    <>
      <Confetti trigger={label} />
      <div className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/15 via-yellow-400/10 to-[var(--brand-soft)] p-6 text-center glow-brand">
        <Trophy className="h-12 w-12 mx-auto text-amber-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]" />
        <div className="mt-2 text-xs uppercase tracking-[0.3em] text-amber-300 font-bold">
          Champion
        </div>
        <div className="mt-1 flex items-center justify-center gap-2 text-2xl font-extrabold">
          <span className="flex -space-x-1">
            {champ.map((id) => (
              <span
                key={id}
                className="h-3.5 w-3.5 rounded-full ring-2 ring-black/40"
                style={{ background: colorFor(participants, id) }}
              />
            ))}
          </span>
          {label}
        </div>
      </div>
    </>
  );
}
