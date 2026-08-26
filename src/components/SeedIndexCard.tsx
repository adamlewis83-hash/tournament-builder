"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { getProfile } from "@/lib/profile";
import { cardsForPlayer, indexHistory, seedIndexForPlayer } from "@/lib/handicap";
import { gameMetrics, gameTakeaway, roundStats, sumStats, type Light } from "@/lib/golfStats";
import { Card } from "./ui";

// 7e — the index bar trend: the Seed Index after each of the last ten rounds,
// current round highlighted. Bars, not a line: each round is a discrete event.
function TrendBars({ points }: { points: number[] }) {
  const shown = points.slice(-10);
  const min = Math.min(...shown);
  const max = Math.max(...shown);
  const pad = Math.max(0.5, (max - min) * 0.2);
  const lo = min - pad;
  const span = max + pad - lo;
  return (
    <div className="flex h-9 items-end gap-1" aria-hidden>
      {shown.map((v, i) => (
        <div
          key={i}
          title={v.toFixed(1)}
          className={`w-2.5 rounded-t-sm ${
            i === shown.length - 1 ? "bg-[var(--brand)]" : "bg-[var(--brand)]/35"
          }`}
          style={{ height: `${Math.max(12, ((v - lo) / span) * 100)}%` }}
        />
      ))}
    </div>
  );
}

const LIGHT_COLOR: Record<Light, string> = {
  good: "bg-[var(--win)]",
  ok: "bg-amber-400",
  poor: "bg-rose-400",
};

// The player's Seed Index — the estimated handicap grown from rounds actually
// played in Sporos — plus the 7e trend panel: delta and best-ever, a 10-round
// bar trend, traffic-light game metrics, and one actionable takeaway.
// Renders nothing until the profile has a name and at least one finished
// individual golf round exists.
export function SeedIndexCard() {
  const tournaments = useStore((s) => s.tournaments);
  const [name, setName] = useState("");
  useEffect(() => setName(getProfile().name.trim()), []);
  if (!name) return null;

  const r = seedIndexForPlayer(tournaments, name);
  if (r.rounds === 0 && !r.pendingNine) return null;
  const trend = r.index != null ? indexHistory(tournaments, name) : [];
  const bestEver = trend.length ? Math.min(...trend) : null;
  const delta = trend.length >= 2 ? trend[trend.length - 1] - trend[trend.length - 2] : null;

  // Career game metrics from every entered three-tap stat, across all rounds.
  const cards = cardsForPlayer(tournaments, name);
  const agg = sumStats(cards.map((c) => roundStats(c.pars, c.scores, c.entries)));
  const metrics = gameMetrics(agg);
  const takeaway = gameTakeaway(metrics);

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
        <div className="flex items-end gap-3 shrink-0">
          {trend.length >= 2 && <TrendBars points={trend} />}
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
              <div className="text-[10px] text-[var(--muted)] tabular-nums">
                {delta != null && delta !== 0 && (
                  <span className={delta < 0 ? "text-[var(--win)]" : ""}>
                    {delta < 0 ? "▾" : "▴"} {Math.abs(delta).toFixed(1)}
                  </span>
                )}
                {delta != null && delta !== 0 && bestEver != null ? " · " : ""}
                {bestEver != null ? `best ${bestEver.toFixed(1)}` : ""}
              </div>
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

      {/* Game metrics — only the stats your three taps have actually earned */}
      {metrics.length > 0 && (
        <div className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {metrics.map((m) => (
            <div key={m.key}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-[var(--muted)]">{m.label}</span>
                <span className="font-semibold tabular-nums">{m.value}</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className={`h-full rounded-full ${LIGHT_COLOR[m.light]}`}
                  style={{ width: `${Math.max(4, Math.min(100, m.barPct))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      {takeaway && (
        <p className="mt-3 rounded-lg border border-[var(--brand)]/30 bg-[var(--brand-soft)]/40 px-3 py-2 text-xs text-[var(--muted)]">
          <span className="mr-1.5 rounded bg-[var(--brand-soft)] px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[var(--brand)]">
            Work on
          </span>
          {takeaway}
        </p>
      )}

      <p className="mt-2 text-[10px] text-[var(--muted)]">
        WHS-style estimate — best {r.used || "—"} of your last {Math.min(20, r.differentials.length)}{" "}
        differentials{r.adjustment ? ` (${r.adjustment} adjustment)` : ""}. Not an official index.
      </p>
    </Card>
  );
}
