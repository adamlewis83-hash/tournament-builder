"use client";

import { useState } from "react";
import { GOLF_MODE_LABELS, GolfMode, Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Button, Card } from "./ui";

const MODES: GolfMode[] = [
  "stroke",
  "stableford",
  "skins",
  "nassau",
  "bingo",
  "wolf",
  "scramble",
];

export function GolfSetup({ t }: { t: Tournament }) {
  const patch = useStore((s) => s.patchTournament);
  const setGolfPlayers = useStore((s) => s.setGolfPlayers);

  const [mode, setMode] = useState<GolfMode>(
    MODES.includes(t.config.golfMode) ? t.config.golfMode : "stroke",
  );
  const isScramble = mode === "scramble";
  const [holes, setHoles] = useState<number>(t.golf?.holes ?? 18);
  const [text, setText] = useState(
    t.participants.map((p) => (p.handicap ? `${p.name}, ${p.handicap}` : p.name)).join("\n"),
  );

  const players = text
    .split("\n")
    .map((line) => {
      const [name, hcp] = line.split(",");
      return { name: (name ?? "").trim(), handicap: Number((hcp ?? "").trim()) || 0 };
    })
    .filter((p) => p.name);

  function handleGenerate() {
    patch(t.id, { config: { ...t.config, golfMode: mode } });
    setGolfPlayers(t.id, players, holes);
  }

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <Card className="p-5">
        <h2 className="font-semibold mb-1">{isScramble ? "Teams" : "Players & handicaps"}</h2>
        <p className="text-sm text-[var(--muted)] mb-3">
          {isScramble ? (
            <>
              One team per line — scramble plays one ball per team. Add a team handicap after a comma,
              e.g. <span className="font-mono">Team Eagles, 6</span>.
            </>
          ) : (
            <>
              One per line. Add a handicap after a comma for net scoring — e.g.{" "}
              <span className="font-mono">Adam, 12</span>. No handicap = scratch (0).
            </>
          )}
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={isScramble ? "Team Eagles, 6\nTeam Birdies, 4\nThe Hackers, 12" : "Adam, 8\nCody, 14\nLogan, 2\nMatt, 20"}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-mono bg-[var(--surface)]"
        />
        <p className="text-sm text-[var(--muted)] mt-2">
          {players.length} {isScramble ? "teams" : "players"}
        </p>
      </Card>

      <Card className="p-5 flex flex-col">
        <h2 className="font-semibold mb-3">Format</h2>
        <div className="space-y-4">
          <div>
            <span className="text-sm font-medium">Scoring</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                    mode === m
                      ? "border-cyan-400/60 ring-1 ring-cyan-400/50 bg-cyan-400/10"
                      : "border-[var(--border)] hover:bg-white/5"
                  }`}
                >
                  {GOLF_MODE_LABELS[m]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              You can switch scoring view anytime once you&apos;re playing.
            </p>
          </div>

          <div>
            <span className="text-sm font-medium">Holes</span>
            <div className="mt-2 flex gap-2">
              {[9, 18].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHoles(h)}
                  className={`rounded-lg border px-4 py-1.5 text-sm transition ${
                    holes === h
                      ? "border-cyan-400/60 ring-1 ring-cyan-400/50 bg-cyan-400/10"
                      : "border-[var(--border)] hover:bg-white/5"
                  }`}
                >
                  {h} holes
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Defaults to a par-{holes === 9 ? "36" : "72"} course — edit pars on the scorecard later.
            </p>
          </div>
        </div>

        <div className="mt-auto pt-5">
          <Button onClick={handleGenerate} disabled={players.length < 1} className="w-full">
            Start scorecard →
          </Button>
        </div>
      </Card>
    </div>
  );
}
