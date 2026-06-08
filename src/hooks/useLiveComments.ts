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
    setComments((prev) => {
      const next = [...prev];
      for (const c of incoming) {
        if (seen.current.has(c.id)) continue;
        seen.current.add(c.id);
        next.push(c);
        if (!sinceRef.current || c.createdAt > sinceRef.current) sinceRef.current = c.createdAt;
      }
      next.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return next;
    });
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
