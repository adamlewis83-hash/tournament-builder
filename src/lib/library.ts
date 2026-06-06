import { Tournament } from "./types";

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

export async function fetchLibrary(owner: string): Promise<Tournament[]> {
  try {
    const res = await fetch(`/api/library?owner=${encodeURIComponent(owner)}`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.tournaments ?? []) as Tournament[];
  } catch {
    return [];
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
    await fetch(`/api/library/${id}?owner=${encodeURIComponent(owner)}`, { method: "DELETE" });
  } catch {
    /* ignore */
  }
}
