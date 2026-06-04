"use client";

import { useState } from "react";
import { GOLF_MODE_LABELS, GolfMode, GolfSegment, SegmentFormat, Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import { defaultCourse } from "@/lib/golf";
import { Button, Card } from "./ui";

const MODES: GolfMode[] = [
  "stroke",
  "stableford",
  "skins",
  "nassau",
  "bingo",
  "wolf",
  "scramble",
  "mixed",
];

const SEGMENT_FORMATS: SegmentFormat[] = ["stroke", "stableford", "skins", "bingo"];

function defaultSegments(holes: number): GolfSegment[] {
  const chunk = Math.ceil(holes / 3);
  const fmts: SegmentFormat[] = ["stroke", "stableford", "skins"];
  const segs: GolfSegment[] = [];
  for (let i = 0; i < 3; i++) {
    const from = i * chunk + 1;
    const to = Math.min((i + 1) * chunk, holes);
    if (from <= to) segs.push({ from, to, format: fmts[i] });
  }
  return segs;
}

interface PlayerRow {
  name: string;
  handicap: string;
}

export function GolfSetup({ t }: { t: Tournament }) {
  const patch = useStore((s) => s.patchTournament);
  const setGolfPlayers = useStore((s) => s.setGolfPlayers);

  const [mode, setMode] = useState<GolfMode>(
    MODES.includes(t.config.golfMode) ? t.config.golfMode : "stroke",
  );
  const isScramble = mode === "scramble";
  const [holes, setHoles] = useState<number>(t.golf?.holes ?? 18);
  const [courseName, setCourseName] = useState(t.golf?.courseName ?? "");
  const [pars, setPars] = useState<number[]>(t.golf?.pars ?? defaultCourse(18).pars);
  const [si, setSi] = useState<number[]>(t.golf?.strokeIndex ?? defaultCourse(18).strokeIndex);
  const [showCourse, setShowCourse] = useState(false);
  const [segments, setSegments] = useState<GolfSegment[]>(
    t.golf?.segments?.length ? t.golf.segments : defaultSegments(t.golf?.holes ?? 18),
  );

  const seed: PlayerRow[] = t.participants.length
    ? t.participants.map((p) => ({ name: p.name, handicap: String(p.handicap ?? 0) }))
    : [
        { name: "", handicap: "0" },
        { name: "", handicap: "0" },
        { name: "", handicap: "0" },
        { name: "", handicap: "0" },
      ];
  const [players, setPlayers] = useState<PlayerRow[]>(seed);

  function setHoleCount(n: number) {
    setHoles(n);
    const c = defaultCourse(n);
    setPars(c.pars);
    setSi(c.strokeIndex);
    setSegments(defaultSegments(n));
  }

  const valid = players.filter((p) => p.name.trim()).length >= 1;
  const totalPar = pars.slice(0, holes).reduce((a, b) => a + b, 0);

  function handleGenerate() {
    patch(t.id, { config: { ...t.config, golfMode: mode } });
    setGolfPlayers(t.id, {
      players: players
        .filter((p) => p.name.trim())
        .map((p) => ({ name: p.name.trim(), handicap: Number(p.handicap) || 0 })),
      holes,
      pars: pars.slice(0, holes),
      strokeIndex: si.slice(0, holes),
      courseName,
      segments: mode === "mixed" ? segments : undefined,
    });
  }

  const holeIdx = Array.from({ length: holes }, (_, i) => i);

  return (
    <div className="space-y-5">
      {/* Course */}
      <Card className="p-5">
        <h2 className="font-semibold mb-3">Course</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Course name</span>
            <input
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="e.g. Arrowhead GC — Blue tees"
              className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-[var(--surface)]"
            />
          </label>
          <div>
            <span className="text-sm font-medium">Holes</span>
            <div className="mt-1 flex gap-2">
              {[9, 18].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHoleCount(h)}
                  className={`rounded-lg border px-4 py-2 text-sm transition ${
                    holes === h
                      ? "border-[var(--brand)] ring-1 ring-[var(--brand)] bg-[var(--brand-soft)]"
                      : "border-[var(--border)] hover:bg-[var(--hover)]"
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCourse((v) => !v)}
          className="mt-3 text-sm text-[var(--brand)] hover:text-[var(--brand-strong)]"
        >
          {showCourse ? "▾ Hide" : "▸ Edit"} pars &amp; stroke index (Par {totalPar})
        </button>
        {showCourse && (
          <div className="mt-3 overflow-x-auto">
            <table className="text-sm border-separate border-spacing-0">
              <tbody>
                <tr>
                  <td className="px-2 py-1 text-xs text-[var(--muted)] sticky left-0 bg-[var(--surface)]">Hole</td>
                  {holeIdx.map((h) => (
                    <td key={h} className="px-1 py-1 text-center text-xs text-[var(--muted)] w-9">
                      {h + 1}
                    </td>
                  ))}
                </tr>
                {[
                  { label: "Par", arr: pars, set: setPars, min: 3, max: 6 },
                  { label: "SI", arr: si, set: setSi, min: 1, max: holes },
                ].map((row) => (
                  <tr key={row.label}>
                    <td className="px-2 py-1 text-xs text-[var(--muted)] sticky left-0 bg-[var(--surface)]">
                      {row.label}
                    </td>
                    {holeIdx.map((h) => (
                      <td key={h} className="px-0.5 py-1">
                        <input
                          type="number"
                          value={row.arr[h] ?? ""}
                          min={row.min}
                          max={row.max}
                          onChange={(e) => {
                            const next = [...row.arr];
                            next[h] = Number(e.target.value) || 0;
                            row.set(next);
                          }}
                          className="w-8 rounded border border-[var(--border)] bg-[var(--input)] px-0.5 py-1 text-center text-sm tabular-nums outline-none focus:border-[var(--brand)]"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-[var(--muted)] mt-1">
              Stroke index (1–{holes}) ranks hole difficulty — it&apos;s how handicap strokes are
              allocated for net scoring.
            </p>
          </div>
        )}
      </Card>

      {/* Players + handicaps */}
      <Card className="p-5">
        <h2 className="font-semibold mb-1">{isScramble ? "Teams" : "Players & handicaps"}</h2>
        <p className="text-sm text-[var(--muted)] mb-3">
          {isScramble
            ? "One team per line; handicap optional (one ball per team)."
            : "Add each player and their handicap — net scores adjust automatically."}
        </p>
        <div className="space-y-2">
          {players.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={p.name}
                onChange={(e) => {
                  const next = [...players];
                  next[i] = { ...next[i], name: e.target.value };
                  setPlayers(next);
                }}
                placeholder={isScramble ? `Team ${i + 1}` : `Player ${i + 1}`}
                className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-[var(--surface)]"
              />
              <label className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                Hcp
                <input
                  type="number"
                  value={p.handicap}
                  onChange={(e) => {
                    const next = [...players];
                    next[i] = { ...next[i], handicap: e.target.value };
                    setPlayers(next);
                  }}
                  className="w-14 rounded-lg border border-[var(--border)] px-2 py-2 text-sm text-center bg-[var(--surface)]"
                />
              </label>
              <button
                type="button"
                onClick={() => setPlayers(players.filter((_, j) => j !== i))}
                className="text-[var(--muted)] hover:text-rose-400 px-1"
                aria-label="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPlayers([...players, { name: "", handicap: "0" }])}
          className="mt-3 text-sm text-[var(--brand)] hover:text-[var(--brand-strong)]"
        >
          + Add {isScramble ? "team" : "player"}
        </button>
      </Card>

      {/* Scoring mode */}
      <Card className="p-5">
        <h2 className="font-semibold mb-3">Scoring</h2>
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                mode === m
                  ? "border-[var(--brand)] ring-1 ring-[var(--brand)] bg-[var(--brand-soft)]"
                  : "border-[var(--border)] hover:bg-[var(--hover)]"
              }`}
            >
              {GOLF_MODE_LABELS[m]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Stroke / Stableford / Skins / Nassau share one scorecard — switch views anytime while you
          play.
        </p>

        {mode === "mixed" && (
          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <h3 className="font-medium text-sm mb-1">Segments</h3>
            <p className="text-xs text-[var(--muted)] mb-3">
              Assign a format to each stretch of holes — e.g. 1–6 Stroke, 7–12 Bingo, 13–18
              Stableford.
            </p>
            <div className="space-y-2">
              {segments.map((seg, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-[var(--muted)]">Holes</span>
                  <input
                    type="number"
                    min={1}
                    max={holes}
                    value={seg.from}
                    onChange={(e) => {
                      const next = [...segments];
                      next[i] = { ...next[i], from: Number(e.target.value) || 1 };
                      setSegments(next);
                    }}
                    className="w-14 rounded-lg border border-[var(--border)] px-2 py-1.5 text-center bg-[var(--surface)]"
                  />
                  <span className="text-[var(--muted)]">–</span>
                  <input
                    type="number"
                    min={1}
                    max={holes}
                    value={seg.to}
                    onChange={(e) => {
                      const next = [...segments];
                      next[i] = { ...next[i], to: Number(e.target.value) || 1 };
                      setSegments(next);
                    }}
                    className="w-14 rounded-lg border border-[var(--border)] px-2 py-1.5 text-center bg-[var(--surface)]"
                  />
                  <select
                    value={seg.format}
                    onChange={(e) => {
                      const next = [...segments];
                      next[i] = { ...next[i], format: e.target.value as SegmentFormat };
                      setSegments(next);
                    }}
                    className="flex-1 rounded-lg border border-[var(--border)] px-2 py-1.5 bg-[var(--surface)]"
                  >
                    {SEGMENT_FORMATS.map((f) => (
                      <option key={f} value={f}>
                        {GOLF_MODE_LABELS[f]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setSegments(segments.filter((_, j) => j !== i))}
                    className="text-[var(--muted)] hover:text-rose-400 px-1"
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                const last = segments[segments.length - 1];
                const from = last ? Math.min(last.to + 1, holes) : 1;
                setSegments([...segments, { from, to: holes, format: "stroke" }]);
              }}
              className="mt-2 text-sm text-[var(--brand)] hover:text-[var(--brand-strong)]"
            >
              + Add segment
            </button>
          </div>
        )}
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleGenerate} disabled={!valid} className="px-6 py-3">
          Start scorecard →
        </Button>
      </div>
    </div>
  );
}
