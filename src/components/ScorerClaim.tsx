"use client";

import { useState } from "react";
import Link from "next/link";
import { Tournament } from "@/lib/types";
import { canEditScores } from "@/lib/perms";
import { getProfile, setProfile } from "@/lib/profile";
import { Button } from "./ui";

/**
 * Scorekeeping is granted by name, and the name it is checked against is the
 * one on *this* device's profile — not the name on the matchup. So a spectator
 * the host meant to grant sits there read-only, with nothing on screen saying
 * why, whenever their profile name is blank (the common case — most people just
 * open the link) or spelled differently than the host typed it.
 *
 * This closes that loop from the side that can actually fix it: show the granted
 * names to the spectator and let them claim theirs in one tap.
 */
export function ScorerClaim({ t }: { t: Tournament }) {
  const [open, setOpen] = useState(false);
  const scorers = t.scorers ?? [];

  // Only for a spectator the host has left out of a scorekeeping list that exists.
  if (!t.spectator || !scorers.length || canEditScores(t)) return null;

  const me = getProfile().name.trim();

  function claim(name: string) {
    setProfile({ ...getProfile(), name });
    // Profile identity is read straight from localStorage all over the app, so a
    // reload is what actually unlocks every scorecard on the page at once.
    window.location.reload();
  }

  return (
    <div className="no-print rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          <span className="font-semibold">Meant to be keeping score?</span>{" "}
          <span className="text-[var(--muted)]">
            {me
              ? `This phone is set up as "${me}", which isn't on the host's list.`
              : "This phone doesn't have a name set yet, so the host can't recognize it."}
          </span>
        </span>
        <Button variant="outline" className="px-3 py-1.5" onClick={() => setOpen((v) => !v)}>
          {open ? "Close" : "That's me →"}
        </Button>
      </div>

      {open && (
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          <p className="text-xs text-[var(--muted)] mb-2">
            The host gave scorekeeping to the {scorers.length === 1 ? "name" : "names"} below. Tap
            yours to claim it on this device and start entering scores.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {scorers.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => claim(name)}
                className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium transition hover:bg-[var(--hover)] hover:border-[var(--brand)]"
              >
                I&apos;m {name}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-[var(--muted)]">
            This sets your profile name on this phone — the same name used for your photo and
            handicap elsewhere. Change it any time in{" "}
            <Link href="/settings" className="text-[var(--brand)] hover:underline">
              Settings
            </Link>
            . Not on the list? Ask the host to add the name you go by.
          </p>
        </div>
      )}
    </div>
  );
}
