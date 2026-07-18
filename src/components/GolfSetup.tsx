"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Course,
  GOLF_MODE_BLURBS,
  GOLF_MODE_LABELS,
  GolfMode,
  GolfSegment,
  SegmentFormat,
  SEGMENT_LABELS,
  SOLO_SEGMENT_FORMATS,
  TEAM_SEGMENT_FORMATS,
  TeeSet,
  Tournament,
} from "@/lib/types";
import { useStore } from "@/lib/store";
import { getProfile } from "@/lib/profile";
import { courseHandicap, defaultCourse } from "@/lib/golf";
import { CourseSearchResult, ImportedCourse, importCourse, searchCourses } from "@/lib/courseApi";
import { Save } from "@/components/icons";
import { Button, Card } from "./ui";
import { FriendPicker } from "./FriendPicker";

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

function defaultSegments(holes: number, teams = false): GolfSegment[] {
  const chunk = Math.ceil(holes / 3);
  const fmts: SegmentFormat[] = teams
    ? ["scramble", "bestball", "altshot"]
    : ["stroke", "stableford", "skins"];
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
  tee?: string;
}

export function GolfSetup({ t }: { t: Tournament }) {
  const patch = useStore((s) => s.patchTournament);
  const setGolfPlayers = useStore((s) => s.setGolfPlayers);
  const courses = useStore((s) => s.courses);
  const saveCourse = useStore((s) => s.saveCourse);
  const saveFriend = useStore((s) => s.saveFriend);

  const [mode, setMode] = useState<GolfMode>(
    MODES.includes(t.config.golfMode) ? t.config.golfMode : "stroke",
  );
  const isScramble = mode === "scramble";
  const [holes, setHoles] = useState<number>(t.golf?.holes ?? 18);
  const [nine, setNine] = useState<"front" | "back">(
    (t.golf?.startHole ?? 1) > 1 ? "back" : "front",
  );
  const [courseName, setCourseName] = useState(t.golf?.courseName ?? "");
  const [pars, setPars] = useState<number[]>(t.golf?.pars ?? defaultCourse(18).pars);
  const [si, setSi] = useState<number[]>(t.golf?.strokeIndex ?? defaultCourse(18).strokeIndex);
  const [tees, setTees] = useState<TeeSet[]>(t.golf?.tees ?? []);
  const [defaultTee, setDefaultTee] = useState<string | undefined>(undefined);
  const [teeForm, setTeeForm] = useState<{ name: string; rating: string; slope: string } | null>(null);
  const [teeFinding, setTeeFinding] = useState(false);
  const [teeFindMsg, setTeeFindMsg] = useState<string | null>(null);
  const [showCourse, setShowCourse] = useState(false);
  const [courseSaved, setCourseSaved] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CourseSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const [teamMode, setTeamMode] = useState<boolean>(!!t.golf?.teams);
  const [segments, setSegments] = useState<GolfSegment[]>(
    t.golf?.segments?.length ? t.golf.segments : defaultSegments(t.golf?.holes ?? 18, !!t.golf?.teams),
  );
  // In Build-Your-Own you can play as teams (one ball per team), like scramble.
  const teamsMode = isScramble || (mode === "mixed" && teamMode);
  const segFormats = teamMode ? TEAM_SEGMENT_FORMATS : SOLO_SEGMENT_FORMATS;

  const seed: PlayerRow[] = t.participants.length
    ? t.participants.map((p) => ({ name: p.name, handicap: String(p.handicap ?? 0), tee: p.tee }))
    : [
        { name: "", handicap: "0" },
        { name: "", handicap: "0" },
        { name: "", handicap: "0" },
        { name: "", handicap: "0" },
      ];
  const [players, setPlayers] = useState<PlayerRow[]>(seed);

  // Host isn't automatically in the field — one tap adds them from their profile,
  // carrying their saved golf handicap index.
  const [profileName, setProfileName] = useState("");
  const [profileHcp, setProfileHcp] = useState<number | null>(null);
  useEffect(() => {
    const p = getProfile();
    setProfileName(p.name.trim());
    setProfileHcp(p.golfHandicap);
  }, []);
  const meAdded =
    !!profileName && players.some((r) => r.name.trim().toLowerCase() === profileName.toLowerCase());
  const addMe = () => {
    if (!profileName || meAdded) return;
    const me: PlayerRow = { name: profileName, handicap: profileHcp != null ? String(profileHcp) : "0" };
    setPlayers((prev) => {
      const idx = prev.findIndex((r) => !r.name.trim());
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...me };
        return next;
      }
      return [...prev, me];
    });
  };
  const removeMe = () =>
    setPlayers((prev) => {
      const next = prev.filter((r) => r.name.trim().toLowerCase() !== profileName.toLowerCase());
      return next.length ? next : [{ name: "", handicap: "0" }];
    });

  // Friends: tap a saved friend to add a player row (with their handicap); save the current
  // named players back to your friends list (carrying whatever handicap is typed).
  const addFriendPlayer = (name: string, handicap?: number) => {
    const row: PlayerRow = { name, handicap: handicap != null ? String(handicap) : "0" };
    setPlayers((prev) => {
      if (prev.some((r) => r.name.trim().toLowerCase() === name.trim().toLowerCase())) return prev;
      const idx = prev.findIndex((r) => !r.name.trim());
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...row };
        return next;
      }
      return [...prev, row];
    });
  };
  const savePlayersAsFriends = () =>
    players
      .filter((r) => r.name.trim())
      .forEach((r) =>
        saveFriend({ name: r.name.trim(), handicap: r.handicap === "" ? undefined : Number(r.handicap) }),
      );

  // When players self-register, mirror the pool into the rows (names + handicaps).
  // Only fires once the pool is non-empty, so pure manual entry isn't disturbed.
  useEffect(() => {
    if (t.participants.length) {
      // Keep tee picks made in the rows: a registration poll can refresh participants
      // (which don't carry a tee until the scorecard starts) — don't wipe local choices.
      setPlayers((prev) => {
        const prevTee = new Map(prev.map((r) => [r.name.trim().toLowerCase(), r.tee]));
        return t.participants.map((p) => ({
          name: p.name,
          handicap: String(p.handicap ?? 0),
          tee: p.tee ?? prevTee.get(p.name.trim().toLowerCase()),
        }));
      });
    }
  }, [t.participants]);

  function setHoleCount(n: number) {
    setHoles(n);
    // Always keep a full 18-hole par/SI set so both Front 9 and Back 9 are available.
    if (pars.length < 18) {
      const c = defaultCourse(18);
      setPars(c.pars);
      setSi(c.strokeIndex);
    }
    setSegments(defaultSegments(n, teamMode));
  }

  // A different course means different tee names — reset the default and any
  // per-player picks that don't exist at the new course.
  function swapTees(next: TeeSet[]) {
    setTees(next);
    setDefaultTee(undefined);
    setPlayers((prev) =>
      prev.map((r) => (r.tee && !next.some((x) => x.name === r.tee) ? { ...r, tee: undefined } : r)),
    );
  }

  // Manual tee entry — for when you didn't import a course from search but still
  // want handicaps adjusted to the box you play. Rating/slope come off the scorecard;
  // blanks fall back to neutral (rating = par, slope 113) so it degrades to a plain label.
  function addTee() {
    if (!teeForm) return;
    const name = teeForm.name.trim();
    if (!name || tees.some((x) => x.name.toLowerCase() === name.toLowerCase())) return;
    const rating = Number(teeForm.rating) || totalPar;
    const slope = Number(teeForm.slope) || 113;
    const next = [...tees, { name, rating, slope, par: totalPar }];
    setTees(next);
    setDefaultTee(name);
    setPlayers((prev) => prev.map((r) => ({ ...r, tee: r.tee ?? name })));
    setTeeForm(null);
  }

  function removeTee(name: string) {
    setTees((prev) => prev.filter((x) => x.name !== name));
    if (defaultTee === name) setDefaultTee(undefined);
    setPlayers((prev) => prev.map((r) => (r.tee === name ? { ...r, tee: undefined } : r)));
  }

  // Saved/typed courses may not carry tees. Look the course name up in the database and
  // pull its real tee boxes so the host doesn't have to re-search or enter them by hand.
  async function loadTeesForCourse() {
    const q = courseName.trim();
    if (q.length < 2) return;
    setTeeFinding(true);
    setTeeFindMsg(null);
    const r = await searchCourses(q);
    if (r.notConfigured) {
      setTeeFinding(false);
      setTeeFindMsg("Course search isn't set up — add your tees manually below.");
      return;
    }
    const match = r.courses.find((c) => c.name.toLowerCase() === q.toLowerCase()) ?? r.courses[0];
    if (match) {
      const c = await importCourse(match.id);
      if (c?.tees?.length) {
        swapTees(c.tees);
        setTeeFinding(false);
        return;
      }
    }
    setTeeFinding(false);
    setTeeFindMsg("No tee data found for this course — add your tees manually below.");
  }

  function loadCourse(c: Course) {
    setCourseName(c.name);
    swapTees(c.tees ?? []);
    setHoles(c.holes);
    setPars(c.pars);
    setSi(c.strokeIndex);
    setSegments(defaultSegments(c.holes, teamMode));
  }

  function applyCourse(c: ImportedCourse) {
    setCourseName(c.name);
    swapTees(c.tees ?? []);
    setHoles(c.holes);
    setPars(c.pars);
    setSi(c.strokeIndex);
    setSegments(defaultSegments(c.holes, teamMode));
  }

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
      applyCourse(c);
      setResults([]);
      setQuery("");
    }
  }

  function saveCurrentCourse() {
    if (!courseName.trim()) return;
    saveCourse({
      name: courseName,
      holes,
      pars: pars.slice(0, holes),
      strokeIndex: si.slice(0, holes),
      tees: tees.length ? tees : undefined,
    });
    setCourseSaved(true);
    setTimeout(() => setCourseSaved(false), 1800);
  }

  // Drop in sample players/teams with varied handicaps so a format can be tested quickly.
  function fillSample() {
    const sample: PlayerRow[] = teamsMode
      ? [
          { name: "Team 1", handicap: "2" },
          { name: "Team 2", handicap: "6" },
          { name: "Team 3", handicap: "9" },
          { name: "Team 4", handicap: "13" },
        ]
      : [
          { name: "Player 1", handicap: "4" },
          { name: "Player 2", handicap: "10" },
          { name: "Player 3", handicap: "16" },
          { name: "Player 4", handicap: "22" },
        ];
    setPlayers(sample);
  }

  const valid = players.filter((p) => p.name.trim()).length >= 1;

  // Front/Back 9 selection. Back 9 needs a full 18-hole course to slice from.
  const has18 = pars.length >= 18;
  const isBack = holes === 9 && nine === "back" && has18;
  const offset = isBack ? 9 : 0;
  // Re-rank a nine's stroke indexes to 1..9 so net handicap strokes allocate correctly.
  const rerank = (vals: number[]) => {
    const order = vals.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const out = new Array<number>(vals.length);
    order.forEach((o, r) => (out[o.i] = r + 1));
    return out;
  };
  const activePars = pars.slice(offset, offset + holes);
  const rawSi = si.slice(offset, offset + holes);
  const activeSi = holes === 9 ? rerank(rawSi) : rawSi;
  const startHole = offset + 1;
  const totalPar = activePars.reduce((a, b) => a + b, 0);

  function handleGenerate() {
    patch(t.id, { config: { ...t.config, golfMode: mode } });
    setGolfPlayers(t.id, {
      players: players
        .filter((p) => p.name.trim())
        .map((p) => ({ name: p.name.trim(), handicap: Number(p.handicap) || 0, tee: p.tee ?? defaultTee })),
      holes,
      startHole,
      pars: activePars,
      strokeIndex: activeSi,
      courseName,
      tees: tees.length ? tees : undefined,
      segments: mode === "mixed" ? segments : undefined,
      teams: mode === "mixed" && teamMode,
    });
  }

  // Editor columns map display position → full-array index (so Back 9 edits holes 10–18).
  const holeIdx = Array.from({ length: holes }, (_, i) => offset + i);

  return (
    // Scoring (which game — Stroke, Skins, Wolf…) leads, because that's the decision the
    // host is here to make; course and players follow. It used to sit last, nearly two
    // phone-screens down, so the game types read as missing. `order` drives the visual
    // sequence off the same DOM.
    <div className="flex flex-col gap-5">
      {/* Course */}
      <Card className="p-5 order-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Course</h2>
          <Link href="/courses" className="text-xs text-[var(--brand)] hover:underline">
            Manage courses
          </Link>
        </div>

        {/* Disc golf isn't in the ball-golf course database — point at the OSM finder. */}
        {/disc\s*golf/i.test(t.sport) && (
          <Link
            href="/nearby"
            className="mb-3 block rounded-lg border border-[var(--brand)]/30 bg-[var(--brand-soft)] px-3 py-2 text-sm text-[var(--brand)] hover:opacity-90"
          >
            🥏 Find disc golf courses near you →
          </Link>
        )}

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
              placeholder="e.g. Pinehurst No. 2"
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
            <p className="text-xs text-amber-400 mt-1">
              Course search isn&apos;t set up yet (no API key configured).
            </p>
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

        {courses.length > 0 && (
          <label className="block mb-3">
            <span className="text-xs font-medium text-[var(--muted)]">Load a saved course</span>
            <select
              value=""
              onChange={(e) => {
                const c = courses.find((x) => x.id === e.target.value);
                if (c) loadCourse(c);
              }}
              className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-[var(--surface)]"
            >
              <option value="">— Pick a saved course —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.holes} holes)
                </option>
              ))}
            </select>
          </label>
        )}

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
            {holes === 9 && (
              <div className="mt-2">
                <div className="flex gap-2">
                  {(
                    [
                      ["front", "Front 9", "Holes 1–9"],
                      ["back", "Back 9", "Holes 10–18"],
                    ] as const
                  ).map(([val, label, sub]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setNine(val)}
                      disabled={val === "back" && !has18}
                      className={`rounded-lg border px-3 py-1.5 text-xs transition disabled:opacity-40 ${
                        nine === val
                          ? "border-[var(--brand)] ring-1 ring-[var(--brand)] bg-[var(--brand-soft)]"
                          : "border-[var(--border)] hover:bg-[var(--hover)]"
                      }`}
                      title={val === "back" && !has18 ? "Needs an 18-hole course" : sub}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {nine === "back" ? "Playing holes 10–18" : "Playing holes 1–9"} — pars and stroke
                  index match that nine.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tees — always available: importing a course fills these, or add your own. */}
        <div className="mt-4 pt-3 border-t border-[var(--border)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--muted)]">
              Tee boxes
              {tees.length > 0 ? " — tap the set everyone plays, or override per player below" : ""}
            </span>
            <button
              type="button"
              onClick={() => setTeeForm(teeForm ? null : { name: "", rating: "", slope: "" })}
              className="text-xs text-[var(--brand)] hover:text-[var(--brand-strong)] font-medium"
            >
              {teeForm ? "Cancel" : "+ Add tee"}
            </button>
          </div>

          {tees.length === 0 && !teeForm && (
            <div className="mt-1.5 space-y-1.5">
              {courseName.trim().length >= 2 && (
                <button
                  type="button"
                  onClick={loadTeesForCourse}
                  disabled={teeFinding}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brand)] bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)] transition hover:brightness-105 disabled:opacity-50"
                >
                  {teeFinding ? "Finding tees…" : `🔍 Find tees for ${courseName.trim()}`}
                </button>
              )}
              <p className="text-xs text-[var(--muted)]">
                {teeFindMsg ??
                  "Pulls the real tee boxes for the course above — or tap + Add tee to enter your own (name + rating/slope from the scorecard)."}
              </p>
            </div>
          )}

          {tees.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {tees.map((tee) => {
                const active = defaultTee === tee.name;
                return (
                  <span
                    key={tee.name}
                    className={`inline-flex items-center gap-1.5 rounded-full border pl-2.5 pr-1.5 py-1 text-xs transition ${
                      active
                        ? "border-[var(--brand)] ring-1 ring-[var(--brand)] bg-[var(--brand-soft)]"
                        : "border-[var(--border)] bg-[var(--subtle)]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setDefaultTee(tee.name);
                        setPlayers((prev) => prev.map((r) => ({ ...r, tee: tee.name })));
                      }}
                      className="inline-flex items-center gap-1.5"
                      title={`Play ${tee.name} for everyone`}
                    >
                      <span className="font-semibold">{tee.name}</span>
                      <span className="text-[var(--muted)] tabular-nums">
                        {tee.rating.toFixed(1)} / {tee.slope}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTee(tee.name)}
                      aria-label={`Remove ${tee.name}`}
                      className="text-[var(--muted)] hover:text-rose-400 px-0.5"
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {teeForm && (
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <label className="text-xs text-[var(--muted)]">
                Name
                <input
                  value={teeForm.name}
                  onChange={(e) => setTeeForm({ ...teeForm, name: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTee())}
                  placeholder="Blue"
                  className="mt-0.5 block w-24 rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm bg-[var(--surface)]"
                />
              </label>
              <label className="text-xs text-[var(--muted)]">
                Rating
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={teeForm.rating}
                  onChange={(e) => setTeeForm({ ...teeForm, rating: e.target.value })}
                  placeholder={String(totalPar)}
                  className="mt-0.5 block w-20 rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm bg-[var(--surface)] tabular-nums"
                />
              </label>
              <label className="text-xs text-[var(--muted)]">
                Slope
                <input
                  type="number"
                  inputMode="numeric"
                  value={teeForm.slope}
                  onChange={(e) => setTeeForm({ ...teeForm, slope: e.target.value })}
                  placeholder="113"
                  className="mt-0.5 block w-20 rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm bg-[var(--surface)] tabular-nums"
                />
              </label>
              <Button
                variant="outline"
                className="px-3 py-1.5"
                onClick={addTee}
                disabled={!teeForm.name.trim()}
              >
                Add
              </Button>
            </div>
          )}
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

        <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center gap-3">
          <Button
            variant="primary"
            className="px-3 py-1.5 inline-flex items-center gap-1.5"
            onClick={saveCurrentCourse}
            disabled={!courseName.trim()}
          >
            {courseSaved ? (
              <>✓ Saved</>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save course
              </>
            )}
          </Button>
          <span className="text-xs text-[var(--muted)]">Reuse its pars &amp; stroke index next time.</span>
        </div>
      </Card>

      {/* Players + handicaps */}
      <Card className="p-5 order-3">
        <div className="flex items-center justify-between mb-1 gap-2">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">{teamsMode ? "Teams" : "Players & handicaps"}</h2>
            {!teamsMode && profileName && (
              <button
                type="button"
                onClick={meAdded ? removeMe : addMe}
                title={
                  meAdded
                    ? `Remove ${profileName} from this round`
                    : `Add ${profileName} (from your profile) with your handicap`
                }
                className={`rounded-full border px-2 py-0.5 text-xs font-medium transition ${
                  meAdded
                    ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                    : "border-[var(--border)] hover:bg-[var(--hover)]"
                }`}
              >
                {meAdded ? "✓ You're in" : "+ Add me"}
              </button>
            )}
            {!teamsMode && !profileName && (
              <Link
                href="/settings"
                title="Set your name in your profile, then add yourself"
                className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-medium text-[var(--muted)] hover:bg-[var(--hover)]"
              >
                + Add me
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={fillSample}
            className="text-xs text-[var(--brand)] hover:text-[var(--brand-strong)] font-medium"
          >
            Fill sample
          </button>
        </div>
        <p className="text-sm text-[var(--muted)] mb-3">
          {isScramble
            ? "One team per line; handicap optional (one ball per team)."
            : "Add each player and their handicap — net scores adjust automatically."}
        </p>
        {!teamsMode && (
          <div className="mb-3">
            <FriendPicker
              addedNames={
                new Set(players.map((r) => r.name.trim().toLowerCase()).filter(Boolean))
              }
              onAdd={(f) => addFriendPlayer(f.name, f.handicap)}
              showHandicap
            />
          </div>
        )}
        <div className="space-y-2">
          {players.map((p, i) => {
            const idx = Number(p.handicap) || 0;
            const teeSet = tees.length
              ? tees.find((x) => x.name === (p.tee ?? defaultTee)) ?? tees[0]
              : undefined;
            const ch = teeSet && idx ? Math.max(0, courseHandicap(idx, teeSet)) : null;
            return (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <input
                  value={p.name}
                  onChange={(e) => {
                    const next = [...players];
                    next[i] = { ...next[i], name: e.target.value };
                    setPlayers(next);
                  }}
                  placeholder={teamsMode ? `Team ${i + 1}` : `Player ${i + 1}`}
                  className="flex-1 min-w-[8rem] rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-[var(--surface)]"
                />
                <label className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                  {tees.length ? "Index" : "Hcp"}
                  <input
                    type="number"
                    step="0.1"
                    value={p.handicap}
                    onChange={(e) => {
                      const next = [...players];
                      next[i] = { ...next[i], handicap: e.target.value };
                      setPlayers(next);
                    }}
                    className="w-14 rounded-lg border border-[var(--border)] px-2 py-2 text-sm text-center bg-[var(--surface)]"
                  />
                </label>
                {tees.length > 0 && !teamsMode && (
                  <>
                    <label className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                      Tee
                    <select
                      value={p.tee ?? defaultTee ?? tees[0].name}
                      onChange={(e) => {
                        const next = [...players];
                        next[i] = { ...next[i], tee: e.target.value };
                        setPlayers(next);
                      }}
                      className="rounded-lg border border-[var(--border)] px-1.5 py-2 text-xs bg-[var(--surface)] max-w-[7rem]"
                    >
                      {tees.map((x) => (
                        <option key={x.name} value={x.name}>
                          {x.name}
                        </option>
                      ))}
                    </select>
                    </label>
                    <span
                      className="text-xs font-semibold text-[var(--brand)] tabular-nums w-12"
                      title="Course handicap from these tees"
                    >
                      {ch != null ? `→ ${ch}` : ""}
                    </span>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setPlayers(players.filter((_, j) => j !== i))}
                  className="text-[var(--muted)] hover:text-rose-400 px-1"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPlayers([...players, { name: "", handicap: "0" }])}
            className="text-sm text-[var(--brand)] hover:text-[var(--brand-strong)]"
          >
            + Add {teamsMode ? "team" : "player"}
          </button>
          {!teamsMode && players.some((r) => r.name.trim()) && (
            <button
              type="button"
              onClick={savePlayersAsFriends}
              title="Save these players (with handicaps) to your friends list"
              className="text-xs font-medium text-[var(--brand)] hover:text-[var(--brand-strong)]"
            >
              Save as friends
            </button>
          )}
        </div>
      </Card>

      {/* Scoring mode */}
      <Card className="p-5 order-1">
        <h2 className="font-semibold mb-3">Scoring — pick your game</h2>
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
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
          <span className="font-semibold">{GOLF_MODE_LABELS[mode]}:</span>{" "}
          <span className="text-[var(--muted)]">{GOLF_MODE_BLURBS[mode]}</span>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Stroke / Stableford / Skins / Nassau share one scorecard — switch views anytime while you
          play.
        </p>

        {mode === "mixed" && (
          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={teamMode}
                onChange={(e) => {
                  const on = e.target.checked;
                  setTeamMode(on);
                  setSegments(defaultSegments(holes, on));
                }}
                className="h-4 w-4 accent-[var(--brand)]"
              />
              Play as teams — one ball per team (scramble, best ball, alternate shot)
            </label>
            <h3 className="font-medium text-sm mb-1">Segments</h3>
            <p className="text-xs text-[var(--muted)] mb-3">
              Assign a format to each stretch of holes — e.g.{" "}
              {teamMode
                ? "1–6 Scramble, 7–12 Best Ball, 13–18 Alternate Shot"
                : "1–6 Stroke, 7–12 Bingo, 13–18 Stableford"}
              .
            </p>
            {teamMode && (
              <p className="text-xs text-[var(--muted)] mb-3">
                Enter your teams in Players &amp; handicaps below (e.g.{" "}
                <span className="font-medium">Player 1 &amp; Player 2</span>) — one score per team per hole.
              </p>
            )}
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
                    {segFormats.map((f) => (
                      <option key={f} value={f}>
                        {SEGMENT_LABELS[f]}
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
                setSegments([...segments, { from, to: holes, format: segFormats[0] }]);
              }}
              className="mt-2 text-sm text-[var(--brand)] hover:text-[var(--brand-strong)]"
            >
              + Add segment
            </button>
          </div>
        )}
      </Card>

      <div className="flex justify-end order-4">
        <Button onClick={handleGenerate} disabled={!valid} className="px-6 py-3">
          Start scorecard →
        </Button>
      </div>
    </div>
  );
}
