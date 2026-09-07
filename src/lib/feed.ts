// Linked friends + activity feed (P6). Two accounts link by friend code —
// possession is consent, the app's join-code trust model — and then see each
// other's recent tournament activity. Sharing is default-on with the opt-out
// in Settings (Adam's call).

export interface FeedItem {
  friendKey: string;
  friendName: string;
  tournamentName: string;
  sport: string;
  updatedAt: number;
  status: "live" | "in-play" | "final";
  liveCode?: string;
  golf?: { thru: number; toPar: number };
}

export async function fetchFriendCode(
  owner: string,
  name: string,
): Promise<{ code: string; name: string } | null> {
  try {
    const res = await fetch(
      `/api/feed/code?owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(name)}`,
    );
    if (!res.ok) return null;
    return (await res.json()) as { code: string; name: string };
  } catch {
    return null;
  }
}

export async function lookupFriendCode(code: string): Promise<{ name: string } | null> {
  try {
    const res = await fetch(`/api/feed/link?code=${encodeURIComponent(code)}`);
    if (!res.ok) return null;
    return (await res.json()) as { name: string };
  } catch {
    return null;
  }
}

export async function linkFriend(
  owner: string,
  code: string,
  name: string,
): Promise<{ ok: true; friendName: string } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/feed/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, code, name }),
    });
    const data = (await res.json()) as { ok?: boolean; friend?: { name: string }; error?: string };
    if (res.ok && data.ok) return { ok: true, friendName: data.friend?.name ?? "your friend" };
    return { ok: false, error: data.error ?? "couldn't link" };
  } catch {
    return { ok: false, error: "offline — try again" };
  }
}

/** One account this device is linked to, whether or not it has posted anything. */
export interface LinkedFriend {
  key: string; // their library key
  name: string | null; // null until they've opened Sporos with a profile name
  sharing: boolean; // false = they turned activity sharing off
  lastActive: number | null; // newest tournament they've synced, if any
}

export async function fetchLinks(owner: string): Promise<LinkedFriend[]> {
  try {
    const res = await fetch(`/api/feed/links?owner=${encodeURIComponent(owner)}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return ((await res.json()) as { friends?: LinkedFriend[] }).friends ?? [];
  } catch {
    return [];
  }
}

/** Drop a link, both ways. */
export async function unlinkFriend(owner: string, friendKey: string): Promise<boolean> {
  try {
    const res = await fetch("/api/feed/link", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, friendKey }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchFeed(owner: string): Promise<FeedItem[]> {
  try {
    const res = await fetch(`/api/feed?owner=${encodeURIComponent(owner)}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: FeedItem[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

export async function fetchSharePref(owner: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/feed/prefs?owner=${encodeURIComponent(owner)}`);
    if (!res.ok) return true;
    return ((await res.json()) as { shareActivity?: boolean }).shareActivity ?? true;
  } catch {
    return true;
  }
}

export async function setSharePref(owner: string, shareActivity: boolean): Promise<void> {
  try {
    await fetch("/api/feed/prefs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, shareActivity }),
    });
  } catch {
    /* retried on next toggle */
  }
}
