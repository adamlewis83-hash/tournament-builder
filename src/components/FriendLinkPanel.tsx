"use client";

import { useEffect, useState } from "react";
import {
  fetchFriendCode,
  fetchSharePref,
  linkFriend,
  setSharePref,
} from "@/lib/feed";
import { getLibraryKey } from "@/lib/library";
import { getProfile } from "@/lib/profile";
import { Button, Card } from "./ui";

// Settings → Linked friends & activity (P6): your shareable friend code (text
// it to a friend — the link opens Sporos or offers the download), a box to
// enter theirs, and the share-activity opt-out (default ON, Adam's call).
export function FriendLinkPanel() {
  const [owner, setOwner] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [share, setShare] = useState(true);
  const [entry, setEntry] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const key = getLibraryKey();
    setOwner(key);
    fetchSharePref(key).then(setShare);
    fetchFriendCode(key, getProfile().name.trim()).then((r) => setCode(r?.code ?? null));
  }, []);

  const inviteUrl = code ? `https://sporos.app/f/${code}` : null;

  async function invite() {
    if (!inviteUrl) return;
    const name = getProfile().name.trim() || "Your friend";
    const text = `${name} wants to link up on Sporos — tap to add them: ${inviteUrl}`;
    // The share sheet reaches Messages on iOS; clipboard is the desktop fallback.
    if (navigator.share) {
      try {
        await navigator.share({ text, url: inviteUrl });
        return;
      } catch {
        /* user closed the sheet */
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setMsg("Invite copied — paste it into a text.");
      } catch {
        setMsg(`Share this link: ${inviteUrl}`);
      }
    }
  }

  async function submitCode() {
    const c = entry.trim().toUpperCase();
    if (!c) return;
    setBusy(true);
    setMsg(null);
    const r = await linkFriend(owner, c, getProfile().name.trim());
    setBusy(false);
    setMsg(r.ok ? `✓ Linked with ${r.friendName} — their rounds now show on your Home.` : r.error);
    if (r.ok) setEntry("");
  }

  return (
    <Card className="p-5 mt-4 space-y-3">
      <div>
        <h2 className="font-semibold">Linked friends &amp; activity</h2>
        <p className="text-sm text-[var(--muted)]">
          Link accounts to see each other&apos;s rounds and results on Home.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-[var(--muted)]">Your friend code</span>
        <span className="rounded-lg border border-[var(--border)] bg-[var(--subtle)] px-2.5 py-1 font-mono text-sm font-semibold tracking-widest">
          {code ?? "…"}
        </span>
        <Button variant="outline" className="px-3 py-1.5 text-sm" onClick={invite} disabled={!code}>
          📱 Invite by text
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitCode()}
          placeholder="Enter a friend's code"
          className="w-48 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-mono uppercase tracking-widest"
        />
        <Button variant="outline" className="px-3 py-2 text-sm" onClick={submitCode} disabled={busy || !entry.trim()}>
          {busy ? "Linking…" : "Link"}
        </Button>
      </div>
      {msg && <p className="text-xs text-[var(--muted)]">{msg}</p>}

      <button
        type="button"
        onClick={() => {
          const next = !share;
          setShare(next);
          setSharePref(owner, next);
        }}
        className="flex w-full items-center justify-between gap-3 border-t border-[var(--border)] pt-3 text-left"
      >
        <span>
          <span className="block text-sm font-medium">Share my activity with linked friends</span>
          <span className="block text-xs text-[var(--muted)]">
            Off = your rounds and results never appear in anyone&apos;s feed.
          </span>
        </span>
        <span
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${
            share ? "bg-[var(--brand)]" : "bg-[var(--border)]"
          }`}
          aria-hidden
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              share ? "left-[22px]" : "left-0.5"
            }`}
          />
        </span>
      </button>
    </Card>
  );
}
