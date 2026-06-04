"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { fetchLive } from "@/lib/live";

// Polls the live session every few seconds and applies any newer remote state.
export function useLiveSync(id: string, liveCode?: string, liveVersion?: number) {
  const applyRemote = useStore((s) => s.applyRemote);
  const versionRef = useRef(liveVersion ?? -1);

  useEffect(() => {
    versionRef.current = Math.max(versionRef.current, liveVersion ?? -1);
  }, [liveVersion]);

  useEffect(() => {
    if (!liveCode) return;
    let active = true;
    const poll = async () => {
      const r = await fetchLive(liveCode);
      if (active && r && r.version > versionRef.current) {
        versionRef.current = r.version;
        applyRemote(id, r.data, r.version);
      }
    };
    poll();
    const iv = setInterval(poll, 2500);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, [id, liveCode, applyRemote]);
}
