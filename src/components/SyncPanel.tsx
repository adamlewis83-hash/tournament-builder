"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { deleteAccount, fetchLibrary, getAccountEmail, setLibraryKey, signOut } from "@/lib/library";
import { Cloud } from "@/components/icons";
import { Button, Card } from "./ui";
import { EmailBackup } from "./EmailBackup";

export function SyncPanel() {
  const mergeCloud = useStore((s) => s.mergeCloud);
  const [email, setEmail] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  useEffect(() => {
    setEmail(getAccountEmail());
  }, []);

  async function recoverKey(k: string) {
    setLibraryKey(k);
    const { tournaments: list } = await fetchLibrary(k);
    mergeCloud(list);
    window.location.reload();
  }

  function doSignOut() {
    if (
      !confirm(
        "Sign out? Your tournaments stay safe in your account — sign back in with your email anytime to get them on any device.",
      )
    )
      return;
    signOut();
    window.location.reload();
  }

  async function doDeleteAccount() {
    if (
      !confirm(
        "Delete your account? This permanently erases your email and every cloud backup (tournaments, friends, courses) from our servers. Tournaments saved on this device stay on this device. This can't be undone.",
      )
    )
      return;
    setDeleting(true);
    setDeleteError(false);
    const ok = await deleteAccount();
    if (!ok) {
      setDeleting(false);
      setDeleteError(true);
      return;
    }
    window.location.reload();
  }

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Cloud className="h-4 w-4 text-[var(--brand)]" />
        <h2 className="font-semibold">Account &amp; sync</h2>
      </div>

      {email ? (
        <div className="space-y-3">
          <p className="text-sm">
            Signed in as <span className="font-semibold">{email}</span>. Your tournaments back up
            automatically and sync to every device you sign in on.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={doSignOut}>
              Sign out
            </Button>
            <Button variant="danger" onClick={doDeleteAccount} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete account"}
            </Button>
          </div>
          {deleteError && (
            <p className="text-sm text-rose-500">
              Couldn&apos;t delete your account — check your connection and try again.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-[var(--muted)]">
            Your tournaments auto-save on this device. <b>Sign in with your email</b> to back them up
            and sync across devices — no password, nothing to remember.
          </p>
          <EmailBackup onRecovered={recoverKey} onBackedUp={() => setEmail(getAccountEmail())} />
        </div>
      )}
    </Card>
  );
}
