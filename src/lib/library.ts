import { Course, Friend, Tournament } from "./types";

const KEY = "seeded-library-key";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomKey(len = 14): string {
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

/** The anonymous library key for this device (stable, stored locally). */
export function getLibraryKey(): string {
  if (typeof window === "undefined") return "";
  let k = localStorage.getItem(KEY);
  if (!k) {
    k = randomKey();
    localStorage.setItem(KEY, k);
  }
  return k;
}

/** The stored library key, or null if this browser has never used Sporos.
 *  Unlike getLibraryKey it does NOT mint one — asking the question must not
 *  create an empty account (an invite link opened in a stray browser used to
 *  do exactly that, and linked the friend to nothing). */
export function peekLibraryKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

/** Is Sporos actually LIVED IN here — a saved tournament or a profile name —
 *  as opposed to merely opened once? A bare key proves nothing: the app mints
 *  one the moment any page loads, this one included. Used by the invite
 *  landing, where linking an empty library is worse than not linking at all. */
export function hasSporosData(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if ((JSON.parse(localStorage.getItem("sporos-profile") || "{}").name ?? "").trim()) return true;
  } catch {
    /* unreadable profile — fall through to the library */
  }
  try {
    const raw = localStorage.getItem("tournament-builder-v1");
    if (!raw) return false;
    const state = JSON.parse(raw)?.state;
    return (state?.tournaments?.length ?? 0) > 0 || (state?.friends?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

export function setLibraryKey(k: string) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, k.trim().toUpperCase());
}

const ACCOUNT_EMAIL_KEY = "sporos-recovery-email";

/** The email this device is signed in as, if any. */
export function getAccountEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCOUNT_EMAIL_KEY);
}

/** Sign out: forget the email and detach to a fresh anonymous library.
 *  Synced data stays on the server — sign back in with the same email to pull it. */
export function signOut() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCOUNT_EMAIL_KEY);
  localStorage.setItem(KEY, randomKey());
}

/** Delete the account: erase the email link and every cloud backup from the
 *  server, then detach this device to a fresh anonymous library. Tournaments
 *  already on this device stay on this device. */
export async function deleteAccount(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner: getLibraryKey() }),
    });
    if (!res.ok) return false;
  } catch {
    return false;
  }
  localStorage.removeItem(ACCOUNT_EMAIL_KEY);
  localStorage.setItem(KEY, randomKey());
  return true;
}

/** Cloud library: live tournaments plus the ids this owner has deleted (tombstones). */
export async function fetchLibrary(
  owner: string,
): Promise<{ tournaments: Tournament[]; deletedIds: string[] }> {
  try {
    const res = await fetch(`/api/library?owner=${encodeURIComponent(owner)}`, { cache: "no-store" });
    if (!res.ok) return { tournaments: [], deletedIds: [] };
    const json = await res.json();
    return {
      tournaments: (json.tournaments ?? []) as Tournament[],
      deletedIds: (json.deletedIds ?? []) as string[],
    };
  } catch {
    return { tournaments: [], deletedIds: [] };
  }
}

export interface FriendTombstone {
  name: string; // normalized (lowercased) friend name
  at: number;
}

export async function fetchFriends(
  owner: string,
): Promise<{ friends: Friend[]; tombstones: FriendTombstone[] }> {
  try {
    const res = await fetch(`/api/friends?owner=${encodeURIComponent(owner)}`, { cache: "no-store" });
    if (!res.ok) return { friends: [], tombstones: [] };
    const json = await res.json();
    return {
      friends: (json.friends ?? []) as Friend[],
      tombstones: (json.tombstones ?? []) as FriendTombstone[],
    };
  } catch {
    return { friends: [], tombstones: [] };
  }
}

export async function putFriends(
  owner: string,
  friends: Friend[],
  tombstones: FriendTombstone[] = [],
): Promise<void> {
  try {
    // keepalive so the backup completes even if the page reloads right after
    // (e.g. editing a friend then signing out).
    await fetch("/api/friends", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, friends, tombstones }),
      keepalive: true,
    });
  } catch {
    /* offline — local stays source of truth, will resync later */
  }
}

export async function fetchCourses(owner: string): Promise<Course[]> {
  try {
    const res = await fetch(`/api/saved-courses?owner=${encodeURIComponent(owner)}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.courses ?? []) as Course[];
  } catch {
    return [];
  }
}

/** Everything about the PERSON, as one synced blob — see OwnedProfile. */
export interface ProfileBlob {
  profile: unknown; // Profile — typed loosely to keep library.ts dependency-light
  pastRounds: unknown[];
  aliases: Record<string, string>;
  savedAt: number; // when a device last changed any of it (drives last-write-wins)
}

export async function fetchProfileBlob(owner: string): Promise<ProfileBlob | null> {
  try {
    const res = await fetch(`/api/profile?owner=${encodeURIComponent(owner)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? null) as ProfileBlob | null;
  } catch {
    return null;
  }
}

export async function putProfileBlob(owner: string, data: ProfileBlob): Promise<void> {
  try {
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, data }),
      keepalive: true,
    });
  } catch {
    /* offline — local stays source of truth, will resync later */
  }
}

export async function putCourses(owner: string, courses: Course[]): Promise<void> {
  try {
    await fetch("/api/saved-courses", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, courses }),
      keepalive: true,
    });
  } catch {
    /* offline — local stays source of truth, will resync later */
  }
}

export async function putTournament(owner: string, tournament: Tournament): Promise<void> {
  try {
    await fetch("/api/library", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, tournament }),
    });
  } catch {
    /* offline — local stays source of truth, will resync later */
  }
}

/** Email a one-time code. notConfigured=true if email backup isn't set up. */
export async function sendRecoveryCode(
  email: string,
): Promise<{ ok: boolean; notConfigured?: boolean }> {
  try {
    const res = await fetch("/api/recovery/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.status === 503) return { ok: false, notConfigured: true };
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

/** Verify a code. Links this device's key (first time) or returns the recovered key. */
export async function verifyRecoveryCode(
  email: string,
  code: string,
  libraryKey: string,
): Promise<{ libraryKey: string; recovered: boolean } | null> {
  try {
    const res = await fetch("/api/recovery/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, libraryKey }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function deleteTournamentRemote(owner: string, id: string): Promise<void> {
  try {
    // keepalive so the request still completes if the page reloads/navigates
    // right after (e.g. deleting then immediately signing out).
    await fetch(`/api/library/${id}?owner=${encodeURIComponent(owner)}`, {
      method: "DELETE",
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}
