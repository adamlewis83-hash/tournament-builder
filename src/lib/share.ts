import { Tournament } from "./types";

// URL-safe base64 of the tournament JSON, for shareable links (local-first, no server).
export function encodeTournament(t: Tournament): string {
  const json = JSON.stringify(t);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeTournament(code: string): Tournament | null {
  try {
    const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(atob(b64)));
    const t = JSON.parse(json) as Tournament;
    if (!t || !Array.isArray(t.participants) || !Array.isArray(t.matches)) return null;
    return t;
  } catch {
    return null;
  }
}
