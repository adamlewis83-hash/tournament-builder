"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { getProfile } from "@/lib/profile";
import { seedIndexForPlayer } from "@/lib/handicap";
import { Card } from "./ui";

// The player's Seed Index — the estimated handicap grown from rounds actually
// played in Sporos. Renders nothing until the profile has a name and at least
// one finished individual golf round exists.
export function SeedIndexCard() {
  const tournaments = useStore((s) => s.tournaments);
  const [name, setName] = useState("");
  useEffect(() => setName(getProfile().name.trim()), []);
  if (!name) return null;

  const r = seedIndexForPlayer(tournaments, name);
  if (r.rounds === 0 && !r.pendingNine) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold flex items-center gap-2">⛳ Seed Index</h2>
          <p className="text-xs text-[var(--muted)]">
            Your estimated handicap, grown from {r.rounds} finished round
            {r.rounds === 1 ? "" : "s"} in Sporos
            {r.pendingNine ? " · one 9-hole round is waiting for a partner nine" : ""}.
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-4xl font-extrabold tabular-nums leading-none">
            {r.index != null ? r.index.toFixed(1) : "—"}
          </div>
          {r.index == null && (
            <div className="text-[10px] text-[var(--muted)]">
              {3 - r.differentials.length} more round{3 - r.differentials.length === 1 ? "" : "s"} to
              go
            </div>
          )}
        </div>
      </div>
      {r.differentials.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-[var(--muted)] font-semibold">
            Recent differentials
          </span>
          {r.differentials.slice(0, 10).map((d, i) => (
            <span
              key={i}
              className="rounded-md border border-[var(--border)] bg-[var(--subtle)] px-1.5 py-0.5 text-xs tabular-nums"
            >
              {d.toFixed(1)}
            </span>
          ))}
        </div>
      )}
      <p className="mt-2 text-[10px] text-[var(--muted)]">
        WHS-style estimate — best {r.used || "—"} of your last {Math.min(20, r.differentials.length)}{" "}
        differentials{r.adjustment ? ` (${r.adjustment} adjustment)` : ""}. Not an official index.
      </p>
    </Card>
  );
}
