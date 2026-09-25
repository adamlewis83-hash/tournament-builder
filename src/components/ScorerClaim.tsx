"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Tournament } from "@/lib/types";
import { canEditScores, claimableNames } from "@/lib/perms";
import { useStore } from "@/lib/store";
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
 *
 * The box sits at the top of the page, and the golf card is a long way below
 * it, so a refused tap down there also raises a note at the bottom of the
 * screen with the same one tap claim. A tap that does nothing is the one thing
 * a scorekeeper can't diagnose.
 */
export function ScorerClaim({ t }: { t: Tournament }) {
  const [open, setOpen] = useState(false);
  // The players (unless the host keeps score alone) and the named scorekeepers.
  const scorers = claimableNames(t);
  const blockedTry = useStore((s) => s.blockedTry);
  // A refusal from before this page opened is not news, and each one shows
  // for a few seconds or until dismissed.
  const [mountedAt] = useState(() => Date.now());
  const [hiddenAt, setHiddenAt] = useState<number | null>(null);
  const tryAt = blockedTry?.tournamentId === t.id ? blockedTry.at : null;
  useEffect(() => {
    if (tryAt == null) return;
    const timer = setTimeout(() => setHiddenAt(tryAt), 8000);
    return () => clearTimeout(timer);
  }, [tryAt]);
  const refused = tryAt != null && tryAt >= mountedAt && tryAt !== hiddenAt;

  if (!t.spectator || canEditScores(t)) return null;

  const me = getProfile().name.trim();

  function claim(name: string) {
    setProfile({ ...getProfile(), name });
    // Profile identity is read straight from localStorage all over the app, so a
    // reload is what actually unlocks every scorecard on the page at once.
    window.location.reload();
  }

  const note = refused && (
    <div
      role="status"
      className="no-print fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] inset-x-4 z-50 mx-auto max-w-md rounded-xl border border-amber-400/50 bg-[var(--surface)] px-4 py-3 text-sm shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <p>
          <span className="font-semibold">That score didn&apos;t save.</span>{" "}
          <span className="text-[var(--muted)]">
            {scorers.length
              ? me
                ? `This phone is set up as "${me}", which isn't a player or scorekeeper in this round.`
                : "This phone doesn't have a name set, so this round can't tell who you are."
              : "You're watching this round. Ask the host to add you under Scorekeepers in their Live panel."}
          </span>
        </p>
        <button
          type="button"
          onClick={() => setHiddenAt(tryAt)}
          aria-label="Dismiss"
          className="shrink-0 px-1 text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          ✕
        </button>
      </div>
      {scorers.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {scorers.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => claim(name)}
              className="rounded-full border border-[var(--brand)] bg-[var(--brand-soft)] px-3 py-1 text-xs font-medium text-[var(--brand)]"
            >
              I&apos;m {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // No list at all: nothing to claim, so only the refused tap note applies.
  if (!scorers.length) return note || null;

  return (
    <>
      {note}
      <div className="no-print rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 px-4 py-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            <span className="font-semibold">Meant to be keeping score?</span>{" "}
            <span className="text-[var(--muted)]">
              {me
                ? `This phone is set up as "${me}", which isn't a player or scorekeeper in this round.`
                : "This phone doesn't have a name set yet, so this round can't tell who you are."}
            </span>
          </span>
          <Button variant="outline" className="px-3 py-1.5" onClick={() => setOpen((v) => !v)}>
            {open ? "Close" : "That's me →"}
          </Button>
        </div>

        {open && (
          <div className="mt-3 border-t border-[var(--border)] pt-3">
            <p className="text-xs text-[var(--muted)] mb-2">
              {scorers.length === 1 ? "This name keeps" : "These names keep"} score in this round.
              Tap yours to claim it on this device and start entering scores.
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
    </>
  );
}
