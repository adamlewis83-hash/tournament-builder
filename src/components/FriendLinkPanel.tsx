"use client";

import { useEffect, useState } from "react";
import {
  fetchFriendCode,
  fetchLinks,
  fetchSharePref,
  linkFriend,
  setSharePref,
  unlinkFriend,
  type LinkedFriend,
} from "@/lib/feed";
import { getLibraryKey } from "@/lib/library";
import { getProfile } from "@/lib/profile";
import { ago } from "@/lib/format";
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
  const [links, setLinks] = useState<LinkedFriend[] | null>(null);

  useEffect(() => {
    const key = getLibraryKey();
    setOwner(key);
    fetchSharePref(key).then(setShare);
    fetchFriendCode(key, getProfile().name.trim()).then((r) => setCode(r?.code ?? null));
    fetchLinks(key).then(setLinks);
  }, []);

  const inviteUrl = code ? `https://sporos.app/f/${code}` : null;

  async function invite() {
    if (!inviteUrl) return;
    const name = getProfile().name.trim() || "Your friend";
    // The code travels with the link on purpose: a texted link can land in a
    // browser rather than the app, and the code is what lets them finish the
    // link on the account they actually play on.
    const text =
      `${name} wants to link up on Sporos — tap to add them: ${inviteUrl}\n\n` +
      `Already have the app? Open it and enter code ${code} in Settings → Linked friends.`;
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
    if (r.ok) {
      setEntry("");
      fetchLinks(owner).then(setLinks);
    }
  }

  async function drop(f: LinkedFriend) {
    setLinks((list) => (list ?? []).filter((x) => x.key !== f.key));
    await unlinkFriend(owner, f.key);
    fetchLinks(owner).then(setLinks);
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

      {/* Who you are actually linked to. A link only ever showed up as activity
          on Home, so an invite accepted in the wrong place (a texted link
          opening a browser instead of the app) looked like nothing happened.
          This is the list, and the way out of a bad one. */}
      {links != null && (
        <div className="border-t border-[var(--border)] pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Linked accounts ({links.length})
          </p>
          {links.length === 0 ? (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Nobody yet. Send the invite above, or enter their code — whoever accepts has to do it
              inside the Sporos app, or the link lands on the browser they opened instead.
            </p>
          ) : (
            <ul className="mt-1.5 space-y-1.5">
              {links.map((f) => (
                <li
                  key={f.key}
                  className="flex items-center justify-between gap-3 rounded-lg bg-[var(--subtle)] px-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {f.name ?? "Unnamed account"}
                    </span>
                    <span className="block text-[11px] text-[var(--muted)]">
                      {f.lastActive == null
                        ? "no rounds yet — nothing of theirs can show on your Home"
                        : `last round ${ago(f.lastActive)}`}
                      {f.sharing ? "" : " · sharing off"}
                    </span>
                  </span>
                  <Button
                    variant="danger"
                    className="shrink-0 px-2 py-1 text-xs"
                    onClick={() => drop(f)}
                  >
                    Unlink
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

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
