"use client";

import { useState } from "react";
import { EMOJI_CATEGORIES } from "@/lib/emoji";

// A compact emoji picker: category tabs across the top, a scrollable grid below.
// Renders with the OS emoji font — no images, works offline.
export function EmojiPicker({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  const [active, setActive] = useState(0);
  const cat = EMOJI_CATEGORIES[active];

  return (
    <div className="w-64 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl overflow-hidden">
      <div className="flex items-center gap-0.5 border-b border-[var(--border)] px-1.5 py-1 overflow-x-auto">
        {EMOJI_CATEGORIES.map((c, i) => (
          <button
            key={c.label}
            type="button"
            onClick={() => setActive(i)}
            title={c.label}
            className={`shrink-0 rounded-lg px-1.5 py-1 text-base leading-none transition ${
              active === i ? "bg-[var(--brand-soft)]" : "hover:bg-[var(--hover)]"
            }`}
          >
            {c.icon}
          </button>
        ))}
      </div>
      <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
        {cat.label}
      </div>
      <div className="grid grid-cols-8 gap-0.5 px-1.5 pb-2 max-h-48 overflow-y-auto">
        {cat.emoji.map((e, i) => (
          <button
            key={`${e}-${i}`}
            type="button"
            onClick={() => onPick(e)}
            className="rounded-lg text-xl leading-none aspect-square hover:bg-[var(--hover)] transition"
          >
            {e}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="w-full border-t border-[var(--border)] py-1.5 text-xs font-medium text-[var(--muted)] hover:bg-[var(--hover)]"
      >
        Close
      </button>
    </div>
  );
}
