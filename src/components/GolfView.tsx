"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  GOLF_MODE_BLURBS,
  GOLF_MODE_LABELS,
  GOLF_SCORING_LABELS,
  GolfMode,
  GolfScoring,
  Tournament,
  VEGAS_DEFAULTS,
  VegasRules,
} from "@/lib/types";
import { useStore } from "@/lib/store";
import {
  computeGolf,
  computeGolfMatch,
  computeVegas,
  computeVegasLedger,
  vegasIsPerPlayer,
  effectiveHandicap,
  formatToPar,
  golfScoringOptions,
  holeStrokes,
} from "@/lib/golf";
import { colorFor, photoFor } from "@/lib/colors";
import { autoSummary, deriveHole, roundInsights, roundStats } from "@/lib/golfStats";
import { seedIndexForPlayer } from "@/lib/handicap";
import { getProfile } from "@/lib/profile";
import { Button, Card } from "./ui";
import { Avatar } from "./Avatar";
import { GpsBand } from "./GolfHoleBand";
import { StrokeDots } from "./StrokeDots";
import { BbbView } from "./BbbView";
import { WolfView } from "./WolfView";
import { MixedGolfView } from "./MixedGolfView";

// Mapbox touches `window`, so load the GPS panel client-side only.
const GolfGps = dynamic(() => import("./GolfGps").then((m) => m.GolfGps), { ssr: false });

const SWITCHABLE: GolfMode[] = ["stroke", "stableford", "skins", "nassau"];


