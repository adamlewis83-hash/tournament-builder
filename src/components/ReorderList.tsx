"use client";

import { useReorder } from "@/hooks/useReorder";

/**
 * A short list you can put in order by dragging.
 *
 * Rows carry ↑/↓ buttons alongside the grip. They're the keyboard-reachable path,
 * and the one that still works one-handed on a cart.
 */
export function ReorderList<T>({
  items,
  onReorder,
  renderItem,
  onRemove,
}: {
  items: T[];
  onReorder: (next: T[]) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  onRemove?: (index: number) => void;
}) {
  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
  }
  const { held, ref, grip } = useReorder(items.length, move);

  return (
    <ol className="mb-3 space-y-1">
      {items.map((item, i) => (
        <li
          // Keyed by position on purpose: reordering should move the labels through
          // stable rows rather than tear rows down and rebuild them mid-drag.
          key={i}
          ref={ref(i)}
          className={`flex items-center gap-2 rounded-lg bg-[var(--subtle)] px-2 py-1.5 text-sm transition-shadow ${
            held === i ? "shadow-lg ring-1 ring-[var(--brand)] opacity-90" : ""
          }`}
        >
          <span {...grip(i)} className={`${grip(i).className} px-1 text-[var(--muted)] hover:text-[var(--foreground)]`}>
            ⠿
          </span>
          <span className="font-bold text-[var(--muted)] w-5 shrink-0">{i + 1}.</span>
          <span className="min-w-0 flex-1">{renderItem(item, i)}</span>
          <span className="flex shrink-0 items-center">
            <button
              type="button"
              aria-label="Move up"
              disabled={i === 0}
              onClick={() => move(i, i - 1)}
              className="px-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25"
            >
              ↑
            </button>
            <button
              type="button"
              aria-label="Move down"
              disabled={i === items.length - 1}
              onClick={() => move(i, i + 1)}
              className="px-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25"
            >
              ↓
            </button>
            {onRemove && (
              <button
                type="button"
                aria-label="Remove"
                onClick={() => onRemove(i)}
                className="pl-1.5 text-xs text-[var(--muted)] hover:text-rose-400"
              >
                ✕
              </button>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
