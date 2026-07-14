"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import {
  getLibraryKey,
  fetchLibrary,
  putTournament,
  deleteTournamentRemote,
  fetchFriends,
  putFriends,
  fetchCourses,
  putCourses,
} from "@/lib/library";

// Backs the whole tournament library up to the cloud under an anonymous device key,
// pulls it on load, and keeps it synced. Renders nothing.
export function CloudSync() {
  const hydrated = useStore((s) => s.hydrated);
  const mergeCloud = useStore((s) => s.mergeCloud);
  const mergeFriends = useStore((s) => s.mergeFriends);
  const mergeCourses = useStore((s) => s.mergeCourses);
  const pruneDeleted = useStore((s) => s.pruneDeleted);
  // Ids the cloud reports as deleted — never push these back up.
  const deleted = useRef<Set<string>>(new Set());
  const started = useRef(false);
  const lastPushed = useRef<Map<string, number>>(new Map());
  const prevIds = useRef<Set<string>>(new Set());
  const lastFriendsSig = useRef("");
  const lastCoursesSig = useRef("");
  const owner = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial pull + push.
  useEffect(() => {
    if (!hydrated || started.current) return;
    started.current = true;
    owner.current = getLibraryKey();
    (async () => {
      const { tournaments: remote, deletedIds } = await fetchLibrary(owner.current);
      if (remote.length) mergeCloud(remote);
      // Prune anything the cloud says was deleted BEFORE the re-push below —
      // otherwise this device's stale copy would resurrect it for everyone.
      if (deletedIds.length) {
        deleted.current = new Set(deletedIds);
        pruneDeleted(deletedIds);
      }
      const all = useStore.getState().tournaments;
      for (const t of all) {
        lastPushed.current.set(t.id, t.updatedAt);
        putTournament(owner.current, t);
      }
      prevIds.current = new Set(all.map((t) => t.id));

      // Friends & saved courses: pull cloud into local (restores after a
      // reinstall), then push the merged list back so both sides converge.
      const remoteFriends = await fetchFriends(owner.current);
      if (remoteFriends.length) mergeFriends(remoteFriends);
      const friends = useStore.getState().friends;
      lastFriendsSig.current = JSON.stringify(friends);
      putFriends(owner.current, friends);

      const remoteCourses = await fetchCourses(owner.current);
      if (remoteCourses.length) mergeCourses(remoteCourses);
      const courses = useStore.getState().courses;
      lastCoursesSig.current = JSON.stringify(courses);
      putCourses(owner.current, courses);
    })();
  }, [hydrated, mergeCloud, mergeFriends, mergeCourses, pruneDeleted]);

  // Push diffs (debounced) on any store change.
  useEffect(() => {
    const sync = () => {
      if (!owner.current) return;
      const state = useStore.getState();
      const all = state.tournaments;
      const ids = new Set(all.map((t) => t.id));
      for (const id of prevIds.current) {
        if (!ids.has(id)) {
          deleted.current.add(id);
          deleteTournamentRemote(owner.current, id);
        }
      }
      for (const t of all) {
        if (deleted.current.has(t.id)) continue; // tombstoned — don't resurrect
        if (lastPushed.current.get(t.id) !== t.updatedAt) {
          lastPushed.current.set(t.id, t.updatedAt);
          putTournament(owner.current, t);
        }
      }
      prevIds.current = ids;

      // Friends & saved courses: push the whole list whenever it changes.
      const friendsSig = JSON.stringify(state.friends);
      if (friendsSig !== lastFriendsSig.current) {
        lastFriendsSig.current = friendsSig;
        putFriends(owner.current, state.friends);
      }
      const coursesSig = JSON.stringify(state.courses);
      if (coursesSig !== lastCoursesSig.current) {
        lastCoursesSig.current = coursesSig;
        putCourses(owner.current, state.courses);
      }
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