// Rule-row furniture for the Vegas panel. Defined here rather than inside the panel:
// a component created during render is a new type every pass, so React tears the old
// one down and remounts it — the number inputs would lose focus as you typed.
function RuleRow({
  label, hint, children,
}: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] py-2 first:border-0">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[10px] text-[var(--muted)]">{hint}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function RulePills<T extends string | number>({
  value, options, onPick,
}: { value: T; options: [T, string][]; onPick: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5">
      {options.map(([v, label]) => (
        <button
          key={String(v)}
          onClick={() => onPick(v)}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
            value === v
              ? "bg-[var(--brand)] text-[var(--on-brand)]"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function MoneyInput({ value, onSet }: { value: number; onSet: (n: number) => void }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-[var(--muted)] text-sm">$</span>
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(e) => onSet(Math.max(0, Number(e.target.value) || 0))}
        className="w-16 rounded-lg border border-[var(--border)] bg-[var(--input)] px-2 py-1 text-center text-sm tabular-nums outline-none focus:border-[var(--brand)]"
      />
    </span>
  );
}

/** Vegas house rules, à la carte — every switch past the plain combined-number
 *  game is optional, and each one restates what it does in the group's words. */
function VegasRulesPanel({ t, rules }: { t: Tournament; rules: VegasRules }) {
  const patch = useStore((s) => s.patchTournament);
  const [open, setOpen] = useState(false);
  const set = (part: Partial<VegasRules>) =>
    patch(t.id, { config: { ...t.config, vegasRules: { ...rules, ...part } } });

  return (
    <Card className="no-print p-4">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="text-sm font-semibold">🎰 House rules</span>
        <span className="text-xs text-[var(--muted)]">
          {open ? "▾ Hide" : `▸ ${rules.flipOn === "off" ? "Plain Vegas" : "Flips on"}${rules.pressAt ? " · presses" : ""}`}
        </span>
      </button>
      {open && (
        <div className="mt-2">
          <RuleRow label="Handicaps" hint="take strokes off before the two balls are combined">
            <RulePills<string>
              value={rules.net ? "net" : "gross"}
              options={[["gross", "Gross"], ["net", "Net"]]}
              onPick={(v) => set({ net: v === "net" })}
            />
          </RuleRow>
          <RuleRow label="Flip" hint="your birdie turns the OTHER team's number around — 46 becomes 64">
            <RulePills<VegasRules["flipOn"]>
              value={rules.flipOn}
              options={[["off", "Off"], ["birdie", "Birdie+"], ["eagle", "Eagle only"]]}
              onPick={(v) => set({ flipOn: v })}
            />
          </RuleRow>
          <RuleRow label="Teams" hint="fixed, swapping every 6, or picked hole by hole (tee shots decide)">
            <RulePills<VegasRules["teams"]>
              value={rules.teams}
              options={[["fixed", "Set teams"], ["rotate6", "Rotate /6"], ["byHole", "Pick per hole"]]}
              onPick={(v) => set({ teams: v })}
            />
          </RuleRow>
          <RuleRow label="Auto press" hint="a fresh bet starts once the margin hits this many points">
            <RulePills<number>
              value={rules.pressAt}
              options={[[0, "Off"], [5, "5 pts"], [10, "10 pts"]]}
              onPick={(v) => set({ pressAt: v })}
            />
          </RuleRow>
          {rules.pressAt > 0 && (
            <RuleRow label="Presses at once" hint="a cap keeps the stack of overlapping bets readable">
              <RulePills<number>
                value={rules.maxPresses}
                options={[[3, "Max 3"], [0, "No cap"]]}
                onPick={(v) => set({ maxPresses: v })}
              />
            </RuleRow>
          )}
          <RuleRow label="Tied holes" hint="a halved hole rolls its stake into the next one">
            <RulePills<string>
              value={rules.carryTies ? "carry" : "wash"}
              options={[["wash", "Wash"], ["carry", "Carry"]]}
              onPick={(v) => set({ carryTies: v === "carry" })}
            />
          </RuleRow>
          <RuleRow label="Per point" hint="the original bet">
            <MoneyInput value={rules.pointValue} onSet={(n) => set({ pointValue: n })} />
          </RuleRow>
          {rules.pressAt > 0 && (
            <RuleRow label="Per press point" hint="each press is its own bet at this rate">
              <MoneyInput value={rules.pressValue} onSet={(n) => set({ pressValue: n })} />
            </RuleRow>
          )}
        </div>
      )}
    </Card>
  );
}

/** The running ledger: what each hole paid, why, and where the money stands. */
function VegasLedgerView({
  ledger, rules, startHole,
}: {
  ledger: NonNullable<ReturnType<typeof computeVegasLedger>>;
  rules: VegasRules;
  startHole: number;
}) {
  const [open, setOpen] = useState(false);
  const { pointsA, pointsB, presses, moneyA } = ledger;
  const lead = pointsA > pointsB ? ledger.namesA : pointsB > pointsA ? ledger.namesB : null;
  const money = Math.abs(moneyA);
  const owes = moneyA > 0 ? ledger.namesB : ledger.namesA;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 text-center min-w-0">
          <div className="text-sm font-semibold text-[var(--brand)] truncate">
            {ledger.namesA.join(" & ")}
          </div>
          <div className="text-3xl font-extrabold tabular-nums">{pointsA}</div>
        </div>
        <div className="text-center shrink-0">
          <div className="text-[10px] uppercase tracking-widest text-[var(--muted)] font-bold">points</div>
          <div className="text-xs text-[var(--muted)]">thru {ledger.thru}</div>
        </div>
        <div className="flex-1 text-center min-w-0">
          <div className="text-sm font-semibold text-rose-300 truncate">
            {ledger.namesB.join(" & ")}
          </div>
          <div className="text-3xl font-extrabold tabular-nums">{pointsB}</div>
        </div>
      </div>

      {ledger.rows.length > 0 &&
        (() => {
          const last = ledger.rows[ledger.rows.length - 1];
          return (
            <p className="mt-1.5 text-center text-xs text-[var(--muted)]">
              Hole {startHole + last.hole}: <span className="tabular-nums">{last.numA}</span> vs{" "}
              <span className="tabular-nums">{last.numB}</span>
              {last.winner === null
                ? ` — push${rules.carryTies ? ` · ${last.carriedIn + 1} carried` : ""}`
                : ` — +${last.points} ${(last.winner === "A" ? ledger.namesA : ledger.namesB)
                    .map((n) => n.split(" ")[0])
                    .join(" & ")}`}
              {last.flippedA || last.flippedB ? " · flipped!" : ""}
            </p>
          );
        })()}

      {(rules.pointValue > 0 || presses.length > 0) && (
        <p className="mt-2 text-center text-sm">
          {money === 0 ? (
            <span className="text-[var(--muted)]">All square on the money.</span>
          ) : (
            <>
              <span className="font-bold tabular-nums">{owes.join(" & ")}</span>
              <span className="text-[var(--muted)]"> owe </span>
              <span className="font-bold tabular-nums">${money}</span>
            </>
          )}
          {presses.length > 0 && (
            <span className="block text-[10px] text-[var(--muted)] mt-0.5">
              original ${Math.abs((pointsA - pointsB) * rules.pointValue)} ·{" "}
              {presses.length} press{presses.length === 1 ? "" : "es"} at ${rules.pressValue}/pt
            </span>
          )}
        </p>
      )}
      {lead && (
        <p className="mt-1 text-center text-[10px] text-[var(--muted)]">
          {lead.join(" & ")} up {Math.abs(pointsA - pointsB)} points
        </p>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-2 w-full text-center text-xs text-[var(--brand)] font-medium hover:underline"
      >
        {open ? "Hide the hole-by-hole ▴" : "Hole-by-hole ▾"}
      </button>
      {open && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs border-separate border-spacing-0">
            <thead>
              <tr className="text-[var(--muted)]">
                <th className="px-1.5 py-1 text-left">Hole</th>
                <th className="px-1.5 py-1 text-center">{ledger.namesA.join(" & ")}</th>
                <th className="px-1.5 py-1 text-center">{ledger.namesB.join(" & ")}</th>
                <th className="px-1.5 py-1 text-right">Pts</th>
              </tr>
            </thead>
            <tbody>
              {ledger.rows.map((r) => (
                <tr key={r.hole} className="border-t border-[var(--border)]">
                  <td className="px-1.5 py-1 tabular-nums text-[var(--muted)]">
                    {startHole + r.hole}
                    {r.pressesOpen > 0 && (
                      <span className="ml-1 text-[9px] text-amber-400" title={`${r.pressesOpen} press(es) live`}>
                        ×{r.pressesOpen}
                      </span>
                    )}
                  </td>
                  <td className={`px-1.5 py-1 text-center tabular-nums ${r.winner === "A" ? "font-bold text-[var(--brand)]" : ""}`}>
                    {r.numA}
                    {r.birdieA && <span title="birdie — flips the other team">🐦</span>}
                    {r.flippedA && <span className="text-amber-400" title="flipped">↔</span>}
                  </td>
                  <td className={`px-1.5 py-1 text-center tabular-nums ${r.winner === "B" ? "font-bold text-rose-300" : ""}`}>
                    {r.numB}
                    {r.birdieB && <span title="birdie — flips the other team">🐦</span>}
                    {r.flippedB && <span className="text-amber-400" title="flipped">↔</span>}
                  </td>
                  <td className="px-1.5 py-1 text-right tabular-nums font-medium">
                    {r.winner ? r.points : r.carriedIn ? "carry" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1.5 text-[10px] text-[var(--muted)]">
            🐦 birdie · ↔ this number got flipped by the other team&apos;s birdie · ×N presses live
          </p>
        </div>
      )}
    </Card>
  );
}

// 7d — the post-round summary: a dark score header (gross / to par / net /
// placing), three headline stat tiles, written insight cards generated from
// the round's derived stats, a hole-by-hole color strip, and the Seed Index
// movement this round just caused. Appears once your card is complete.
function RoundSummary({ t, player }: { t: Tournament; player: Tournament["participants"][number] }) {
  const tournaments = useStore((s) => s.tournaments);
  const g = t.golf!;
  const scores = g.scores[player.id] ?? [];
  const entries = g.stats?.[player.id];
  const stats = roundStats(g.pars, scores, entries);
  const insights = roundInsights(g.pars, scores, entries);
  const rows = computeGolf(t, "stroke");
  const idx = rows.findIndex((r) => r.participantId === player.id);
  const me = rows[idx];
  if (!me) return null;
  const startAt = g.startHole ?? 1;

  // The handicap moving before your eyes: the Seed Index with and without
  // this round. (Rounds auto-save — nothing to press, just the receipt.)
  const after = seedIndexForPlayer(tournaments, player.name);
  const before = seedIndexForPlayer(
    tournaments.filter((x) => x.id !== t.id),
    player.name,
  );

  const pct = (hit: number, opps: number) => (opps > 0 ? `${Math.round((100 * hit) / opps)}%` : "—");
  const relColor = (rel: number) =>
    rel <= -2
      ? "border-[var(--win)] bg-[var(--win)] text-white"
      : rel === -1
        ? "border-[var(--win)] bg-[var(--win-bg)] text-[var(--win)]"
        : rel === 0
          ? "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
          : rel === 1
            ? "border-amber-400/60 bg-amber-400/15 text-amber-600"
            : "border-rose-400/60 bg-rose-400/15 text-rose-500";

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
      <div className="bg-gradient-to-br from-[var(--brand-strong)] to-[var(--brand)] px-4 py-3 text-[var(--on-brand)]">
        <div className="text-[10px] font-semibold uppercase tracking-wide opacity-75">
          Round complete{g.courseName ? ` — ${g.courseName}` : ""}
        </div>
        <div className="mt-1 flex items-end gap-5">
          <div>
            <div className="text-4xl font-extrabold tabular-nums leading-none">{me.gross}</div>
            <div className="text-[10px] uppercase tracking-wide opacity-75">gross</div>
          </div>
          <div>
            <div className="text-2xl font-extrabold tabular-nums leading-none">
              {formatToPar(me.toPar)}
            </div>
            <div className="text-[10px] uppercase tracking-wide opacity-75">to par</div>
          </div>
          <div>
            <div className="text-2xl font-extrabold tabular-nums leading-none">{me.net}</div>
            <div className="text-[10px] uppercase tracking-wide opacity-75">net</div>
          </div>
          {rows.length > 1 && (
            <div className="ml-auto text-right">
              <div className="text-2xl font-extrabold tabular-nums leading-none">
                {idx + 1}
                <span className="text-sm font-semibold opacity-80">/{rows.length}</span>
              </div>
              <div className="text-[10px] uppercase tracking-wide opacity-75">placing</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-[var(--border)] border-b border-[var(--border)] bg-[var(--surface)]/60 text-center">
        {(
          [
            ["Fairways", pct(stats.fairways.hit, stats.fairways.opps), stats.fairways.opps ? `${stats.fairways.hit}/${stats.fairways.opps}` : "no tee taps"],
            ["GIR", pct(stats.gir.hit, stats.gir.opps), stats.gir.opps ? `${stats.gir.hit}/${stats.gir.opps}` : "no putt taps"],
            [
              "Putts",
              stats.putts.holes ? `${stats.putts.total}` : "—",
              stats.putts.holes ? `${(stats.putts.total / stats.putts.holes).toFixed(1)}/hole` : "no putt taps",
            ],
          ] as const
        ).map(([label, big, sub]) => (
          <div key={label} className="px-2 py-2.5">
            <div className="text-lg font-extrabold tabular-nums leading-none">{big}</div>
            <div className="text-[9px] uppercase tracking-wide text-[var(--muted)]">{label}</div>
            <div className="text-[10px] text-[var(--muted)] tabular-nums">{sub}</div>
          </div>
        ))}
      </div>

      {insights.length > 0 && (
        <div className="space-y-1.5 border-b border-[var(--border)] bg-[var(--surface)]/60 px-4 py-3">
          {insights.map((line, i) => (
            <p key={i} className="text-xs leading-relaxed text-[var(--muted)]">
              <span className="mr-1.5 rounded bg-[var(--brand-soft)] px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[var(--brand)]">
                Insight
              </span>
              {line}
            </p>
          ))}
        </div>
      )}

      <div className="bg-[var(--surface)]/60 px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: g.holes }, (_, h) => {
            const s = scores[h];
            if (s == null) return null;
            const rel = s - g.pars[h];
            return (
              <span
                key={h}
                title={`Hole ${startAt + h}: ${s} (par ${g.pars[h]})`}
                className={`grid h-8 w-8 place-items-center rounded-md border text-xs font-bold tabular-nums ${relColor(rel)}`}
              >
                <span className="leading-none">
                  <span className="block text-[8px] font-medium opacity-70">{startAt + h}</span>
                  {s}
                </span>
              </span>
            );
          })}
        </div>
        <p className="mt-2.5 text-xs text-[var(--muted)]">
          ⛳ Saved to your rounds —{" "}
          {after.index != null ? (
            <>
              Seed Index{" "}
              <span className="font-semibold text-[var(--foreground)] tabular-nums">
                {before.index != null ? before.index.toFixed(1) : "—"} → {after.index.toFixed(1)}
              </span>
              {before.index != null && after.index < before.index && (
                <span className="text-[var(--win)]"> ▾ trending down</span>
              )}
            </>
          ) : after.pendingNine ? (
            <>this nine is banked — it pairs with your next nine for your Seed Index.</>
          ) : (
            <>
              counting toward your Seed Index ({after.differentials.length} of 3 rounds needed).
            </>
          )}
        </p>
      </div>
    </div>
  );
}

// 7c — the live group leaderboard: one board, four lenses. Net / Gross /
// Stableford / Skins all already exist in the golf lib — this surfaces them
// behind a segmented toggle without touching how the round is being played.
// Rows lead with the to-par number (or points/skins), carry hcp + thru, and
// show a movement caret when a position changed on the latest completed hole.
function LiveLeaderboard({ t }: { t: Tournament }) {
  const g = t.golf!;
  const played = t.config.golfMode;
  const [lens, setLens] = useState<"net" | "gross" | "stableford" | "skins">(
    played === "stableford" ? "stableford" : played === "skins" ? "skins" : "net",
  );
  const modeFor = lens === "stableford" ? "stableford" : lens === "skins" ? "skins" : "stroke";
  const grossSort = (list: ReturnType<typeof computeGolf>) =>
    [...list].sort(
      (a, b) =>
        (b.thru > 0 ? 1 : 0) - (a.thru > 0 ? 1 : 0) ||
        a.toPar - b.toPar ||
        a.gross - b.gross ||
        a.name.localeCompare(b.name),
    );
  let rows = computeGolf(t, modeFor);
  if (lens === "gross") rows = grossSort(rows);

  // Movement: rank now vs rank before the most recent completed hole.
  let maxHole = 0;
  for (const p of t.participants)
    for (let h = 0; h < g.holes; h++) if (g.scores[p.id]?.[h] != null) maxHole = Math.max(maxHole, h + 1);
  const prevRank = new Map<string, number>();
  if (maxHole > 1) {
    let prev = computeGolf(t, modeFor, { from: 1, to: maxHole - 1 });
    if (lens === "gross") prev = grossSort(prev);
    prev.forEach((r, i) => prevRank.set(r.participantId, i + 1));
  }

  // Per-hole skins outcomes (net, with carryover) for the strip.
  const strip: { hole: number; state: "win" | "carry" | "open"; who?: string; pot?: number }[] = [];
  {
    let pot = 1;
    let openFrom = g.holes;
    for (let h = 0; h < g.holes; h++) {
      const entries = t.participants.map((p) => {
        const s = g.scores[p.id]?.[h];
        return s == null
          ? null
          : s - holeStrokes(effectiveHandicap(g, p), g.strokeIndex[h], g.holes);
      });
      if (entries.some((v) => v == null)) {
        openFrom = h;
        break;
      }
      const min = Math.min(...(entries as number[]));
      const winners = t.participants.filter((_, i) => entries[i] === min);
      if (winners.length === 1) {
        strip.push({ hole: h, state: "win", who: winners[0].name, pot });
        pot = 1;
      } else {
        strip.push({ hole: h, state: "carry" });
        pot += 1;
      }
    }
    for (let h = openFrom; h < g.holes; h++) strip.push({ hole: h, state: "open" });
  }
  const startAt = g.startHole ?? 1;

  const netToPar = (r: (typeof rows)[number]) => r.net - (r.gross - r.toPar);
  const hero = (r: (typeof rows)[number]) =>
    lens === "net"
      ? formatToPar(netToPar(r))
      : lens === "gross"
        ? formatToPar(r.toPar)
        : lens === "stableford"
          ? `${r.stableford}`
          : `${r.skins}`;
  const heroGood = (r: (typeof rows)[number]) =>
    lens === "net" ? netToPar(r) < 0 : lens === "gross" ? r.toPar < 0 : true;
  const secondary = (r: (typeof rows)[number]) =>
    lens === "net"
      ? `net ${r.net}`
      : lens === "gross"
        ? `gross ${r.gross}`
        : lens === "stableford"
          ? `${formatToPar(netToPar(r))} net`
          : `net ${r.net}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5">
        <span className="text-sm font-bold">Live leaderboard</span>
        <div className="no-print inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5">
          {(
            [
              ["net", "Net"],
              ["gross", "Gross"],
              ["stableford", "Stbl"],
              ["skins", "Skins"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setLens(v)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                lens === v
                  ? "bg-[var(--brand)] text-[var(--on-brand)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <ul className="divide-y divide-[var(--border)]">
        {rows.map((r, i) => {
          const prev = prevRank.get(r.participantId);
          const moved = r.thru > 0 && prev != null ? prev - (i + 1) : 0;
          return (
            <li
              key={r.participantId}
              className={`flex items-center gap-3 px-4 py-2.5 ${i === 0 && r.thru > 0 ? "bg-[var(--win-bg)]" : ""}`}
            >
              <span className="w-5 text-center text-sm font-bold text-[var(--muted)] tabular-nums">
                {r.thru ? i + 1 : "–"}
              </span>
              <span className="w-3 text-center text-xs">
                {moved > 0 ? (
                  <span className="text-[var(--win)]">▲</span>
                ) : moved < 0 ? (
                  <span className="text-rose-400">▼</span>
                ) : (
                  ""
                )}
              </span>
              <Avatar
                name={r.name}
                color={colorFor(t.participants, r.participantId)}
                photo={photoFor(t.participants, r.participantId)}
                className="h-7 w-7 text-[10px]"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{r.name}</span>
                <span className="block text-[10px] text-[var(--muted)] tabular-nums">
                  {r.handicap > 0 ? `hcp ${r.handicap} · ` : ""}
                  {r.thru ? `thru ${r.thru}` : "not started"}
                </span>
              </span>
              {r.thru > 0 && (
                <span className="text-right">
                  <span
                    className={`block text-xl font-extrabold tabular-nums leading-none ${
                      heroGood(r) && (lens === "net" || lens === "gross")
                        ? "text-[var(--win)]"
                        : ""
                    }`}
                  >
                    {hero(r)}
                    {lens === "stableford" && (
                      <span className="ml-0.5 text-[10px] font-semibold text-[var(--muted)]">pts</span>
                    )}
                    {lens === "skins" && (
                      <span className="ml-0.5 text-[10px] font-semibold text-[var(--muted)]">
                        skin{r.skins === 1 ? "" : "s"}
                      </span>
                    )}
                  </span>
                  <span className="block text-[10px] text-[var(--muted)] tabular-nums">
                    {secondary(r)}
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {lens === "skins" && (
        <div className="border-t border-[var(--border)] px-4 py-2.5">
          <div className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]">
            Skins by hole — net, carries roll forward
          </div>
          <div className="flex flex-wrap gap-1">
            {strip.map((s) => (
              <span
                key={s.hole}
                title={
                  s.state === "win"
                    ? `Hole ${startAt + s.hole}: ${s.who}${(s.pot ?? 1) > 1 ? ` wins ${s.pot} skins` : ""}`
                    : s.state === "carry"
                      ? `Hole ${startAt + s.hole}: tied — carried`
                      : `Hole ${startAt + s.hole}: not finished`
                }
                className={`grid h-8 w-8 place-items-center rounded-md border text-[10px] font-bold ${
                  s.state === "win"
                    ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                    : s.state === "carry"
                      ? "border-amber-400/60 bg-amber-400/10 text-amber-500"
                      : "border-[var(--border)] text-[var(--muted)] opacity-60"
                }`}
              >
                <span className="leading-none">
                  <span className="block text-[8px] font-medium opacity-70">{startAt + s.hole}</span>
                  {s.state === "win"
                    ? (s.who ?? "?").slice(0, 2)
                    : s.state === "carry"
                      ? "↻"
                      : "·"}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 7b — the hole detail sheet: "YOU ENTER — 3 TAPS" against "SPOROS DERIVES —
// 0 TAPS", with the explicitly-optional club/distance row collapsed behind a
// dashed border. Top-level component (not inline) so its inputs keep focus.
function HoleDetail({
  par,
  si,
  holesCount,
  handicap,
  score,
  entry,
  onStat,
}: {
  par: number;
  si: number;
  holesCount: number;
  handicap: number;
  score: number | null;
  entry: import("@/lib/types").HoleEntry | null;
  onStat: (p: Partial<import("@/lib/types").HoleEntry>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [extras, setExtras] = useState(false);
  const [clubDraft, setClubDraft] = useState(entry?.club ?? "");
  const [driveDraft, setDriveDraft] = useState(entry?.driveYds != null ? String(entry.driveYds) : "");
  const d = deriveHole(par, score, entry);
  const received = holeStrokes(handicap, si, holesCount);
  const net = score != null ? score - received : null;
  const stbl = net != null ? Math.max(0, 2 + (par - net)) : null;

  const yesNo = (v: boolean | null, na: string) =>
    v == null ? (
      <span className="text-[var(--muted)]">— {na}</span>
    ) : v ? (
      <span className="font-semibold text-[var(--win)]">✓ yes</span>
    ) : (
      <span className="text-[var(--muted)]">✕ no</span>
    );
  const teeLabel =
    entry?.tee === "F"
      ? "Fairway"
      : entry?.tee === "L"
        ? "Missed left"
        : entry?.tee === "R"
          ? "Missed right"
          : "—";

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-[var(--brand)] hover:text-[var(--brand-strong)]"
      >
        {open ? "▾ Hide hole detail" : "▸ Hole detail"}
      </button>
      {open && (
        <div className="mt-2 space-y-3">
          <div>
            <div className="mb-1 text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]">
              You enter — 3 taps
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center text-sm">
              {(
                [
                  ["Score", score != null ? String(score) : "—"],
                  ["Putts", entry?.putts != null ? (entry.putts === 4 ? "4+" : String(entry.putts)) : "—"],
                  ["Tee", teeLabel],
                ] as const
              ).map(([label, v]) => (
                <div key={label} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5">
                  <div className="text-[9px] uppercase tracking-wide text-[var(--muted)]">{label}</div>
                  <div className="font-semibold tabular-nums">{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[9px] font-bold uppercase tracking-widest text-[var(--brand)]">
              Sporos derives — 0 taps
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-[var(--brand)]/30 bg-[var(--brand-soft)]/40 px-3 py-2 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-[var(--muted)]">GIR</span>
                {yesNo(d.gir, "enter putts")}
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[var(--muted)]">Shots to green</span>
                <span className="font-semibold tabular-nums">{d.approach ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[var(--muted)]">Up &amp; down</span>
                {yesNo(d.upAndDown, d.gir ? "green hit" : "enter putts")}
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[var(--muted)]">Scrambling</span>
                {yesNo(d.scramble, d.gir ? "green hit" : "enter putts")}
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[var(--muted)]">Sand save</span>
                {yesNo(d.sandSave, "no bunker")}
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[var(--muted)]">Net · Stbl</span>
                <span className="font-semibold tabular-nums">
                  {net != null ? `${net} · ${stbl} pt${stbl === 1 ? "" : "s"}` : "—"}
                </span>
              </div>
            </div>
          </div>
          {/* Optional extras — never part of the 3-tap floor */}
          {!extras ? (
            <button
              type="button"
              onClick={() => setExtras(true)}
              className="w-full rounded-lg border border-dashed border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--hover)]"
            >
              + Club &amp; tee-shot distance (optional)
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-xs">
              <label className="flex items-center gap-1.5">
                <span className="text-[var(--muted)]">Club</span>
                <input
                  value={clubDraft}
                  onChange={(e) => setClubDraft(e.target.value)}
                  onBlur={() => onStat({ club: clubDraft.trim() || null })}
                  placeholder="Driver"
                  className="w-20 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
                />
              </label>
              <label className="flex items-center gap-1.5">
                <span className="text-[var(--muted)]">Drive</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={driveDraft}
                  onChange={(e) => setDriveDraft(e.target.value)}
                  onBlur={() =>
                    onStat({ driveYds: driveDraft === "" ? null : Math.max(0, Number(driveDraft) || 0) })
                  }
                  placeholder="—"
                  className="w-16 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-center tabular-nums"
                />
                <span className="text-[var(--muted)]">yds</span>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function GolfView({ t }: { t: Tournament }) {
  const patch = useStore((s) => s.patchTournament);
  const setGolfScore = useStore((s) => s.setGolfScore);
  const setVegasPairing = useStore((s) => s.setVegasPairing);
  const setGolfPin = useStore((s) => s.setGolfPin);
  const setGolfGreens = useStore((s) => s.setGolfGreens);
  const setGolfHoleStat = useStore((s) => s.setGolfHoleStat);
  const [hole, setHole] = useState(0);
  const [showCard, setShowCard] = useState(true);
  const [gpsOpen, setGpsOpen] = useState(false);
  // "You" on the hole screen — the profile owner's row gets the big stepper
  // and the three-tap stat rows; everyone else stays compact.
  const [profileName, setProfileName] = useState("");
  useEffect(() => setProfileName(getProfile().name.trim()), []);
  const g = t.golf;
  if (!g) return null;

  if (t.config.golfMode === "bingo") return <BbbView t={t} />;
  if (t.config.golfMode === "wolf") return <WolfView t={t} />;
  if (t.config.golfMode === "mixed") return <MixedGolfView t={t} />;

  // Team-row games: each participant row is a team/pair, locked to their own view.
  const isScramble = ["scramble", "bestball", "shamble", "vegas"].includes(t.config.golfMode);
  const mode: GolfMode = isScramble
    ? t.config.golfMode
    : SWITCHABLE.includes(t.config.golfMode)
      ? t.config.golfMode
      : "stroke";
  // Vegas comes in two shapes. The full 4-man game needs each player's own ball —
  // a flip can only be spotted from individual scores — so it takes four players and
  // per-player entry. Rounds built the old way (one pre-combined number per pair)
  // keep their pair card and their leaderboard.
  const vegasRules: VegasRules = { ...VEGAS_DEFAULTS, ...(t.config.vegasRules ?? {}) };
  const vegasLedger =
    mode === "vegas" && vegasIsPerPlayer(t) ? computeVegasLedger(t, vegasRules) : null;
  const isVegasPairCard = mode === "vegas" && !vegasLedger;
  const isVegas = isVegasPairCard;
  const strokeLike = mode === "stroke" || (isScramble && !isVegasPairCard);
  const isNassau = mode === "nassau";

  // How this card is READ, independent of how it is played. Team games used to be
  // locked to stroke play — a Best Ball round had no way to be settled as a match or
  // on Stableford points without re-entering the whole card under another format.
  const scoringChoices = golfScoringOptions(t);
  const scoring: GolfScoring = scoringChoices.includes(t.config.golfScoring as GolfScoring)
    ? (t.config.golfScoring as GolfScoring)
    : "stroke";
  const teamScoring = isScramble && mode !== "vegas";
  const golfMatch = scoring === "match" ? computeGolfMatch(t) : null;
  // Disc golf is scored exactly like golf but has its own vocabulary — swap the
  // player-facing words (labels only; all scoring math is unchanged).
  const isDisc = /disc\s*golf/i.test(t.sport);
  const shot = isDisc ? "throw" : "stroke";
  const shots = isDisc ? "throws" : "strokes";
  const modeBlurb =
    isDisc && mode === "stroke"
      ? "Count every throw — lowest net total wins. Standard disc golf."
      : GOLF_MODE_BLURBS[mode];
  const rows = computeGolf(t, teamScoring && scoring !== "match" ? scoring : mode);
  const started = rows.filter((r) => r.thru > 0);
  const minFront = started.length ? Math.min(...started.map((r) => r.frontNet)) : 0;
  const minBack = started.length ? Math.min(...started.map((r) => r.backNet)) : 0;
  const minTotal = started.length ? Math.min(...started.map((r) => r.net)) : 0;
  const seg = (v: number, best: number, on: boolean) =>
    `px-2 py-2 text-center tabular-nums font-bold ${on && v === best ? "text-[var(--win)]" : ""}`;
  const holes = Array.from({ length: g.holes }, (_, i) => i);
  const totalPar = g.pars.reduce((a, b) => a + b, 0);
  const startHole = g.startHole ?? 1; // 10 for a back-9 round, else 1
  const holeNo = (i: number) => startHole + i; // display hole number

  return (
    <div className="space-y-5">
      {isScramble ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--brand-soft)] px-3.5 py-1.5 text-sm font-semibold text-[var(--brand)]">
            {GOLF_MODE_LABELS[mode]}
          </div>
          {scoringChoices.length > 1 && (
            <div className="no-print inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
              {scoringChoices.map((v) => (
                <button
                  key={v}
                  onClick={() => patch(t.id, { config: { ...t.config, golfScoring: v } })}
                  title={GOLF_SCORING_LABELS[v].hint}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    scoring === v
                      ? "bg-gradient-to-r from-[var(--brand)] to-[var(--brand-strong)] text-[var(--on-brand)]"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {GOLF_SCORING_LABELS[v].label}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="no-print inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
          {SWITCHABLE.map((m) => (
            <button
              key={m}
              onClick={() => patch(t.id, { config: { ...t.config, golfMode: m } })}
              className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                mode === m
                  ? "bg-gradient-to-r from-[var(--brand)] to-[var(--brand-strong)] text-[var(--on-brand)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {GOLF_MODE_LABELS[m]}
            </button>
          ))}
        </div>
      )}

      {golfMatch && (
        <Card className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-center min-w-0">
              <div className="text-sm font-semibold text-[var(--brand)] truncate">
                {golfMatch.a.name}
              </div>
              <div className="text-3xl font-extrabold tabular-nums">{golfMatch.upA}</div>
            </div>
            <div className="text-center shrink-0">
              <div className="text-[10px] uppercase tracking-widest text-[var(--muted)] font-bold">
                holes won
              </div>
              <div className="text-xs text-[var(--muted)]">
                {golfMatch.halved} halved
              </div>
            </div>
            <div className="flex-1 text-center min-w-0">
              <div className="text-sm font-semibold text-rose-300 truncate">{golfMatch.b.name}</div>
              <div className="text-3xl font-extrabold tabular-nums">{golfMatch.upB}</div>
            </div>
          </div>
          <p className="mt-2 text-center text-sm font-bold">{golfMatch.text}</p>
          {/* Hole-by-hole ribbon: who took each hole, at a glance. */}
          <div className="mt-2.5 flex gap-0.5 overflow-x-auto">
            {golfMatch.holeWinners.map((w, i) => (
              <div key={i} className="flex-1 min-w-[14px] text-center">
                <div
                  className={`h-1.5 rounded-full ${
                    w === "A" ? "bg-[var(--brand)]" : w === "B" ? "bg-rose-400" : "bg-[var(--border)]"
                  }`}
                />
                <div className="mt-0.5 text-[9px] text-[var(--muted)] tabular-nums">
                  {holeNo(i)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {vegasLedger && <VegasRulesPanel t={t} rules={vegasRules} />}
      {vegasLedger && (
        <VegasLedgerView ledger={vegasLedger} rules={vegasRules} startHole={g.startHole ?? 1} />
      )}

      <p className="no-print -mt-2 text-xs text-[var(--muted)] leading-relaxed max-w-prose">
        <span className="font-semibold text-[var(--foreground)]">{GOLF_MODE_LABELS[mode]}</span> —{" "}
        {modeBlurb}{" "}
        <span className="opacity-80">
          {vegasLedger
            ? `Everyone enters their own ${shots} — the pair's number is combined for you.`
            : isVegasPairCard
            ? "Type each pair's combined number per hole — low ball first (4 & 5 → 45)."
            : isScramble
              ? "One score per team per hole."
              : `Enter each player's ${shots} once; all four scoring views track live from the same card — switch tabs anytime.`}
        </span>
      </p>

      {/* Hole-by-hole entry */}
      {(() => {
        const h = Math.min(hole, g.holes - 1);
        const adj = (pid: string, delta: number) => {
          const cur = g.scores[pid]?.[h];
          // Vegas cards hold the pair's combined number, so a fresh hole starts
          // at par-par (par 4 → 44) instead of a single ball's par.
          const start = isVegas ? g.pars[h] * 11 : g.pars[h];
          const next = cur === null || cur === undefined ? start : Math.max(1, cur + delta);
          setGolfScore(t.id, pid, h, next);
        };
        // Team-row cards (scramble/pairs/Vegas pair card) have no personal stats;
        // per-player cards promote "you" to the hero block with the 3-tap rows.
        const teamRows = isScramble && !vegasLedger;
        const heroP = teamRows
          ? null
          : (t.participants.find(
              (p) => p.name.trim().toLowerCase() === profileName.toLowerCase() && profileName,
            ) ?? t.participants[0] ?? null);
        const heroScore = heroP ? (g.scores[heroP.id]?.[h] ?? null) : null;
        const heroEntry = heroP ? (g.stats?.[heroP.id]?.[h] ?? null) : null;
        const auto = heroP ? autoSummary(g.pars[h], heroScore, heroEntry) : null;
        const heroRel = heroScore != null && !isVegas ? heroScore - g.pars[h] : null;
        // Sticky running line: holes entered and gross to par, for the hero.
        let thru = 0;
        let runPar = 0;
        if (heroP) {
          for (let i = 0; i < g.holes; i++) {
            const s = g.scores[heroP.id]?.[i];
            if (s != null) {
              thru++;
              runPar += s - g.pars[i];
            }
          }
        }
        const stat = (patchEntry: Partial<import("@/lib/types").HoleEntry>) =>
          heroP && setGolfHoleStat(t.id, heroP.id, h, patchEntry);
        const myCardComplete =
          !!heroP && holes.every((i) => g.scores[heroP.id]?.[i] != null);
        return (
          <>
          {heroP && myCardComplete && <RoundSummary t={t} player={heroP} />}
          <Card className="p-4">
            <GpsBand
              holeNo={holeNo(h)}
              par={g.pars[h]}
              si={g.strokeIndex[h]}
              green={g.greens?.[h] ?? null}
              pin={g.pins?.[h] ?? null}
              mapOpen={gpsOpen}
              onToggleMap={() => setGpsOpen((o) => !o)}
            />
            <div className="mt-3 flex items-center justify-between">
              <Button
                variant="outline"
                className="px-3 py-1.5"
                disabled={h === 0}
                onClick={() => setHole(h - 1)}
              >
                ‹ Prev
              </Button>
              <div className="text-center">
                <div className="text-xs text-[var(--muted)]">
                  {g.courseName ? `${g.courseName} · ` : ""}Hole {holeNo(h)}
                  {startHole > 1 ? "" : ` of ${g.holes}`}
                </div>
                <div className="text-lg font-bold">
                  Par {g.pars[h]} <span className="text-[var(--muted)] font-normal text-sm">· SI {g.strokeIndex[h]}</span>
                </div>
              </div>
              <Button
                variant="outline"
                className="px-3 py-1.5"
                disabled={h >= g.holes - 1}
                onClick={() => setHole(h + 1)}
              >
                Next ›
              </Button>
            </div>
            {/* Hole-progress dots — filled as holes are scored; tap to jump to a hole. */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
              {holes.map((hi) => {
                const scored = t.participants.filter((p) => g.scores[p.id]?.[hi] != null).length;
                const done = t.participants.length > 0 && scored === t.participants.length;
                const partial = scored > 0 && !done;
                const cur = hi === h;
                return (
                  <button
                    key={hi}
                    type="button"
                    onClick={() => setHole(hi)}
                    title={`Hole ${holeNo(hi)}`}
                    aria-label={`Go to hole ${holeNo(hi)}`}
                    className={`h-2.5 w-2.5 rounded-full transition ${
                      cur
                        ? "scale-150 bg-[var(--brand)]"
                        : done
                          ? "bg-[var(--brand)]"
                          : partial
                            ? "bg-[var(--brand)]/40"
                            : "bg-[var(--border)] hover:bg-[var(--muted)]"
                    }`}
                  />
                );
              })}
            </div>
            {vegasLedger && vegasRules.teams === "byHole" && t.participants.length === 4 && (
              <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--subtle)] px-3 py-2">
                <p className="mb-1.5 text-xs text-[var(--muted)]">
                  Partners from this hole on — tap who joins{" "}
                  <span className="font-semibold text-[var(--foreground)]">
                    {t.participants[0].name.split(" ")[0]}
                  </span>{" "}
                  (tee shots decide):
                </p>
                <div className="flex flex-wrap gap-2">
                  {([0, 1, 2] as const).map((c) => {
                    const first = t.participants[0].name.split(" ")[0];
                    const mate = t.participants[c + 1].name.split(" ")[0];
                    // The pairing in force on this hole (picks carry forward).
                    let eff = 0;
                    for (let i = 0; i <= h; i++) {
                      const pv = g.vegasPairs?.[i];
                      if (pv != null) eff = pv;
                    }
                    const pickedHere = g.vegasPairs?.[h] === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setVegasPairing(t.id, h, pickedHere ? null : c)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                          eff === c
                            ? "border-[var(--brand)] ring-1 ring-[var(--brand)] bg-[var(--brand-soft)]"
                            : "border-[var(--border)] hover:bg-[var(--hover)]"
                        }`}
                      >
                        {first} &amp; {mate}
                        {eff === c && g.vegasPairs?.[h] == null ? " (carried)" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {/* You — the 54px score, 56px steppers, and the three-tap rows */}
            {heroP && (
              <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--subtle)] p-3">
                <div className="flex items-center justify-center gap-5">
                  <button
                    onClick={() => adj(heroP.id, -1)}
                    aria-label={`Minus one for ${heroP.name}`}
                    className="grid h-14 w-14 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-3xl font-bold text-[var(--muted)] transition hover:bg-[var(--hover)]"
                  >
                    −
                  </button>
                  <div className="w-24 text-center">
                    <div className="text-[54px] font-extrabold tabular-nums leading-none">
                      {heroScore ?? "–"}
                    </div>
                    <div
                      className={`mt-1 text-xs font-semibold ${
                        heroRel != null && heroRel < 0
                          ? "text-[var(--win)]"
                          : "text-[var(--muted)]"
                      }`}
                    >
                      {heroRel == null
                        ? `Par ${g.pars[h]}`
                        : heroRel === 0
                          ? "Even with par"
                          : heroRel > 0
                            ? `+${heroRel} on the hole`
                            : `${heroRel} — nice`}
                    </div>
                  </div>
                  <button
                    onClick={() => adj(heroP.id, 1)}
                    aria-label={`Plus one for ${heroP.name}`}
                    className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--brand)] text-3xl font-bold text-[var(--on-brand)] transition hover:opacity-90"
                  >
                    +
                  </button>
                </div>
                {/* The other two taps — everything else derives from these */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="w-12 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Putts
                  </span>
                  <div className="flex flex-1 gap-1.5">
                    {[0, 1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => stat({ putts: heroEntry?.putts === n ? null : n })}
                        className={`h-9 flex-1 rounded-lg border text-sm font-semibold tabular-nums transition ${
                          heroEntry?.putts === n
                            ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                            : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--hover)]"
                        }`}
                      >
                        {n === 4 ? "4+" : n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="w-12 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Tee
                  </span>
                  <div className="flex flex-1 gap-1.5">
                    {(
                      [
                        ["L", "◀ L"],
                        ["F", "Fairway"],
                        ["R", "R ▶"],
                      ] as const
                    ).map(([v, label]) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => stat({ tee: heroEntry?.tee === v ? null : v })}
                        className={`h-9 flex-1 rounded-lg border text-sm font-semibold transition ${
                          heroEntry?.tee === v
                            ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                            : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--hover)]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => stat({ bunker: !heroEntry?.bunker })}
                      title="Greenside bunker on this hole"
                      className={`h-9 w-14 shrink-0 rounded-lg border text-sm transition ${
                        heroEntry?.bunker
                          ? "border-amber-400 bg-amber-400/15 text-amber-500"
                          : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--hover)]"
                      }`}
                    >
                      ⛱ Sand
                    </button>
                  </div>
                </div>
                {auto && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--surface)] px-2.5 py-1.5">
                    <span className="rounded bg-[var(--brand-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--brand)]">
                      Auto
                    </span>
                    <span className="text-xs text-[var(--muted)]">{auto}</span>
                  </div>
                )}
                <HoleDetail
                  key={`${heroP.id}-${h}`}
                  par={g.pars[h]}
                  si={g.strokeIndex[h]}
                  holesCount={g.holes}
                  handicap={effectiveHandicap(g, heroP)}
                  score={heroScore}
                  entry={heroEntry}
                  onStat={stat}
                />
              </div>
            )}

            <div className="mt-3 space-y-2">
              {t.participants
                .filter((p) => p.id !== heroP?.id)
                .map((p) => {
                const v = g.scores[p.id]?.[h];
                const rel = v != null && !isVegas ? v - g.pars[h] : null;
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg bg-[var(--subtle)] px-3 py-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <Avatar name={p.name} color={colorFor(t.participants, p.id)} photo={photoFor(t.participants, p.id)} className="h-6 w-6 text-[10px]" />
                      <span className="truncate">{p.name}</span>
                      {effectiveHandicap(g, p) > 0 && (
                        <span className="text-xs text-[var(--muted)]">({effectiveHandicap(g, p)})</span>
                      )}
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      {rel != null && (
                        <span className={`text-xs w-8 text-right ${rel < 0 ? "text-[var(--win)]" : rel > 0 ? "text-[var(--muted)]" : ""}`}>
                          {rel === 0 ? "E" : rel > 0 ? `+${rel}` : rel}
                        </span>
                      )}
                      <button
                        onClick={() => adj(p.id, -1)}
                        aria-label={`Minus one for ${p.name}`}
                        className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--border)] text-2xl font-bold text-[var(--muted)] transition hover:bg-[var(--hover)]"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={v ?? ""}
                        onChange={(e) => setGolfScore(t.id, p.id, h, e.target.value === "" ? null : Number(e.target.value))}
                        placeholder="–"
                        className="w-14 rounded-xl border border-[var(--border)] bg-[var(--input)] py-1.5 text-center text-2xl font-extrabold tabular-nums outline-none focus:border-[var(--brand)]"
                      />
                      <button
                        onClick={() => adj(p.id, 1)}
                        aria-label={`Plus one for ${p.name}`}
                        className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--brand)] text-2xl font-bold text-[var(--on-brand)] transition hover:opacity-90"
                      >
                        +
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Full aerial — expanded from the band's Map button */}
            {gpsOpen && (
              <div className="mt-3 border-t border-[var(--border)] pt-3">
                <GolfGps
                  key={h}
                  pin={g.pins?.[h] ?? null}
                  onSetPin={(c) => setGolfPin(t.id, h, c)}
                  holes={g.holes}
                  startHole={startHole}
                  onSetAllPins={(pins) => pins.forEach((c, i) => c && setGolfPin(t.id, i, c))}
                  green={g.greens?.[h] ?? null}
                  onSetAllGreens={(greens) => setGolfGreens(t.id, greens)}
                />
              </div>
            )}
          </Card>

          {/* Sticky running total + next hole, floating above the bottom nav */}
          {heroP && (
            <div className="no-print sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]/95 px-4 py-2.5 shadow-lg backdrop-blur">
              <span className="text-sm font-semibold tabular-nums">
                {thru === 0 ? "Round not started" : `Thru ${thru} · ${formatToPar(runPar)}`}
              </span>
              <Button
                className="px-4 py-2"
                disabled={h >= g.holes - 1}
                onClick={() => {
                  setHole(h + 1);
                  window.scrollTo(0, 0);
                }}
              >
                Next hole →
              </Button>
            </div>
          )}
          </>
        );
      })()}

      {/* Leaderboard — 7c live board (four lenses) for per-player rounds; team
          and Vegas cards keep their own tables, and Nassau keeps its totals. */}
      {!isVegas && !isScramble && <LiveLeaderboard t={t} />}
      {(isVegas || isScramble || isNassau) && (
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60">
        <div className="px-4 py-2.5 border-b border-[var(--border)] font-bold text-sm">
          {isNassau && !isScramble ? "Nassau totals" : `${GOLF_MODE_LABELS[mode]} · Leaderboard`}
        </div>
        {isVegas ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--muted)] border-b border-[var(--border)] bg-[var(--subtle)]">
                <th className="px-3 py-2 w-10">#</th>
                <th className="px-3 py-2">Pair</th>
                <th className="px-2 py-2 text-center w-14">Thru</th>
                <th className="px-2 py-2 text-center w-16">Points</th>
              </tr>
            </thead>
            <tbody>
              {computeVegas(t).map((r, i) => (
                <tr
                  key={r.participantId}
                  className={`border-b border-[var(--border)] last:border-0 ${i === 0 && r.points > 0 ? "bg-[var(--win-bg)]" : ""}`}
                >
                  <td className="px-3 py-2 font-bold text-[var(--muted)]">{r.thru ? i + 1 : "–"}</td>
                  <td className="px-3 py-2 font-medium">
                    <span className="flex items-center gap-2.5">
                      <Avatar
                        name={r.name}
                        color={colorFor(t.participants, r.participantId)}
                        photo={photoFor(t.participants, r.participantId)}
                      />
                      <span>
                        {r.name}
                        {r.opponent && (
                          <span className="block text-xs text-[var(--muted)]">vs {r.opponent}</span>
                        )}
                      </span>
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center tabular-nums">{r.thru ? r.thru : "–"}</td>
                  <td className="px-2 py-2 text-center tabular-nums font-bold">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--muted)] border-b border-[var(--border)] bg-[var(--subtle)]">
              <th className="px-3 py-2 w-10">#</th>
              <th className="px-3 py-2">Player</th>
              <th className="px-2 py-2 text-center w-14">Thru</th>
              {strokeLike && <th className="px-2 py-2 text-center w-16 whitespace-nowrap">To Par</th>}
              {mode === "stableford" && <th className="px-2 py-2 text-center w-16">Points</th>}
              {mode === "skins" && <th className="px-2 py-2 text-center w-14">Skins</th>}
              {isNassau && (
                <>
                  <th className="px-2 py-2 text-center w-14">Front</th>
                  <th className="px-2 py-2 text-center w-14">Back</th>
                  <th className="px-2 py-2 text-center w-14">Total</th>
                </>
              )}
              {!isNassau && <th className="px-2 py-2 text-center w-16">Gross</th>}
              {strokeLike && <th className="px-2 py-2 text-center w-14">Net</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.participantId} className={`border-b border-[var(--border)] last:border-0 ${i === 0 ? "bg-[var(--win-bg)]" : ""}`}>
                <td className="px-3 py-2 font-bold text-[var(--muted)]">{r.thru ? i + 1 : "–"}</td>
                <td className="px-3 py-2 font-medium">
                  <span className="flex items-center gap-2.5">
                    <Avatar name={r.name} color={colorFor(t.participants, r.participantId)} photo={photoFor(t.participants, r.participantId)} />
                    {r.name}
                    {r.handicap > 0 && <span className="text-xs text-[var(--muted)]">({r.handicap})</span>}
                  </span>
                </td>
                <td className="px-2 py-2 text-center tabular-nums">{r.thru ? `${r.thru}` : "–"}</td>
                {strokeLike && (
                  <td
                    className={`px-2 py-2 text-center tabular-nums font-bold ${
                      r.thru ? (r.toPar < 0 ? "text-[var(--win)]" : r.toPar > 0 ? "text-[var(--muted)]" : "") : ""
                    }`}
                  >
                    {r.thru ? formatToPar(r.toPar) : "–"}
                  </td>
                )}
                {mode === "stableford" && (
                  <td className="px-2 py-2 text-center tabular-nums font-bold">{r.stableford}</td>
                )}
                {mode === "skins" && (
                  <td className="px-2 py-2 text-center tabular-nums font-bold">{r.skins}</td>
                )}
                {isNassau && (
                  <>
                    <td className={seg(r.frontNet, minFront, r.thru > 0)}>{r.thru ? r.frontNet : "–"}</td>
                    <td className={seg(r.backNet, minBack, r.thru > 9)}>{r.thru > 9 ? r.backNet : "–"}</td>
                    <td className={seg(r.net, minTotal, r.thru > 0)}>{r.thru ? r.net : "–"}</td>
                  </>
                )}
                {!isNassau && (
                  <td className="px-2 py-2 text-center tabular-nums">{r.thru ? r.gross : "–"}</td>
                )}
                {strokeLike && (
                  <td className="px-2 py-2 text-center tabular-nums">{r.thru ? r.net : "–"}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
      )}

      {/* Full scorecard (toggle) */}
      <button
        onClick={() => setShowCard((v) => !v)}
        className="text-sm text-[var(--brand)] hover:text-[var(--brand-strong)]"
      >
        {showCard ? "▾ Hide" : "▸ Show"} full scorecard
      </button>
      {showCard && (
      <Card className="p-3 overflow-x-auto">
        <table className="text-sm border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-[var(--surface)] px-2 py-1.5 text-left text-xs text-[var(--muted)]">
                Hole
              </th>
              {holes.map((h) => (
                <th key={h} className="px-1 py-1.5 text-center w-9 text-xs text-[var(--muted)]">
                  {holeNo(h)}
                </th>
              ))}
              <th className="px-2 py-1.5 text-center text-xs text-[var(--muted)]">Tot</th>
            </tr>
            <tr>
              <th className="sticky left-0 z-10 bg-[var(--surface)] px-2 py-1 text-left text-xs font-normal text-[var(--muted)]">
                Par
              </th>
              {holes.map((h) => (
                <th key={h} className="px-1 py-1 text-center text-xs font-normal text-[var(--muted)]">
                  {g.pars[h]}
                </th>
              ))}
              <th className="px-2 py-1 text-center text-xs font-normal text-[var(--muted)]">{totalPar}</th>
            </tr>
            <tr>
              <th className="sticky left-0 z-10 bg-[var(--surface)] px-2 py-1 text-left text-xs font-normal text-[var(--muted)]">
                Hcp
              </th>
              {holes.map((h) => (
                <th key={h} className="px-1 py-1 text-center text-[10px] font-normal text-[var(--muted)]/70">
                  {g.strokeIndex[h]}
                </th>
              ))}
              <th className="px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {t.participants.map((p) => {
              const card = g.scores[p.id] ?? [];
              const tot = card.reduce<number>((a, s) => a + (s ?? 0), 0);
              return (
                <tr key={p.id}>
                  <td className="sticky left-0 z-10 bg-[var(--surface)] px-2 py-1 font-medium whitespace-nowrap border-t border-[var(--border)]">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: colorFor(t.participants, p.id) }}
                      />
                      {p.name}
                    </span>
                  </td>
                  {holes.map((h) => (
                    <td key={h} className="px-0.5 py-1 align-bottom text-center border-t border-[var(--border)]">
                      <StrokeDots n={holeStrokes(effectiveHandicap(g, p), g.strokeIndex[h], g.holes)} />
                      <input
                        type="number"
                        inputMode="numeric"
                        value={card[h] ?? ""}
                        onChange={(e) =>
                          setGolfScore(t.id, p.id, h, e.target.value === "" ? null : Number(e.target.value))
                        }
                        className="mt-0.5 w-8 rounded border border-[var(--border)] bg-[var(--input)] px-0.5 py-1 text-center text-sm tabular-nums outline-none focus:border-[var(--brand)]"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1 text-center font-bold tabular-nums border-t border-[var(--border)]">
                    {tot || "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2 px-1 text-[10px] text-[var(--muted)] flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> = a handicap {shot} on that hole
        </p>
      </Card>
      )}
    </div>
  );
}
