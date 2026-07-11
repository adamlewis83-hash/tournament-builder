"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import {
  ALL_FORMATS,
  Format,
  FORMAT_BLURBS,
  FORMAT_LABELS,
  formatsForSport,
  PlayStyle,
  PLAYSTYLE_LABELS,
  playStylesForFormat,
  SPORTS,
} from "@/lib/types";
import { Button } from "./ui";
import {
  Trophy,
  Crown,
  IconRoundRobin,
  IconSwiss,
  IconSingleElim,
  IconDoubleElim,
  IconPools,
  IconAmericano,
  IconMexicano,
  IconRyder,
  IconGolf,
  IconCustom,
  IconScore,
  IconLadder,
} from "./icons";

const STYLE_HINTS: Partial<Record<PlayStyle, string>> = {
  doubles: "Individuals enter; partners rotate each round and standings track per person — great for pickleball/tennis socials.",
  "doubles-fixed": "Set pairs that stay together all event (e.g. Player 1 & Player 2). Each pair competes as one.",
  teams: "Build teams with 2+ players each (e.g. volleyball). Each team competes as one unit.",
};
const OTHER = "__other__";
const TEAM_SPORTS = new Set(["Flag Football", "Soccer", "Basketball", "Volleyball", "Spikeball"]);

const FORMAT_ICON: Record<Format, typeof Trophy> = {
  "round-robin": IconRoundRobin,
  swiss: IconSwiss,
  kotc: Crown,
  "single-elim": IconSingleElim,
  "double-elim": IconDoubleElim,
  "pool-bracket": IconPools,
  americano: IconAmericano,
  mexicano: IconMexicano,
  ryder: IconRyder,
  golf: IconGolf,
  custom: IconCustom,
  "score-challenge": IconScore,
  ladder: IconLadder,
};

function StepHeader({ n, title }: { n: number; title: string }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-xs font-bold text-[var(--on-brand)]">
        {n}
      </span>
      <span className="text-sm font-semibold">{title}</span>
    </div>
  );
}

export function CreateTournamentForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const createTournament = useStore((s) => s.createTournament);
  const [name, setName] = useState("");
  const [sportChoice, setSportChoice] = useState<string>("Golf");
  const [customSport, setCustomSport] = useState("");
  const [format, setFormat] = useState<Format>("round-robin");
  const [playStyle, setPlayStyle] = useState<PlayStyle>("doubles");

  const sport =
    sportChoice === OTHER ? customSport.trim() || "Custom Tournament" : sportChoice;
  const available = sportChoice === OTHER ? ALL_FORMATS : formatsForSport(sport);
  const styleOptions = playStylesForFormat(format);

  // Keep the play style valid for the chosen format (e.g. switching to King of
  // the Court drops "rotating doubles", which it can't honor). Adjusting state
  // during render is the React-recommended way to react to a derived change.
  if (styleOptions.length && !styleOptions.includes(playStyle)) setPlayStyle(styleOptions[0]);

  // Keep the selected format valid for the chosen sport.
  useEffect(() => {
    const avail = sportChoice === OTHER ? ALL_FORMATS : formatsForSport(sport);
    if (!avail.includes(format)) setFormat(avail[0]);
  }, [sportChoice, sport, format]);

  // Team sports default to the Teams play style (with rosters).
  useEffect(() => {
    if (TEAM_SPORTS.has(sport)) setPlayStyle("teams");
  }, [sport]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = createTournament({ name, sport, format, playStyle });
    onDone?.();
    router.push(`/t/${id}`);
  }

  const FormatBlurb = FORMAT_ICON[format] ?? Trophy;

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Step 1 — name & sport */}
      <section>
        <StepHeader n={1} title="Name & sport" />
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tournament name — e.g. Saturday Pickleball"
              className="w-full rounded-lg border px-3 py-2 text-sm bg-[var(--surface)]"
            />
          </label>
          <label className="block">
            <select
              value={sportChoice}
              onChange={(e) => setSportChoice(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm bg-[var(--surface)]"
            >
              {SPORTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value={OTHER}>Other / custom…</option>
            </select>
            {sportChoice === OTHER && (
              <input
                autoFocus
                value={customSport}
                onChange={(e) => setCustomSport(e.target.value)}
                placeholder="e.g. Mario Kart, Chili Cook-off, Office Bracket"
                className="mt-2 w-full rounded-lg border px-3 py-2 text-sm bg-[var(--surface)]"
              />
            )}
          </label>
        </div>
      </section>

      {/* Step 2 — format (icon+label tiles + one blurb strip) */}
      <section>
        <StepHeader n={2} title="Format" />
        <div className="grid grid-cols-2 gap-2">
          {available.map((f) => {
            const Icon = FORMAT_ICON[f] ?? Trophy;
            const on = format === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition ${
                  on
                    ? "border-[var(--brand)] ring-1 ring-[var(--brand)] bg-[var(--brand-soft)]"
                    : "border-[var(--border)] hover:bg-[var(--hover)]"
                }`}
              >
                <Icon
                  className={`h-6 w-6 shrink-0 ${on ? "text-[var(--brand)]" : "text-[var(--muted)]"}`}
                />
                <span className="text-sm font-medium">{FORMAT_LABELS[f]}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--subtle)] px-3 py-2 text-xs text-[var(--muted)]">
          <FormatBlurb className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
          <span>
            <span className="font-semibold text-[var(--foreground)]">{FORMAT_LABELS[format]}</span> —{" "}
            {FORMAT_BLURBS[format]}
          </span>
        </div>
      </section>

      {/* Step 3 — play style (skipped for formats with a single style, e.g. golf / Ryder Cup) */}
      {styleOptions.length > 1 && (
        <section>
          <StepHeader n={3} title="Play style" />
          <div className="flex flex-wrap gap-2">
            {styleOptions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setPlayStyle(s)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                  playStyle === s
                    ? "border-[var(--brand)] ring-1 ring-[var(--brand)] bg-[var(--brand-soft)]"
                    : "border-[var(--border)] hover:bg-[var(--hover)]"
                }`}
              >
                {PLAYSTYLE_LABELS[s]}
              </button>
            ))}
          </div>
          {STYLE_HINTS[playStyle] && (
            <p className="mt-2 text-xs text-[var(--muted)]">{STYLE_HINTS[playStyle]}</p>
          )}
        </section>
      )}

      {/* Sticky create bar */}
      <div className="sticky bottom-0 z-10 flex justify-end gap-2 border-t border-[var(--border)] bg-[var(--background)]/90 py-3 backdrop-blur">
        {onDone && (
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
        )}
        <Button type="submit">Create &amp; set up →</Button>
      </div>
    </form>
  );
}
