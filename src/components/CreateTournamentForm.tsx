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
  SPORTS,
} from "@/lib/types";
import { Button } from "./ui";

const STYLES: PlayStyle[] = ["singles", "doubles", "doubles-fixed", "teams"];

const STYLE_HINTS: Partial<Record<PlayStyle, string>> = {
  doubles: "Individuals enter; partners rotate each round and standings track per person — great for pickleball/tennis socials.",
  "doubles-fixed": "Set pairs that stay together all event (e.g. Cody & Adam). Each pair competes as one.",
  teams: "Build teams with 2+ players each (e.g. volleyball). Each team competes as one unit.",
};
const OTHER = "__other__";

export function CreateTournamentForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const createTournament = useStore((s) => s.createTournament);
  const [name, setName] = useState("");
  const [sportChoice, setSportChoice] = useState<string>("Pickleball");
  const [customSport, setCustomSport] = useState("");
  const [format, setFormat] = useState<Format>("round-robin");
  const [playStyle, setPlayStyle] = useState<PlayStyle>("doubles");

  const sport =
    sportChoice === OTHER ? customSport.trim() || "Custom Tournament" : sportChoice;
  const available = sportChoice === OTHER ? ALL_FORMATS : formatsForSport(sport);

  // Keep the selected format valid for the chosen sport.
  useEffect(() => {
    const avail = sportChoice === OTHER ? ALL_FORMATS : formatsForSport(sport);
    if (!avail.includes(format)) setFormat(avail[0]);
  }, [sportChoice, sport, format]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = createTournament({ name, sport, format, playStyle });
    onDone?.();
    router.push(`/t/${id}`);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium">Tournament name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Lewis Family Pickleball"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-[var(--surface)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Sport / activity</span>
          <select
            value={sportChoice}
            onChange={(e) => setSportChoice(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-[var(--surface)]"
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

      <div>
        <span className="text-sm font-medium">Format</span>
        <div className="mt-2 grid sm:grid-cols-2 gap-2">
          {available.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className={`text-left rounded-lg border p-3 transition ${
                format === f
                  ? "border-[var(--brand)] ring-1 ring-[var(--brand)] bg-[var(--brand-soft)]"
                  : "border-[var(--border)] hover:bg-[var(--hover)]"
              }`}
            >
              <div className="font-medium text-sm">{FORMAT_LABELS[f]}</div>
              <div className="text-xs text-[var(--muted)] mt-0.5">{FORMAT_BLURBS[f]}</div>
            </button>
          ))}
        </div>
      </div>

      <div className={format === "ryder" || format === "golf" ? "hidden" : ""}>
        <span className="text-sm font-medium">Play style</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {STYLES.map((s) => (
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
      </div>

      <div className="flex justify-end gap-2 pt-2">
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
