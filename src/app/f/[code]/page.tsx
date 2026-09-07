"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { linkFriend, lookupFriendCode } from "@/lib/feed";
import { getLibraryKey, hasSporosData } from "@/lib/library";
import { getProfile } from "@/lib/profile";
import { Button, Card } from "@/components/ui";
import { Sprout } from "@/components/icons";

const APP_STORE_URL = "https://apps.apple.com/us/app/sporos-tournament-builder/id6787539978";

// The friend-invite landing — where a texted invite link arrives. One tap
// links the two accounts; no Sporos yet, the App Store badge is right there.
//
// The link is between two LIBRARIES, and a library lives in whichever browser
// or app opened this page. A texted link that opens Safari instead of the app
// therefore linked the inviter to an empty Safari library: the friend, still
// standing in Safari, saw the inviter's rounds and assumed it worked, while the
// inviter saw nothing and the friend's app was never linked at all. So a
// context with no Sporos library leads with the code to type into the app, and
// links itself only if the person insists.
export default function FriendInvitePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = (params.code ?? "").toUpperCase();
  const [inviter, setInviter] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // "web" = the person tapped "stay on the web" — don't bounce them again.
  const [stay, setStay] = useState(false);
  // Does Sporos actually live here? A stored key proves nothing — every page
  // load mints one, this page included — so the test is whether there is a
  // profile or a library to link. Read through useSyncExternalStore: the server
  // can't know, and the answer must not flip a rendered page underneath anyone.
  const hasLibrary = useSyncExternalStore(
    () => () => {},
    () => hasSporosData(),
    () => null,
  );

  useEffect(() => {
    lookupFriendCode(code).then((r) => setInviter(r ? r.name : ""));
  }, [code]);

  // An iPhone with no Sporos lived-in here means the app isn't installed (a
  // phone WITH it opens this link in the app once iOS refreshes its link
  // registry, and the app context has a library). Adam's ask: the invite should
  // take that person to the App Store, not park them on a web page. A short
  // pause shows the code first — the App Store can't carry it through the
  // install, so the code (also in the invite text) is what finishes the link.
  const isIphone =
    typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);
  const bouncing = isIphone && hasLibrary === false && !!inviter && !stay && state === "idle";
  useEffect(() => {
    if (!bouncing) return;
    const timer = setTimeout(() => {
      window.location.href = APP_STORE_URL;
    }, 3500);
    return () => clearTimeout(timer);
  }, [bouncing]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* long-press to copy it from the page instead */
    }
  }

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
            ) : bouncing ? (
              <>
                {/* iPhone, no app: heading to the App Store. The code flashes
                    first because the store can't carry it through the install. */}
                <p className="text-sm text-[var(--muted)]">
                  Taking you to the App Store… After installing, enter this code in Settings →
                  Linked friends (it&apos;s also in the text you got):
                </p>
                <button
                  type="button"
                  onClick={copyCode}
                  className="mx-auto block rounded-xl border border-[var(--border)] bg-[var(--subtle)] px-4 py-3 font-mono text-2xl font-bold tracking-[0.3em]"
                >
                  {code}
                </button>
                <p className="text-xs text-[var(--muted)]">
                  {copied ? "✓ Copied" : "Tap the code to copy it"}
                </p>
                <a href={APP_STORE_URL} className="block">
                  <Button className="w-full py-3">Open the App Store now →</Button>
                </a>
                <button
                  type="button"
                  onClick={() => setStay(true)}
                  className="text-xs text-[var(--muted)] underline"
                >
                  Stay on the web instead
                </button>
              </>
            ) : hasLibrary === false ? (
              <>
                {/* No Sporos here. Linking this browser would link an empty
                    library — the code is what carries the invite into the app. */}
                <p className="text-sm text-[var(--muted)]">
                  Open Sporos and enter this code in Settings → Linked friends:
                </p>
                <button
                  type="button"
                  onClick={copyCode}
                  className="mx-auto block rounded-xl border border-[var(--border)] bg-[var(--subtle)] px-4 py-3 font-mono text-2xl font-bold tracking-[0.3em]"
                >
                  {code}
                </button>
                <p className="text-xs text-[var(--muted)]">
                  {copied ? "✓ Copied" : "Tap the code to copy it"}
                </p>
                <a href={APP_STORE_URL} className="block">
                  <Button className="w-full py-3">Don&apos;t have Sporos? Get the app →</Button>
                </a>
                <button
                  type="button"
                  onClick={accept}
                  disabled={state === "busy"}
                  className="text-xs text-[var(--muted)] underline"
                >
                  {state === "busy" ? "Linking…" : "Or link this browser instead — I play on the web"}
                </button>
                {state === "error" && <p className="text-xs text-rose-400">{msg}</p>}
              </>
            ) : (
              <>
                <Button onClick={accept} disabled={state === "busy"} className="w-full py-3">
                  {state === "busy" ? "Linking…" : `Link with ${inviter} →`}
                </Button>
                {state === "error" && <p className="text-xs text-rose-400">{msg}</p>}
                <p className="text-xs text-[var(--muted)]">
                  This links the Sporos on <b>this</b> device. Playing on another one? Open Sporos
                  there and enter code{" "}
                  <span className="font-mono font-semibold tracking-widest">{code}</span> in
                  Settings → Linked friends instead.
                </p>
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
