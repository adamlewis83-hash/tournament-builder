"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { linkFriend, lookupFriendCode } from "@/lib/feed";
import { getLibraryKey } from "@/lib/library";
import { getProfile } from "@/lib/profile";
import { Button, Card } from "@/components/ui";
import { Sprout } from "@/components/icons";

const APP_STORE_URL = "https://apps.apple.com/us/app/sporos-tournament-builder/id6787539978";

// The friend-invite landing — where a texted invite link arrives. One tap
// links the two accounts; no Sporos yet, the App Store badge is right there.
// (Until the 2.0 binary ships universal links, an installed app doesn't
// auto-open from SMS — the page works in any browser instead.)
export default function FriendInvitePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = (params.code ?? "").toUpperCase();
  const [inviter, setInviter] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    lookupFriendCode(code).then((r) => setInviter(r ? r.name : ""));
  }, [code]);

  async function accept() {
    setState("busy");
    const r = await linkFriend(getLibraryKey(), code, getProfile().name.trim());
    if (r.ok) {
      setState("done");
      setMsg(`You and ${r.friendName} are linked — their rounds now show on your Home.`);
      setTimeout(() => router.push("/"), 1800);
    } else {
      setState("error");
      setMsg(r.error);
    }
  }

  return (
    <div className="mx-auto max-w-md pt-10">
      <Card className="p-6 text-center space-y-4">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-strong)] text-[var(--on-brand)]">
          <Sprout className="h-8 w-8" />
        </span>
        {inviter === null ? (
          <p className="text-sm text-[var(--muted)]">Looking up this invite…</p>
        ) : inviter === "" ? (
          <>
            <h1 className="text-xl font-bold">This invite link isn&apos;t valid</h1>
            <p className="text-sm text-[var(--muted)]">
              Ask your friend to send a fresh one from Settings → Linked friends.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold">{inviter} wants to link up on Sporos</h1>
            <p className="text-sm text-[var(--muted)]">
              Linked friends see each other&apos;s rounds and results — live golf included.
            </p>
            {state === "done" ? (
              <p className="text-sm font-medium text-[var(--brand)]">✓ {msg}</p>
            ) : (
              <>
                <Button onClick={accept} disabled={state === "busy"} className="w-full py-3">
                  {state === "busy" ? "Linking…" : `Link with ${inviter} →`}
                </Button>
                {state === "error" && <p className="text-xs text-rose-400">{msg}</p>}
                <p className="text-xs text-[var(--muted)]">
                  Have the Sporos app? Open it and enter code{" "}
                  <span className="font-mono font-semibold tracking-widest">{code}</span> in
                  Settings → Linked friends, so the link lands on your app account.
                </p>
                <a
                  href={APP_STORE_URL}
                  className="block text-xs font-medium text-[var(--brand)] hover:underline"
                >
                  New here? Get Sporos on the App Store →
                </a>
              </>
            )}
          </>
        )}
        <Link href="/" className="block text-xs text-[var(--muted)] hover:underline">
          ← Sporos home
        </Link>
      </Card>
    </div>
  );
}
