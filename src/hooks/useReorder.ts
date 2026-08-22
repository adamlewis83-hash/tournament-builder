"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Drag-to-reorder for a list of any shape — plain rows, or whole blocks with a grip
 * in their heading.
 *
 * Pointer events rather than HTML5 drag-and-drop: this app is used on a phone at a
 * golf course, and `dragstart`/`dragover` never fire for touch.
 *
 * The caller registers each item's element with `ref(i)` and spreads `grip(i)` onto
 * whatever should be draggable. Items swap as soon as the pointer crosses a
 * neighbour's midpoint, so a list reorders under your finger rather than only
 * settling on release — and measuring real elements means rows of different heights
 * (a one-match session vs a four-match one) work without knowing their sizes.
 */
export function useReorder(count: number, onMove: (from: number, to: number) => void) {
  const [held, setHeld] = useState<number | null>(null);
  const els = useRef<(HTMLElement | null)[]>([]);

  // The release has to be caught on the window, not the grip. Reordering re-renders
  // the list, so the element you pressed may no longer be the one under the pointer —
  // pointer capture goes with the old one and a grip-bound pointerup never fires,
  // leaving the row stuck in its lifted state and ready to grab again unprompted.
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

  const ref = (i: number) => (el: HTMLElement | null) => {
    els.current[i] = el;
  };

  const grip = (i: number) => ({
    onPointerDown: (e: React.PointerEvent) => {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      setHeld(i);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (held === null) return;
      for (let j = 0; j < count; j++) {
        if (j === held) continue;
        const el = els.current[j];
        if (!el) continue;
        const box = el.getBoundingClientRect();
        const mid = box.top + box.height / 2;
        if ((j < held && e.clientY < mid) || (j > held && e.clientY > mid)) {
          onMove(held, j);
          setHeld(j);
          return;
        }
      }
    },
    onPointerUp: () => setHeld(null),
    onPointerCancel: () => setHeld(null),
    className: "cursor-grab active:cursor-grabbing touch-none select-none",
    role: "button" as const,
    tabIndex: -1,
    "aria-label": "Drag to reorder",
  });

  return { held, ref, grip };
}
