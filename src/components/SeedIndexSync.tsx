"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { getProfile, setProfile } from "@/lib/profile";
import { seedIndexForPlayer } from "@/lib/handicap";
import { applyAliases, canonicalName } from "@/lib/aliases";

// Keeps the profile handicap current with the Seed Index — finish a round,
// and the number that pre-fills your next event already knows about it. Mounted
// once in the layout so it runs no matter which screen the round ended on.
// Renders nothing; does nothing when auto-update is off in Settings.
export function SeedIndexSync() {
  const tournaments = useStore((s) => s.tournaments);

  useEffect(() => {
    const prof = getProfile();
    if (!prof.seedIndexAuto) return;
    const name = canonicalName(prof.name.trim());
    if (!name) return;
    const r = seedIndexForPlayer(applyAliases(tournaments), name);
    if (r.index == null) return;
    if (prof.golfHandicap != null && Math.abs(prof.golfHandicap - r.index) < 0.05) return;
    setProfile({ ...prof, golfHandicap: r.index });
  }, [tournaments]);

  return null;
}
