"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { getLibraryKey, fetchLibrary, putTournament, deleteTournamentRemote } from "@/lib/library";

// Backs the whole tournament library up to the cloud under an anonymous device key,
// pulls it on load, and keeps it synced. Renders nothing.
export function CloudSync() {
  const hydrated = useStore((s) => s.hydrated);
  const mergeCloud = useStore((s) => s.mergeCloud);
  const started = useRef(false);
  const lastPushed = useRef<Map<string, number>>(new Map());
  const prevIds = useRef<Set<string>>(new Set());
  const owner = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial pull + push.
  useEffect(() => {
    if (!hydrated || started.current) return;
    started.current = true;
    owner.current = getLibraryKey();
    (async () => {
      const remote = await fetchLibrary(owner.current);
      if (remote.length) mergeCloud(remote);
      const all = useStore.getState().tournaments;
      for (const t of all) {
        lastPushed.current.set(t.id, t.updatedAt);
        putTournament(owner.current, t);
      }
      prevIds.current = new Set(all.map((t) => t.id));
    })();
  }, [hydrated, mergeCloud]);

  // Push diffs (debounced) on any store change.
  useEffect(() => {
    const sync = () => {
      if (!owner.current) return;
      const all = useStore.getState().tournaments;
      const ids = new Set(all.map((t) => t.id));
      for (const id of prevIds.current) if (!ids.has(id)) deleteTournamentRemote(owner.current, id);
      for (const t of all) {
        if (lastPushed.current.get(t.id) !== t.updatedAt) {
          lastPushed.current.set(t.id, t.updatedAt);
          putTournament(owner.current, t);
        }
      }
      prevIds.current = ids;
    };
    const unsub = useStore.subscribe(() => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(sync, 1200);
    });
    return () => {
      unsub();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return null;
}
