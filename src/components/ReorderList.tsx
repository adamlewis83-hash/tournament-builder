"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A short list you can put in order by dragging.
 *
 * Pointer events rather than HTML5 drag-and-drop: this app is used on a phone at a
 * golf course, and `dragstart`/`dragover` never fire for touch. The grip captures the
 * pointer and the row is `touch-none`, so dragging a session doesn't scroll the page
 * out from under you.
 *
 * Rows also carry ↑/↓ buttons. They're the keyboard-reachable path, and the one that
 * still works if a drag is fiddly with gloves on.
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
  // The row currently under the finger, or null when nothing is being dragged.
  const [held, setHeld] = useState<number | null>(null);
  const rows = useRef<(HTMLLIElement | null)[]>([]);

  // The release has to be caught on the window, not the grip. Rows are keyed by
  // position, so the grip you started on is a different element by the time you have
  // dragged past a neighbour — pointer capture goes with the old one, and a
  // grip-bound pointerup would never fire. That left the row stuck in its lifted
  // state, ready to start reordering again the moment a finger passed over it.
  useEffect(() => {
    if (held === null) return;
    const release = () => setHeld(null);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [held]);

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
  }

  function down(i: number) {
    return (e: React.PointerEvent) => {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      setHeld(i);
    };
  }

  function drag(e: React.PointerEvent) {
    if (held === null) return;
    // Swap as soon as the finger crosses the midpoint of a neighbouring row, so the
    // list reorders under you rather than only settling on release.
    for (let j = 0; j < items.length; j++) {
      if (j === held) continue;
      const el = rows.current[j];
      if (!el) continue;
      const box = el.getBoundingClientRect();
      const mid = box.top + box.height / 2;
      if ((j < held && e.clientY < mid) || (j > held && e.clientY > mid)) {
        move(held, j);
        setHeld(j);
        return;
      }
    }
  }

  const release = () => setHeld(null);

  return (
    <ol className="mb-3 space-y-1">
      {items.map((item, i) => (
        <li
          // Keyed by position on purpose: reordering should move the labels through
          // stable rows rather than tear rows down and rebuild them mid-drag.
          key={i}
          ref={(el) => {
            rows.current[i] = el;
          }}
          className={`flex items-center gap-2 rounded-lg bg-[var(--subtle)] px-2 py-1.5 text-sm transition-shadow ${
            held === i ? "shadow-lg ring-1 ring-[var(--brand)] opacity-90" : ""
          }`}
        >
          <span
            role="button"
            tabIndex={-1}
            aria-label="Drag to reorder"
            onPointerDown={down(i)}
            onPointerMove={drag}
            onPointerUp={release}
            onPointerCancel={release}
            className="cursor-grab active:cursor-grabbing touch-none select-none px-1 text-[var(--muted)] hover:text-[var(--foreground)]"
          >
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
