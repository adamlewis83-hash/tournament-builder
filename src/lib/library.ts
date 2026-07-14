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

export async function fetchFriends(owner: string): Promise<Friend[]> {
  try {
    const res = await fetch(`/api/friends?owner=${encodeURIComponent(owner)}`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.friends ?? []) as Friend[];
  } catch {
    return [];
  }
}

export async function putFriends(owner: string, friends: Friend[]): Promise<void> {
  try {
    // keepalive so the backup completes even if the page reloads right after
    // (e.g. editing a friend then signing out).
    await fetch("/api/friends", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, friends }),
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
