"use client";

import { useState } from "react";
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
import { Button, Card } from "./ui";
import { Avatar } from "./Avatar";
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

export function GolfView({ t }: { t: Tournament }) {
  const patch = useStore((s) => s.patchTournament);
  const setGolfScore = useStore((s) => s.setGolfScore);
  const setVegasPairing = useStore((s) => s.setVegasPairing);
  const setGolfPin = useStore((s) => s.setGolfPin);
  const [hole, setHole] = useState(0);
  const [showCard, setShowCard] = useState(true);
  const [gpsOpen, setGpsOpen] = useState(false);
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
        return (
          <Card className="p-4">
            <div className="flex items-center justify-between">
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
            <div className="mt-3 space-y-2">
              {t.participants.map((p) => {
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

            {/* GPS / yardage — aerial of the hole with live distance to the pin */}
            <div className="mt-3 border-t border-[var(--border)] pt-3">
              <button
                type="button"
                onClick={() => setGpsOpen((o) => !o)}
                className="flex w-full items-center justify-between text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <span>📍 GPS · yards to pin</span>
                <span className="text-xs">{gpsOpen ? "Hide" : "Show"}</span>
              </button>
              {gpsOpen && (
                <div className="mt-3">
                  <GolfGps
                    key={h}
                    pin={g.pins?.[h] ?? null}
                    onSetPin={(c) => setGolfPin(t.id, h, c)}
                    holes={g.holes}
                    startHole={startHole}
                    onSetAllPins={(pins) => pins.forEach((c, i) => c && setGolfPin(t.id, i, c))}
                  />
                </div>
              )}
            </div>
          </Card>
        );
      })()}

      {/* Leaderboard */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60">
        <div className="px-4 py-2.5 border-b border-[var(--border)] font-bold text-sm">
          {GOLF_MODE_LABELS[mode]} · Leaderboard
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
