"use client";

import { useState } from "react";
import {
  FORMAT_BLURBS,
  FORMAT_LABELS,
  GOLF_MODE_BLURBS,
  GOLF_MODE_LABELS,
  PLAYSTYLE_LABELS,
  SEGMENT_BLURBS,
  SEGMENT_LABELS,
  Tournament,
} from "@/lib/types";

interface Def {
  title: string;
  text: string;
}

function definitions(t: Tournament): Def[] {
  if (t.format === "golf") {
    const mode = t.config.golfMode;
    if (mode === "mixed") {
      const used = [...new Set((t.golf?.segments ?? []).map((s) => s.format))];
      return [
        { title: "Build Your Own", text: GOLF_MODE_BLURBS.mixed },
        ...used.map((f) => ({ title: SEGMENT_LABELS[f], text: SEGMENT_BLURBS[f] })),
      ];
    }
    return [{ title: GOLF_MODE_LABELS[mode], text: GOLF_MODE_BLURBS[mode] }];
  }
  if (t.format === "ryder") {
    return [
      { title: "Ryder Cup", text: FORMAT_BLURBS.ryder },
      { title: "Foursomes", text: "Partners share one ball, alternating shots (2 v 2)." },
      { title: "Fourball", text: "Each plays their own ball; the team takes the lower score (2 v 2)." },
      { title: "Singles", text: "One-on-one net match play (1 v 1)." },
    ];
  }
  const defs: Def[] = [{ title: FORMAT_LABELS[t.format], text: FORMAT_BLURBS[t.format] }];
  if (t.playStyle && PLAYSTYLE_LABELS[t.playStyle]) {
    defs.push({ title: PLAYSTYLE_LABELS[t.playStyle], text: PLAYSTYLE_BLURBS[t.playStyle] });
  }
  return defs;
}

const PLAYSTYLE_BLURBS: Record<string, string> = {
  singles: "Everyone competes as an individual.",
  doubles: "Individuals are paired into fresh teams each round — standings track per person.",
  "doubles-fixed": "Set pairs that stay together the whole event; each pair competes as one.",
  teams: "Teams of 2+ players; each team competes as a single unit.",
};

export function FormatInfo({ t }: { t: Tournament }) {
  const [open, setOpen] = useState(false);
  const items = definitions(t);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="What does this format mean?"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--border)] text-[11px] font-bold leading-none text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
      >
        ?
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-7 z-40 w-72 max-w-[80vw] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm shadow-xl">
            {items.map((it, i) => (
              <div
                key={i}
                className={i > 0 ? "mt-2 border-t border-[var(--border)] pt-2" : ""}
              >
                <div className="font-bold">{it.title}</div>
                <div className="mt-0.5 text-xs text-[var(--muted)]">{it.text}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </span>
  );
}
