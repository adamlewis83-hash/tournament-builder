"use client";

import { useState } from "react";
import { Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import { defaultCourse } from "@/lib/golf";
import { CourseSearchResult, importCourse, searchCourses } from "@/lib/courseApi";
import { Save } from "@/components/icons";
import { Button, Card } from "./ui";

interface CourseState {
  holes: number;
  pars: number[];
  strokeIndex: number[];
  courseName?: string;
}

export function RyderSetup({ t }: { t: Tournament }) {
  const setRyderTeams = useStore((s) => s.setRyderTeams);
  const generate = useStore((s) => s.generate);
  const patch = useStore((s) => s.patchTournament);
  const savedCourses = useStore((s) => s.courses);
  const saveCourse = useStore((s) => s.saveCourse);

  const [nameA, setNameA] = useState(t.config.teamNames?.[0] ?? "Team A");
  const [nameB, setNameB] = useState(t.config.teamNames?.[1] ?? "Team B");
  const [foursomes, setFoursomes] = useState(t.config.ryderFoursomes ?? 0);
  const [fourball, setFourball] = useState(t.config.ryderFourball ?? 0);
  const [singles, setSingles] = useState(t.config.ryderSingles ?? 0);

  const toText = (team: 0 | 1) =>
    t.participants
      .filter((p) => p.team === team)
      .map((p) => (p.handicap ? `${p.name}, ${p.handicap}` : p.name))
      .join("\n");
  const [aText, setAText] = useState(toText(0));
  const [bText, setBText] = useState(toText(1));

  const d = defaultCourse(18);
  const [course, setCourse] = useState<CourseState>(
    t.ryderGolf
      ? {
          holes: t.ryderGolf.holes,
          pars: t.ryderGolf.pars,
          strokeIndex: t.ryderGolf.strokeIndex,
          courseName: t.ryderGolf.courseName,
        }
      : { holes: 18, pars: d.pars, strokeIndex: d.strokeIndex },
  );

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CourseSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);

  const parseRows = (s: string) =>
    s
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [name, hcp] = l.split(",").map((x) => x.trim());
        return { name, handicap: Number(hcp) || 0 };
      });

  const aRows = parseRows(aText);
  const bRows = parseRows(bText);
  const totalPar = course.pars.slice(0, course.holes).reduce((x, y) => x + y, 0);
  const canGenerate = aRows.length >= 1 && bRows.length >= 1 && course.pars.length >= course.holes;

  async function runSearch() {
    if (query.trim().length < 2) return;
    setSearching(true);
    const r = await searchCourses(query.trim());
    setNotConfigured(!!r.notConfigured);
    setResults(r.courses);
    setSearching(false);
  }

  async function pickResult(id: number) {
    const c = await importCourse(id);
    if (c) {
      setCourse({ holes: c.holes, pars: c.pars, strokeIndex: c.strokeIndex, courseName: c.name });
      setResults([]);
      setQuery("");
    }
  }

  // Drop in two sample teams (with handicaps) and a few sessions so a cup can be tested fast.
  function fillSample() {
    setNameA("Team A");
    setNameB("Team B");
    setAText("Player 1, 8\nPlayer 2, 14\nPlayer 3, 20\nPlayer 4, 5");
    setBText("Player 5, 6\nPlayer 6, 12\nPlayer 7, 18\nPlayer 8, 10");
    setFoursomes(1);
    setFourball(1);
    setSingles(2);
  }

  function handleGenerate() {
    patch(t.id, {
      config: {
        ...t.config,
        ryderFoursomes: foursomes,
        ryderFourball: fourball,
        ryderSingles: singles,
      },
    });
    setRyderTeams(
      t.id,
      aRows,
      bRows,
      [nameA.trim() || "Team A", nameB.trim() || "Team B"],
      {
        holes: course.holes,
        pars: course.pars.slice(0, course.holes),
        strokeIndex: course.strokeIndex.slice(0, course.holes),
        courseName: course.courseName,
      },
    );
    generate(t.id);
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h2 className="font-semibold mb-1">Two teams, on the course</h2>
        <p className="text-sm text-[var(--muted)]">
          Pick a course, enter each team&apos;s players with handicaps, and choose your sessions.
          Every match is played <b>hole-by-hole as net match play</b> — the app tracks who&apos;s up
          and awards the point (½ for a halve). First team past half the points wins the cup. 🏌️
        </p>
      </Card>

      {/* Course */}
      <Card className="p-5">
        <h2 className="font-semibold mb-3">Course</h2>
        <div className="mb-3">
          <span className="text-xs font-medium text-[var(--muted)]">Search real courses</span>
          <div className="mt-1 flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  runSearch();
                }
              }}
              placeholder="e.g. Pebble Beach"
              className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-[var(--surface)]"
            />
            <Button
              variant="outline"
              className="px-3 py-2"
              onClick={runSearch}
              disabled={searching || query.trim().length < 2}
            >
              {searching ? "…" : "Search"}
            </Button>
          </div>
          {notConfigured && (
            <p className="text-xs text-amber-400 mt-1">Course search isn&apos;t set up yet.</p>
          )}
          {results.length > 0 && (
            <div className="mt-2 rounded-lg border border-[var(--border)] divide-y divide-[var(--border)] max-h-56 overflow-auto">
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => pickResult(r.id)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--hover)]"
                >
                  <div className="font-medium">{r.name}</div>
                  {r.location && <div className="text-xs text-[var(--muted)]">{r.location}</div>}
                </button>
              ))}
            </div>
          )}
        </div>

        {savedCourses.length > 0 && (
          <label className="block mb-3">
            <span className="text-xs font-medium text-[var(--muted)]">Or load a saved course</span>
            <select
              value=""
              onChange={(e) => {
                const c = savedCourses.find((x) => x.id === e.target.value);
                if (c)
                  setCourse({
                    holes: c.holes,
                    pars: c.pars,
                    strokeIndex: c.strokeIndex,
                    courseName: c.name,
                  });
              }}
              className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-[var(--surface)]"
            >
              <option value="">— Pick a saved course —</option>
              {savedCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.holes} holes)
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex items-center justify-between rounded-lg bg-[var(--subtle)] px-3 py-2 text-sm">
          <span>
            <span className="font-semibold">{course.courseName ?? "Default course"}</span>{" "}
            <span className="text-[var(--muted)]">
              · {course.holes} holes · Par {totalPar}
            </span>
          </span>
          {course.courseName && (
            <Button
              variant="outline"
              className="px-2 py-1 text-xs inline-flex items-center gap-1.5"
              onClick={() =>
                saveCourse({
                  name: course.courseName!,
                  holes: course.holes,
                  pars: course.pars.slice(0, course.holes),
                  strokeIndex: course.strokeIndex.slice(0, course.holes),
                })
              }
            >
              <Save className="h-3.5 w-3.5" /> Save
            </Button>
          )}
        </div>
        <p className="text-xs text-[var(--muted)] mt-2">
          Handicap strokes are allocated by the course&apos;s stroke index, so each match is scored
          net per hole.
        </p>
      </Card>

      {/* Registered players waiting to be assigned to a team */}
      {(() => {
        const assigned = new Set([...aRows, ...bRows].map((r) => r.name.toLowerCase()));
        const pool = t.participants.filter(
          (p) => p.id.startsWith("reg-") && !assigned.has(p.name.toLowerCase()),
        );
        if (pool.length === 0) return null;
        const line = (p: { name: string; handicap?: number }) =>
          p.handicap != null ? `${p.name}, ${p.handicap}` : p.name;
        return (
          <Card className="p-4">
            <p className="text-sm font-semibold mb-2">
              Registered players ({pool.length}) — tap to assign
            </p>
            <div className="flex flex-wrap gap-2">
              {pool.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] pl-2.5 pr-1 py-1 text-sm"
                >
                  {p.name}
                  {p.handicap != null ? (
                    <span className="text-[var(--muted)]"> · {p.handicap}</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setAText((s) => (s.trim() ? s + "\n" : "") + line(p))}
                    className="ml-1 rounded-md bg-[var(--brand-soft)] text-[var(--brand)] font-semibold px-2 py-0.5 text-xs"
                  >
                    → A
                  </button>
                  <button
                    type="button"
                    onClick={() => setBText((s) => (s.trim() ? s + "\n" : "") + line(p))}
                    className="rounded-md bg-rose-400/15 text-rose-300 font-semibold px-2 py-0.5 text-xs"
                  >
                    → B
                  </button>
                </span>
              ))}
            </div>
          </Card>
        );
      })()}

      {/* Teams */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Teams</h2>
          <button
            type="button"
            onClick={fillSample}
            className="text-xs text-[var(--brand)] hover:text-[var(--brand-strong)] font-medium"
          >
            Fill sample
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
        {[
          { name: nameA, setName: setNameA, text: aText, setText: setAText, ring: "ring-[var(--brand)]", rows: aRows },
          { name: nameB, setName: setNameB, text: bText, setText: setBText, ring: "ring-rose-400/40", rows: bRows },
        ].map((team, i) => (
          <Card key={i} className={`p-5 ring-1 ${team.ring}`}>
            <input
              value={team.name}
              onChange={(e) => team.setName(e.target.value)}
              className="w-full bg-transparent text-lg font-bold mb-3 border-b border-[var(--border)] focus:border-[var(--brand)] outline-none pb-1"
            />
            <textarea
              value={team.text}
              onChange={(e) => team.setText(e.target.value)}
              rows={6}
              placeholder={"Player 1, 8\nPlayer 2, 14\nPlayer 3, 20\nPlayer 4, 5"}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-mono bg-[var(--surface)]"
            />
            <p className="text-sm text-[var(--muted)] mt-2">
              {team.rows.length} players · one per line as <b>Name, handicap</b>
            </p>
          </Card>
        ))}
        </div>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-1">
          Sessions <span className="text-[var(--muted)] font-normal text-sm">(optional)</span>
        </h2>
        <p className="text-sm text-[var(--muted)] mb-3">
          Leave these at 0 to build each round <b>as the cup unfolds</b> — add Foursomes, Fourball, or
          Singles from the match view and set the pairings yourself (or randomize). Or pre-load some
          here. Foursomes = alternate shot · Fourball = best ball · Singles = 1v1.
        </p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Foursomes", value: foursomes, set: setFoursomes },
            { label: "Fourball", value: fourball, set: setFourball },
            { label: "Singles", value: singles, set: setSingles },
          ].map((s) => (
            <label key={s.label} className="block">
              <span className="text-sm font-medium">{s.label}</span>
              <input
                type="number"
                min={0}
                max={6}
                value={s.value}
                onChange={(e) => s.set(Math.max(0, Math.min(6, Number(e.target.value) || 0)))}
                className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-center bg-[var(--surface)]"
              />
            </label>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleGenerate} disabled={!canGenerate} className="px-6 py-3">
          {foursomes + fourball + singles === 0 ? "Start the cup →" : "Generate matches →"}
        </Button>
      </div>
    </div>
  );
}
