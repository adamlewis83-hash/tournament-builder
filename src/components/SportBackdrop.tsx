"use client";

import { useEffect, useState } from "react";

const svgProps = {
  viewBox: "0 0 400 240",
  preserveAspectRatio: "xMidYMid slice" as const,
  className: "h-full w-full",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// Subtle top-down / scene line-art per sport, drawn in the brand color.
const MOTIFS = [
  // Golf — green, flag, fairway contours
  <svg key="golf" {...svgProps}>
    <path d="M-10 215 Q150 175 410 205" />
    <path d="M-10 235 Q180 205 410 230" />
    <ellipse cx="295" cy="165" rx="95" ry="36" />
    <line x1="298" y1="165" x2="298" y2="58" />
    <path d="M298 58 L342 71 L298 84 Z" fill="currentColor" stroke="none" />
    <circle cx="298" cy="165" r="3.5" fill="currentColor" stroke="none" />
  </svg>,
  // Tennis / pickleball court
  <svg key="court" {...svgProps}>
    <rect x="48" y="34" width="304" height="172" rx="2" />
    <line x1="200" y1="34" x2="200" y2="206" />
    <rect x="104" y="74" width="192" height="92" />
    <line x1="104" y1="120" x2="296" y2="120" />
  </svg>,
  // Basketball half court
  <svg key="hoop" {...svgProps}>
    <rect x="34" y="24" width="332" height="192" rx="2" />
    <rect x="158" y="24" width="84" height="74" />
    <circle cx="200" cy="98" r="30" />
    <path d="M66 24 L66 64 A138 138 0 0 0 334 64 L334 24" />
    <circle cx="200" cy="40" r="7" />
  </svg>,
  // Soccer pitch
  <svg key="pitch" {...svgProps}>
    <rect x="34" y="28" width="332" height="184" rx="2" />
    <line x1="200" y1="28" x2="200" y2="212" />
    <circle cx="200" cy="120" r="36" />
    <rect x="34" y="78" width="52" height="84" />
    <rect x="314" y="78" width="52" height="84" />
  </svg>,
  // Running track lanes
  <svg key="track" {...svgProps}>
    <rect x="30" y="52" width="340" height="136" rx="68" />
    <rect x="50" y="68" width="300" height="104" rx="52" />
    <rect x="70" y="84" width="260" height="72" rx="36" />
    <rect x="90" y="100" width="220" height="40" rx="20" />
  </svg>,
];

export function SportBackdrop() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % MOTIFS.length), 7000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--brand-soft)] via-transparent to-[var(--brand-soft)]" />
      {MOTIFS.map((motif, idx) => (
        <div
          key={idx}
          className={`absolute inset-0 text-[var(--brand)] transition-opacity duration-[1500ms] ${
            idx === i ? "opacity-[0.22]" : "opacity-0"
          }`}
        >
          {motif}
        </div>
      ))}
    </div>
  );
}
