"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchComments, postComment, LiveComment, NewComment } from "@/lib/live";

// Polls a live session's cheer feed and exposes a post() that adds optimistically.
export function useLiveComments(code?: string) {
  const [comments, setComments] = useState<LiveComment[]>([]);
  const sinceRef = useRef<string | undefined>(undefined);
  const seen = useRef<Set<string>>(new Set());

  const merge = useCallback((incoming: LiveComment[]) => {
    if (!incoming.length) return;
    // De-dupe and advance refs OUTSIDE the state updater — the updater must stay
    // pure (StrictMode double-invokes it in dev, which would drop "already seen" items).
    const fresh = incoming.filter((c) => !seen.current.has(c.id));
    if (!fresh.length) return;
    for (const c of fresh) {
      seen.current.add(c.id);
      if (!sinceRef.current || c.createdAt > sinceRef.current) sinceRef.current = c.createdAt;
    }
    setComments((prev) =>
      [...prev, ...fresh].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    );
  }, []);

  useEffect(() => {
    if (!code) return;
    let active = true;
    const poll = async () => {
      const incoming = await fetchComments(code, sinceRef.current);
      if (active) merge(incoming);
    };
    poll();
    const iv = setInterval(poll, 3500);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, [code, merge]);

  const post = useCallback(
    async (input: NewComment) => {
      if (!code) return;
      const c = await postComment(code, input);
      if (c) merge([c]);
    },
    [code, merge],
  );

  return { comments, post };
}
