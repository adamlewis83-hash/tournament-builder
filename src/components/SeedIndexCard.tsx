"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { getProfile } from "@/lib/profile";
import { indexHistory, seedIndexForPlayer } from "@/lib/handicap";
import { Card } from "./ui";

// Sparkline of the index after each round — flat histories still draw (the
// vertical range is padded so a constant line sits mid-chart, not on the edge).
function TrendLine({ points }: { points: number[] }) {
  const W = 120;
  const H = 30;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const pad = Math.max(0.5, (max - min) * 0.15);
  const lo = min - pad;
  const hi = max + pad;
  const x = (i: number) => (points.length === 1 ? W / 2 : (i / (points.length - 1)) * (W - 6) + 3);
  const y = (v: number) => H - 3 - ((v - lo) / (hi - lo)) * (H - 6);
  const path = points.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const falling = points.length > 1 && last < points[0];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-8 w-32" aria-hidden>
      <polyline
        points={path}
        fill="none"
        stroke="var(--brand)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={falling ? 1 : 0.8}
      />
      <circle cx={x(points.length - 1)} cy={y(last)} r="2.5" fill="var(--brand)" />
    </svg>
  );
}

// The player's Seed Index — the estimated handicap grown from rounds actually
// played in Sporos. Renders nothing until the profile has a name and at least
// one finished individual golf round exists.
export function SeedIndexCard() {
  const tournaments = useStore((s) => s.tournaments);
  const [name, setName] = useState("");
  useEffect(() => setName(getProfile().name.trim()), []);
  if (!name) return null;

  const r = seedIndexForPlayer(tournaments, name);
  if (r.rounds === 0 && !r.pendingNine) return null;
  const trend = r.index != null ? indexHistory(tournaments, name) : [];

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold flex items-center gap-2">⛳ Seed Index</h2>
          <p className="text-xs text-[var(--muted)]">
            Your estimated handicap, grown from {r.rounds} finished round
            {r.rounds === 1 ? "" : "s"} in Sporos
            {r.pendingNine ? " · one 9-hole round is waiting for a partner nine" : ""}.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {trend.length >= 2 && <TrendLine points={trend} />}
          <div className="text-right">
            <div className="text-4xl font-extrabold tabular-nums leading-none">
              {r.index != null ? r.index.toFixed(1) : "—"}
            </div>
            {r.index == null ? (
              <div className="text-[10px] text-[var(--muted)]">
                {3 - r.differentials.length} more round
                {3 - r.differentials.length === 1 ? "" : "s"} to go
              </div>
            ) : (
              trend.length >= 2 && (
                <div className="text-[10px] text-[var(--muted)] tabular-nums">
                  {trend[trend.length - 1] < trend[0]
                    ? `▾ ${(trend[0] - trend[trend.length - 1]).toFixed(1)} since round 3`
                    : trend[trend.length - 1] > trend[0]
                      ? `▴ ${(trend[trend.length - 1] - trend[0]).toFixed(1)} since round 3`
                      : "holding steady"}
                </div>
              )
            )}
          </div>
        </div>
      </div>
      {r.differentials.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-[var(--muted)] font-semibold">
            Recent differentials
          </span>
          {r.differentials.slice(0, 10).map((d, i) => (
            <span
              key={i}
              className="rounded-md border border-[var(--border)] bg-[var(--subtle)] px-1.5 py-0.5 text-xs tabular-nums"
            >
              {d.toFixed(1)}
            </span>
          ))}
        </div>
      )}
      <p className="mt-2 text-[10px] text-[var(--muted)]">
        WHS-style estimate — best {r.used || "—"} of your last {Math.min(20, r.differentials.length)}{" "}
        differentials{r.adjustment ? ` (${r.adjustment} adjustment)` : ""}. Not an official index.
      </p>
    </Card>
  );
}
