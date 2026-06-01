"use client";

import { useEffect, useState } from "react";
import { Tournament, TournamentConfig } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Button, Card } from "./ui";

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  // Local draft lets the field be emptied/edited freely; clamp only on blur.
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="number"
        value={draft}
        min={min}
        max={max}
        onChange={(e) => {
          const v = e.target.value;
          setDraft(v);
          if (v === "") return; // allow empty while typing
          const n = Number(v);
          if (!Number.isNaN(n)) onChange(n);
        }}
        onBlur={() => {
          let n = Number(draft);
          if (draft === "" || Number.isNaN(n)) n = min;
          n = Math.max(min, Math.min(max, n));
          setDraft(String(n));
          onChange(n);
        }}
        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-[var(--surface)]"
      />
      {hint && <span className="text-xs text-[var(--muted)]">{hint}</span>}
    </label>
  );
}

export function SetupPanel({ t }: { t: Tournament }) {
  const setParticipants = useStore((s) => s.setParticipants);
  const patch = useStore((s) => s.patchTournament);
  const generate = useStore((s) => s.generate);

  const [text, setText] = useState(t.participants.map((p) => p.name).join("\n"));
  const names = text
    .split(/[\n,]/)
    .map((n) => n.trim())
    .filter(Boolean);
  const count = names.length;

  const cfg = t.config;
  const setCfg = (patchCfg: Partial<TournamentConfig>) =>
    patch(t.id, { config: { ...cfg, ...patchCfg } });

  const isDoubles = t.playStyle === "doubles";
  const minNeeded = t.format === "round-robin" && isDoubles ? 4 : 2;
  const canGenerate = count >= minNeeded;

  function commitNames() {
    setParticipants(t.id, names);
  }

  function handleGenerate() {
    setParticipants(t.id, names); // commits synchronously
    generate(t.id); // reads the just-updated participants
  }

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <Card className="p-5">
        <h2 className="font-semibold mb-1">Participants</h2>
        <p className="text-sm text-[var(--muted)] mb-3">
          One per line.{" "}
          {t.format === "single-elim" || t.format === "double-elim"
            ? "Order = seeding (top seed first)."
            : isDoubles
              ? "Individuals — partners rotate each round."
              : "Each line is a player or team."}
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitNames}
          rows={12}
          placeholder={"Cody\nAdam\nLogan\nBrittany\n…"}
          className="w-full rounded-lg border px-3 py-2 text-sm font-mono bg-[var(--surface)]"
        />
        <p className="text-sm text-[var(--muted)] mt-2">{count} entered</p>
      </Card>

      <Card className="p-5 flex flex-col">
        <h2 className="font-semibold mb-3">Settings</h2>
        <div className="grid grid-cols-2 gap-4">
          {t.format === "round-robin" && isDoubles && (
            <NumberField
              label="Rounds"
              value={cfg.rounds}
              min={1}
              max={20}
              onChange={(v) => setCfg({ rounds: v })}
              hint="Games each player plays"
            />
          )}
          {(t.format === "round-robin" || t.format === "pool-bracket") && (
            <NumberField
              label="Courts"
              value={cfg.courts}
              min={1}
              max={12}
              onChange={(v) => setCfg({ courts: v })}
              hint="Games at once"
            />
          )}
          {t.format === "pool-bracket" && (
            <NumberField
              label="Pools"
              value={cfg.poolCount}
              min={2}
              max={8}
              onChange={(v) => setCfg({ poolCount: v })}
            />
          )}
          {(t.format === "round-robin" || t.format === "pool-bracket") && (
            <NumberField
              label="Advance to finals"
              value={cfg.advanceCount}
              min={2}
              max={16}
              onChange={(v) => setCfg({ advanceCount: v })}
              hint="Top N by record"
            />
          )}
          <NumberField
            label="Games to"
            value={cfg.pointsTo}
            min={1}
            max={99}
            onChange={(v) => setCfg({ pointsTo: v })}
            hint="Scoring target"
          />
          {t.format === "pool-bracket" && (
            <label className="block">
              <span className="text-sm font-medium">Bracket type</span>
              <select
                value={cfg.bracketType}
                onChange={(e) => setCfg({ bracketType: e.target.value as "single" | "double" })}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-[var(--surface)]"
              >
                <option value="single">Single elimination</option>
                <option value="double">Double elimination</option>
              </select>
            </label>
          )}
        </div>

        <div className="mt-auto pt-5">
          {!canGenerate && (
            <p className="text-sm text-amber-700 mb-2">
              Add at least {minNeeded} participants to generate.
            </p>
          )}
          <Button onClick={handleGenerate} disabled={!canGenerate} className="w-full">
            {t.format === "round-robin" || t.format === "pool-bracket"
              ? "Generate schedule →"
              : "Generate bracket →"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
