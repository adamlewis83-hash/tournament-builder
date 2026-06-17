"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { fetchLibrary, getAccountEmail, setLibraryKey } from "@/lib/library";
import { Mail } from "@/components/icons";
import { Card } from "./ui";
import { EmailBackup } from "./EmailBackup";

// New-visitor prompt: create a free account so tournaments are saved + synced.
// Hides itself once the user is signed in (or signs in here).
export function SignInCTA() {
  const mergeCloud = useStore((s) => s.mergeCloud);
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setEmail(getAccountEmail());
  }, []);

  if (email) return null; // already signed in
  if (email === undefined) return null; // pre-hydration; avoid a flash

  async function recoverKey(k: string) {
    setLibraryKey(k);
    mergeCloud(await fetchLibrary(k));
    window.location.reload();
  }

  return (
    <Card className="p-5 mb-6 border border-[var(--brand)]/40 bg-[var(--brand-soft)]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-[var(--on-brand)]">
          <Mail className="h-5 w-5" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">Create your free Sporos account</h3>
          <p className="text-sm text-[var(--muted)] mb-3">
            Sign in with your email to save your tournaments and pick up on any device — no password,
            nothing to remember.
          </p>
          <EmailBackup onRecovered={recoverKey} onBackedUp={() => setEmail(getAccountEmail())} compact />
        </div>
      </div>
    </Card>
  );
}
