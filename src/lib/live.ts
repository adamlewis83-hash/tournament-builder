import { Tournament } from "./types";
import { propagateBracket } from "./bracket";

// A patch is a minimal, mergeable mutation applied server-side to the stored tournament.
export type LivePatch =
  | { kind: "matchScore"; matchId: string; a: number | null; b: number | null }
  | { kind: "golfScore"; participantId: string; hole: number; strokes: number | null }
  | { kind: "replace"; data: Tournament };

export interface LiveState {
  data: Tournament;
  version: number;
}

/** Apply a patch to tournament data (pure). Used server-side so concurrent
 *  edits to different fields merge instead of clobbering each other. */
export function applyPatch(data: Tournament, patch: LivePatch): Tournament {
  if (patch.kind === "replace") return patch.data;

  const next: Tournament = structuredClone(data);

  if (patch.kind === "matchScore") {
    const m = next.matches.find((x) => x.id === patch.matchId);
    if (m) {
      m.scoreA = patch.a;
      m.scoreB = patch.b;
      // re-derive bracket advancement (no-op for non-bracket matches)
      next.matches = propagateBracket(next.matches);
    }
    return next;
  }

  if (patch.kind === "golfScore" && next.golf) {
    const card = next.golf.scores[patch.participantId] ?? Array(next.golf.holes).fill(null);
    card[patch.hole] = patch.strokes;
    next.golf.scores[patch.participantId] = card;
    return next;
  }

  return next;
}

// ---- Client fetch helpers ----

export async function publishLive(data: Tournament): Promise<LiveState & { code: string }> {
  const res = await fetch("/api/live", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error("publish failed");
  return res.json();
}

export async function fetchLive(code: string): Promise<LiveState | null> {
  const res = await fetch(`/api/live/${code}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function sendPatch(code: string, patch: LivePatch): Promise<LiveState | null> {
  const res = await fetch(`/api/live/${code}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) return null;
  return res.json();
}

// ---- Live comments (cheer feed) ----

export interface LiveComment {
  id: string;
  code: string;
  author: string;
  text: string;
  targetType?: string | null;
  targetLabel?: string | null;
  createdAt: string;
}

export interface NewComment {
  author: string;
  text: string;
  targetType?: string | null;
  targetLabel?: string | null;
}

export async function fetchComments(code: string, since?: string): Promise<LiveComment[]> {
  const url = `/api/live/${code}/comments${since ? `?since=${encodeURIComponent(since)}` : ""}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const j = await res.json();
  return (j.comments ?? []) as LiveComment[];
}

export async function postComment(code: string, input: NewComment): Promise<LiveComment | null> {
  const res = await fetch(`/api/live/${code}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) return null;
  const j = await res.json();
  return (j.comment ?? null) as LiveComment | null;
}

// ---- Self-registration lobby ----

export interface LiveRegistration {
  id: string;
  code: string;
  name: string;
  handicap: number | null;
  photo: string | null;
  createdAt: string;
}

export async function fetchRegistrations(code: string): Promise<LiveRegistration[]> {
  const res = await fetch(`/api/live/${code}/register`, { cache: "no-store" });
  if (!res.ok) return [];
  const j = await res.json();
  return (j.registrations ?? []) as LiveRegistration[];
}

export async function registerPlayer(
  code: string,
  input: { name: string; handicap?: number | null; photo?: string | null },
): Promise<LiveRegistration | null> {
  const res = await fetch(`/api/live/${code}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) return null;
  const j = await res.json();
  return (j.registration ?? null) as LiveRegistration | null;
}

export async function removeRegistration(code: string, id: string): Promise<boolean> {
  const res = await fetch(`/api/live/${code}/register`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  return res.ok;
}
