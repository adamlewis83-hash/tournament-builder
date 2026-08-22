"use client";

import { useState } from "react";
import { Card } from "./ui";

// One choice per card kind, shared across tournaments: closing "Cheers" here means
// you like it closed, not just on this event.
const KEY = "sporos-cards-open";
function readAll(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

/**
 * A card that folds down to its title row.
 *
 * The control cards had grown to where the scoreboard lived below a screenful of
 * them. Folded, each is one line — and the header carries the card's key fact
 * (the live join code, the Vegas rules summary) so closing it doesn't hide what
 * you actually glance at.
 *
 * The body is hidden, not unmounted, so a card that polls (the cheer feed) keeps
 * polling and a half-typed cheer survives folding. Your open/closed choice is
 * remembered per card on this device; `defaultOpen` only decides the first visit.
 */
export function CollapsibleCard({
  id,
  title,
  summary,
  defaultOpen = false,
  action,
  className = "",
  children,
}: {
  id: string;
  title: React.ReactNode;
  /** Shown next to the chevron while folded — the one fact worth keeping visible. */
  summary?: React.ReactNode;
  defaultOpen?: boolean;
  /** Optional control that stays in the header row (kept outside the toggle button). */
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return defaultOpen;
    return readAll()[id] ?? defaultOpen;
  });
  const toggle = () =>
    setOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [id]: next }));
      } catch {
        /* a full or blocked store just loses the memory, never the toggle */
      }
      return next;
    });

  return (
    <Card className={`no-print p-0 overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 pr-2">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--hover)]"
        >
          <span className="text-sm font-semibold truncate">{title}</span>
          <span className="shrink-0 text-xs text-[var(--muted)]">
            {open ? "▾" : <>▸ {summary}</>}
          </span>
        </button>
        {action}
      </div>
      <div className={open ? "px-4 pb-4" : "hidden"}>{children}</div>
    </Card>
  );
}
