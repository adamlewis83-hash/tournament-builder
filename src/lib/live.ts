import { HoleEntry, Tournament } from "./types";
import { propagateBracket } from "./bracket";
import { matchOutcome } from "./ryderGolf";

// A patch is a minimal, mergeable mutation applied server-side to the stored tournament.
export type LivePatch =
  // `final` rides along so point-by-point scoring syncs its in-progress state to
  // spectators. Omitted keeps the legacy "both scores = result in" meaning.
  | { kind: "matchScore"; matchId: string; a: number | null; b: number | null; final?: boolean }
  | { kind: "golfScore"; participantId: string; hole: number; strokes: number | null }
  // One hole's three-tap stat entry (putts / tee result / bunker). Carries the
  // full merged entry so applying it is idempotent.
  | { kind: "golfStat"; participantId: string; hole: number; entry: HoleEntry }
  // One hole of one cup match. `key` is a participant id, or "A"/"B" for the shared
  // ball of an alternate-shot or scramble session.
  | {
      kind: "ryderScore";
      matchId: string;
      key: string;
      hole: number;
      strokes: number | null;
    }
  // Settings only: everything about the tournament EXCEPT the matches and the
  // scorecards. A host changing the scoring, the scorekeepers or a session's course
  // mid-round used to send a full "replace" — their copy, seconds stale, overwriting
  // whatever a teammate had just entered on another phone.
  | { kind: "settings"; data: Tournament }
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

  if (patch.kind === "settings") {
    // Keep the server's play — matches and every scorecard — and take the rest.
    const play = {
      matches: next.matches,
      golfScores: next.golf?.scores,
      ryderScores: next.ryderGolf?.scores,
      challengeScores: next.scoreChallenge?.scores,
    };
    const merged: Tournament = { ...structuredClone(patch.data), matches: play.matches };
    if (merged.golf && play.golfScores) merged.golf.scores = play.golfScores;
    if (merged.ryderGolf && play.ryderScores) merged.ryderGolf.scores = play.ryderScores;
    if (merged.scoreChallenge && play.challengeScores)
      merged.scoreChallenge.scores = play.challengeScores;
    return merged;
  }

  if (patch.kind === "matchScore") {
    const m = next.matches.find((x) => x.id === patch.matchId);
    if (m) {
      m.scoreA = patch.a;
      m.scoreB = patch.b;
      if (patch.final === undefined) delete m.final;
      else m.final = patch.final;
      // re-derive bracket advancement (no-op for non-bracket matches)
      next.matches = propagateBracket(next.matches);
    }
    return next;
  }

  if (patch.kind === "ryderScore" && next.ryderGolf) {
    // Merge one hole into the stored card rather than replacing the tournament, so
    // two phones scoring different matches at the same time both survive. This is why
    // the kind exists: cup scoring used to push a whole-tournament "replace", and
    // whichever phone saved last wiped the other's card.
    const g = next.ryderGolf;
    const card = { ...(g.scores[patch.matchId] ?? {}) };
    const arr = [...(card[patch.key] ?? Array(g.holes).fill(null))];
    arr[patch.hole] = patch.strokes;
    card[patch.key] = arr;
    g.scores[patch.matchId] = card;
    // Re-derive the match result from the merged card, the same way the device does.
    const m = next.matches.find((x) => x.id === patch.matchId);
    if (m) {
      const o = matchOutcome(next, m);
      m.scoreA = o.decided ? o.a : null;
      m.scoreB = o.decided ? o.b : null;
    }
    return next;
  }

  if (patch.kind === "golfScore" && next.golf) {
    const card = next.golf.scores[patch.participantId] ?? Array(next.golf.holes).fill(null);
    card[patch.hole] = patch.strokes;
    next.golf.scores[patch.participantId] = card;
    return next;
  }

  if (patch.kind === "golfStat" && next.golf) {
    const stats = next.golf.stats ?? (next.golf.stats = {});
    const card = stats[patch.participantId] ?? Array(next.golf.holes).fill(null);
    card[patch.hole] = { ...(card[patch.hole] ?? {}), ...patch.entry };
    stats[patch.participantId] = card;
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
