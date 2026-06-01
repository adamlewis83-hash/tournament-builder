"use client";

import { useEffect, useState } from "react";
import { PALETTE } from "@/lib/colors";

// Lightweight CSS confetti burst. Renders once per `trigger` value change.
export function Confetti({ trigger }: { trigger: string }) {
  const [pieces, setPieces] = useState<
    { left: number; delay: number; dur: number; color: string; rot: number }[]
  >([]);

  useEffect(() => {
    if (!trigger) return;
    const next = Array.from({ length: 90 }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      dur: 2.2 + Math.random() * 1.8,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      rot: Math.random() * 360,
    }));
    setPieces(next);
    const tmo = setTimeout(() => setPieces([]), 4500);
    return () => clearTimeout(tmo);
  }, [trigger]);

  if (!pieces.length) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden no-print" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            transform: `rotate(${p.rot}deg)`,
            borderRadius: i % 3 === 0 ? "50%" : "2px",
          }}
        />
      ))}
    </div>
  );
}
