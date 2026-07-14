"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { fetchLibrary, setLibraryKey } from "@/lib/library";
import { EmailBackup, RECOVERY_EMAIL_KEY } from "./EmailBackup";
import { Mail } from "@/components/icons";
import { Button, Card } from "./ui";

// Gentle reminder to set up email backup, shown until the user has linked an email.
export function RecoveryNudge() {
  const tournaments = useStore((s) => s.tournaments);
  const mergeCloud = useStore((s) => s.mergeCloud);
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const backedUp = !!localStorage.getItem(RECOVERY_EMAIL_KEY);
    const dismissed = !!sessionStorage.getItem("sporos-recovery-dismissed");
    setShow(tournaments.length > 0 && !backedUp && !dismissed);
  }, [tournaments.length]);

  if (!show) return null;

  async function recoverKey(k: string) {
    setLibraryKey(k);
    mergeCloud((await fetchLibrary(k)).tournaments);
    window.location.reload();
  }

  return (
    <Card className="mb-6 border-[var(--brand)]/30 bg-[var(--brand-soft)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand)]" />
          <div>
            <p className="text-sm font-semibold">Don&apos;t lose your tournaments</p>
            <p className="text-sm text-[var(--muted)]">
              Add your email so you can restore everything on a new phone or after reinstalling — no
              account, just a one-time code.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!open && (
            <Button className="px-3 py-1.5" onClick={() => setOpen(true)}>
              Back up
            </Button>
          )}
          <button
            onClick={() => {
              sessionStorage.setItem("sporos-recovery-dismissed", "1");
              setShow(false);
            }}
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Dismiss
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-3">
          <EmailBackup onRecovered={recoverKey} onBackedUp={() => setShow(false)} compact />
        </div>
      )}
    </Card>
  );
}
