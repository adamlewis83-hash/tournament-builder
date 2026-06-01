"use client";

import { Match, Participant } from "@/lib/types";
import { bracketChampion } from "@/lib/bracket";

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
    <div className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-100 p-5 text-center">
      <div className="text-3xl">🏆</div>
      <div className="text-xs uppercase tracking-widest text-amber-700 font-semibold mt-1">
        Champion
      </div>
      <div className="text-xl font-bold text-amber-900">{label}</div>
    </div>
  );
}
