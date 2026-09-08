"use client";

import { useEffect, useReducer } from "react";
import { useStore } from "@/lib/store";
import { getProfile, PROFILE_EVENT, setProfile } from "@/lib/profile";
import { seedIndexForPlayer } from "@/lib/handicap";
import { indexInputsFor } from "@/lib/pastRounds";
import { applyAliases, canonicalName } from "@/lib/aliases";

// Keeps the profile handicap current with the Seed Index — finish a round,
// and the number that pre-fills your next event already knows about it. Mounted
// once in the layout so it runs no matter which screen the round ended on.
// Renders nothing; does nothing when auto-update is off in Settings.
export function SeedIndexSync() {
  const tournaments = useStore((s) => s.tournaments);
  // Re-run on profile saves too: bringing in a starting index or typing past
  // rounds changes the index without any tournament changing. The write below
  // fires this same event, but the closeness guard makes the second pass a
  // no-op instead of a loop.
  const [profileRev, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    window.addEventListener(PROFILE_EVENT, bump);
    return () => window.removeEventListener(PROFILE_EVENT, bump);
  }, []);

  useEffect(() => {
    const prof = getProfile();
    if (!prof.seedIndexAuto) return;
    const name = canonicalName(prof.name.trim());
    if (!name) return;
    // The same inputs the Seed Index card reads — the index they brought and
    // rounds from before Sporos — so the number written here is the number
    // shown there.
    const r = seedIndexForPlayer(applyAliases(tournaments), name, indexInputsFor(name));
    if (r.index == null) return;
    if (prof.golfHandicap != null && Math.abs(prof.golfHandicap - r.index) < 0.05) return;
    setProfile({ ...prof, golfHandicap: r.index });
  }, [tournaments, profileRev]);

  return null;
}
