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
  fetchProfileBlob,
  putProfileBlob,
  type ProfileBlob,
} from "@/lib/library";
import { getProfile, PROFILE_EVENT, setProfile, type Profile } from "@/lib/profile";
import { getPastRounds, replacePastRounds, type PastRound } from "@/lib/pastRounds";
import { getAliases, replaceAliases } from "@/lib/aliases";

// The last time THIS device changed the profile (or past rounds / aliases) —
// the tiebreaker against the cloud copy's savedAt.
const REV_KEY = "sporos-profile-rev";
const localRev = (): number => {
  try {
    return Number(localStorage.getItem(REV_KEY)) || 0;
  } catch {
    return 0;
  }
};
const stampRev = () => {
  try {
    localStorage.setItem(REV_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
};

const profileEmpty = (p: Profile, rounds: PastRound[], aliases: Record<string, string>) =>
  !p.name.trim() && p.golfHandicap == null && !p.startingIndex && !rounds.length && !Object.keys(aliases).length;

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
  // True while a cloud profile is being written locally — those saves are
  // echoes, not edits, and must not stamp this device newer or push back.
  const adopting = useRef(false);

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
      const remoteF = await fetchFriends(owner.current);
      if (remoteF.friends.length || remoteF.tombstones.length)
        mergeFriends(remoteF.friends, remoteF.tombstones);
      const st = useStore.getState();
      lastFriendsSig.current = JSON.stringify([st.friends, st.friendTombstones]);
      putFriends(owner.current, st.friends, st.friendTombstones);

      const remoteCourses = await fetchCourses(owner.current);
      if (remoteCourses.length) mergeCourses(remoteCourses);
      const courses = useStore.getState().courses;
      lastCoursesSig.current = JSON.stringify(courses);
      putCourses(owner.current, courses);

      // Profile (+ past rounds + name merges): the person follows the account.
      // Last write wins — the cloud copy replaces this device's only when it is
      // newer than anything typed here (or nothing was ever typed here).
      const remoteProf = await fetchProfileBlob(owner.current);
      const localP = getProfile();
      if (
        remoteProf?.profile &&
        (profileEmpty(localP, getPastRounds(), getAliases()) || (remoteProf.savedAt ?? 0) > localRev())
      ) {
        adopting.current = true;
        try {
          setProfile({ ...localP, ...(remoteProf.profile as Profile) });
          replacePastRounds((remoteProf.pastRounds ?? []) as PastRound[]);
          replaceAliases(remoteProf.aliases ?? {});
          try {
            localStorage.setItem(REV_KEY, String(remoteProf.savedAt ?? Date.now()));
          } catch {
            /* ignore */
          }
        } finally {
          adopting.current = false;
        }
      } else if (!profileEmpty(localP, getPastRounds(), getAliases())) {
        putProfileBlob(owner.current, {
          profile: getProfile(),
          pastRounds: getPastRounds(),
          aliases: getAliases(),
          savedAt: localRev() || Date.now(),
        } satisfies ProfileBlob);
      }
    })();
  }, [hydrated, mergeCloud, mergeFriends, mergeCourses, pruneDeleted]);

  // Any profile save (name, handicap, starting index, past rounds, merges)
  // stamps this device newer and backs the whole person up — debounced, and
  // skipped while we're the ones writing during a cloud restore.
  const profTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const onChange = () => {
      if (adopting.current || !owner.current) return;
      stampRev();
      if (profTimer.current) clearTimeout(profTimer.current);
      profTimer.current = setTimeout(() => {
        putProfileBlob(owner.current, {
          profile: getProfile(),
          pastRounds: getPastRounds(),
          aliases: getAliases(),
          savedAt: localRev(),
        } satisfies ProfileBlob);
      }, 1200);
    };
    window.addEventListener(PROFILE_EVENT, onChange);
    return () => {
      window.removeEventListener(PROFILE_EVENT, onChange);
      if (profTimer.current) clearTimeout(profTimer.current);
    };
  }, []);

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
      const friendsSig = JSON.stringify([state.friends, state.friendTombstones]);
      if (friendsSig !== lastFriendsSig.current) {
        lastFriendsSig.current = friendsSig;
        putFriends(owner.current, state.friends, state.friendTombstones);
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
