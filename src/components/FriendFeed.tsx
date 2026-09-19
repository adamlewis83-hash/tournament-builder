"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchFeed, type FeedItem } from "@/lib/feed";
import { getLibraryKey } from "@/lib/library";
import { colorForName, sportAccent } from "@/lib/colors";
import { formatToPar } from "@/lib/golf";
import { Avatar } from "./Avatar";
import { SportIcon } from "./SportIcon";
import { Card } from "./ui";

// "Friends are playing" — the P6 activity feed on Home. Shows what linked
// friends are up to: live rounds first (with a Watch link into the live
// session), then recent results. Renders nothing until there's something
// to show, so an unlinked account never sees an empty box.
// Per-item hides live on this device: hiding a friend's Tuesday round isn't a
// statement about the friendship, so it touches nothing shared.
const HIDDEN_KEY = "sporos-feed-hidden";
const itemKey = (it: FeedItem) => it.tournamentId ?? `${it.friendKey}:${it.tournamentName}`;
const readHidden = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

export function FriendFeed() {
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    setHidden(readHidden());
    fetchFeed(getLibraryKey()).then((list) => {
      if (alive) setItems(list);
    });
    return () => {
      alive = false;
    };
  }, []);
  const hide = (it: FeedItem) => {
    const next = [...new Set([itemKey(it), ...hidden])].slice(0, 200);
    setHidden(next);
    try {
      localStorage.setItem(HIDDEN_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  const shown = (items ?? []).filter((it) => !hidden.includes(itemKey(it)));
  if (!items || shown.length === 0) return null;

  const ago = (at: number) => {
    const mins = Math.max(1, Math.round((Date.now() - at) / 60000));
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  };

  return (
    <Card className="p-4">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold">
        👥 Friends are playing
      </h2>
      <ul className="divide-y divide-[var(--border)]">
        {shown.map((it, i) => (
          <li key={i} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
            <Avatar name={it.friendName} color={colorForName(it.friendName)} className="h-7 w-7 text-[10px]" />
            <span
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{ background: `color-mix(in srgb, ${sportAccent(it.sport)} 14%, transparent)`, color: sportAccent(it.sport) }}
            >
              <SportIcon sport={it.sport} className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">
                <span className="font-medium">{it.friendName}</span>{" "}
                <span className="text-[var(--muted)]">
                  {it.status === "final" ? "finished" : "is playing"}
                </span>{" "}
                <span className="font-medium">{it.tournamentName}</span>
              </span>
              <span className="block text-[10px] text-[var(--muted)] tabular-nums">
                {it.golf ? `${formatToPar(it.golf.toPar)} thru ${it.golf.thru} · ` : ""}
                {ago(it.updatedAt)}
              </span>
            </span>
            {it.status === "live" && it.liveCode ? (
              // Watch means WATCH: the live board, not the registration form.
              <Link
                href={`/live/${it.liveCode}`}
                className="shrink-0 rounded-full bg-[var(--brand)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--on-brand)] hover:opacity-90"
              >
                ● Watch
              </Link>
            ) : it.status === "final" ? (
              <span className="shrink-0 rounded-full border border-[var(--border)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--muted)]">
                Final
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => hide(it)}
              aria-label={`Hide ${it.tournamentName} from your feed`}
              title="Hide this one — your friend stays linked"
              className="shrink-0 px-1 text-sm leading-none text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
