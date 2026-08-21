"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Tournament } from "@/lib/types";
import {
  CUP_SCORING_LABELS,
  RYDER_SESSION_BLURBS,
  RyderScoring,
  RyderSessionType,
  TEAM_SESSION_TYPES,
} from "@/lib/ryder";
import { useStore } from "@/lib/store";
import { getProfile } from "@/lib/profile";
import { defaultCourse } from "@/lib/golf";
import { CourseSearchResult, importCourse, searchCourses } from "@/lib/courseApi";
import { Save } from "@/components/icons";
import { Button, Card } from "./ui";
import { ReorderList } from "./ReorderList";

interface CourseState {
  holes: number;
  pars: number[];
  strokeIndex: number[];
  courseName?: string;
}

export function RyderSetup({ t }: { t: Tournament }) {
  const setRyderTeams = useStore((s) => s.setRyderTeams);
  const keepRyderRounds = useStore((s) => s.keepRyderRounds);
  const addRyderSession = useStore((s) => s.addRyderSession);
  const patch = useStore((s) => s.patchTournament);
  const savedCourses = useStore((s) => s.courses);
  const saveCourse = useStore((s) => s.saveCourse);
  const friends = useStore((s) => s.friends);
  const saveFriend = useStore((s) => s.saveFriend);

  const [nameA, setNameA] = useState(t.config.teamNames?.[0] ?? "Team A");
  const [nameB, setNameB] = useState(t.config.teamNames?.[1] ?? "Team B");
  // The day's program: an ordered list of sessions, one per round, planned up
  // front (or left empty to build rounds captain-style as the cup unfolds).
  // Seed from the stored program so Edit setup restores the session list
  // (order included) instead of starting from scratch.
  const [program, setProgram] = useState<RyderSessionType[]>(
    (t.config.ryderProgram as RyderSessionType[] | undefined) ?? [],
  );
  const [info, setInfo] = useState<RyderSessionType | null>(null);
  const [scoring, setScoring] = useState<RyderScoring>(t.config.ryderScoring ?? "match");
  const [pointsPer, setPointsPer] = useState(
    t.config.ryderPointsPerSession != null ? String(t.config.ryderPointsPerSession) : "",
  );
  const [courseSaved, setCourseSaved] = useState(false);

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

  // Add yourself to a side from your profile, carrying your golf handicap index.
  const [profileName, setProfileName] = useState("");
  const [profileHcp, setProfileHcp] = useState<number | null>(null);
  useEffect(() => {
    const p = getProfile();
    setProfileName(p.name.trim());
    setProfileHcp(p.golfHandicap);
  }, []);
  const inA = !!profileName && aRows.some((r) => r.name.toLowerCase() === profileName.toLowerCase());
  const inB = !!profileName && bRows.some((r) => r.name.toLowerCase() === profileName.toLowerCase());
  const myTeamName = inA ? nameA : inB ? nameB : null;
  const meLine = () => (profileHcp != null ? `${profileName}, ${profileHcp}` : profileName);
  const stripMe = (s: string) =>
    s
      .split("\n")
      .filter((l) => l.split(",")[0].trim().toLowerCase() !== profileName.toLowerCase())
      .join("\n");
  const addMeTo = (team: 0 | 1) => {
    if (!profileName) return;
    const cleanA = stripMe(aText);
    const cleanB = stripMe(bText);
    if (team === 0) {
      setAText((cleanA.trim() ? cleanA + "\n" : "") + meLine());
      setBText(cleanB);
    } else {
      setBText((cleanB.trim() ? cleanB + "\n" : "") + meLine());
      setAText(cleanA);
    }
  };
  const removeMe = () => {
    setAText(stripMe(aText));
    setBText(stripMe(bText));
  };

  // Friends: pick a saved friend onto a side (with their handicap), or save both teams as friends.
  const assignedNames = new Set([...aRows, ...bRows].map((r) => r.name.trim().toLowerCase()));
  const availableFriends = friends.filter((f) => !assignedNames.has(f.name.trim().toLowerCase()));
  const friendLine = (f: { name: string; handicap?: number }) =>
    f.handicap != null ? `${f.name}, ${f.handicap}` : f.name;
  const addFriendToTeam = (f: { name: string; handicap?: number }, team: 0 | 1) => {
    const set = team === 0 ? setAText : setBText;
    set((s) => (s.trim() ? s + "\n" : "") + friendLine(f));
  };
  const saveTeamsAsFriends = () =>
    [...aRows, ...bRows]
      .filter((r) => r.name.trim())
      .forEach((r) => saveFriend({ name: r.name.trim(), handicap: r.handicap || undefined }));

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

  // Drop in two sample teams (with handicaps) so a cup can be tested fast.
  // Sessions are left alone — the host chooses those (or builds them as the cup unfolds).
  function fillSample() {
    setNameA("Team A");
    setNameB("Team B");
    setAText("Player 1, 8\nPlayer 2, 14\nPlayer 3, 20\nPlayer 4, 5");
    setBText("Player 5, 6\nPlayer 6, 12\nPlayer 7, 18\nPlayer 8, 10");
  }

  function handleGenerate() {
    // Sessions already built keep their matches — and so their scorecards, which are
    // keyed by match id. Only the part of the program that actually changed is rebuilt,
    // so coming in here to fix a name, a handicap or the course costs nothing. Rounds
    // are compared in order: everything up to the first difference is left alone.
    const current = (t.config.ryderProgram as RyderSessionType[] | undefined) ?? [];
    let keep = 0;
    while (keep < current.length && keep < program.length && current[keep] === program[keep]) keep++;
    const dropped = current.length - keep;
    const droppedScores = t.matches.filter(
      (m) => m.phase === "ryder" && m.round > keep && (t.ryderGolf?.scores?.[m.id] ?? null),
    ).length;
    if (
      droppedScores > 0 &&
      !confirm(
        `Changing the program here rebuilds ${dropped} session${dropped === 1 ? "" : "s"}, ` +
          `clearing the scores on ${droppedScores} match${droppedScores === 1 ? "" : "es"}. ` +
          `The first ${keep} session${keep === 1 ? "" : "s"} and their scores are kept. Continue?`,
      )
    )
      return;
    patch(t.id, {
      config: {
        ...t.config,
        ryderFoursomes: 0,
        ryderFourball: 0,
        ryderSingles: 0,
        ryderScoring: scoring,
        ryderPointsPerSession: (() => {
          const v = parseFloat(pointsPer);
          return Number.isFinite(v) && v > 0 ? v : undefined;
        })(),
        ryderProgram: program,
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
    // Keep the matching prefix of sessions intact; rebuild only from the first change.
    keepRyderRounds(t.id, keep);
    for (const ty of program.slice(keep)) addRyderSession(t.id, ty, false);
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
            <p className="text-xs text-amber-400 mt-1">Course search is temporarily unavailable.</p>
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

        {/* Session length: a cup of 9-hole sessions (change game & pairings each nine)
            plays each match over the front nine of the loaded course. */}
        <div className="mt-3 mb-2 flex items-center gap-2 text-sm">
          <span className="text-[var(--muted)]">Each session is</span>
          <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5">
            {([18, 9, 6] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCourse({ ...course, holes: n })}
                disabled={course.pars.length < n}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition disabled:opacity-40 ${
                  course.holes === n
                    ? "bg-[var(--brand)] text-[var(--on-brand)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {n} holes
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-[var(--subtle)] px-3 py-2 text-sm">
          <span>
            <span className="font-semibold">{course.courseName ?? "Default course"}</span>{" "}
            <span className="text-[var(--muted)]">
              · {course.holes} holes · Par {totalPar}
            </span>
          </span>
          {course.courseName && (
            <Button
              variant="primary"
              className="px-2.5 py-1 text-xs inline-flex items-center gap-1.5"
              onClick={() => {
                {
                  // Save the whole course, not just this cup's session length —
                  // a 9-hole session on an 18-hole course shouldn't strand the
                  // back nine out of every future course picker.
                  const full = Math.min(course.pars.length, 18);
                  saveCourse({
                    name: course.courseName!,
                    holes: full,
                    pars: course.pars.slice(0, full),
                    strokeIndex: course.strokeIndex.slice(0, full),
                  });
                }
                setCourseSaved(true);
                setTimeout(() => setCourseSaved(false), 1800);
              }}
            >
              {courseSaved ? <>✓ Saved</> : <><Save className="h-3.5 w-3.5" /> Save</>}
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
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold">Teams</h2>
            {profileName && !myTeamName && (
              <span className="inline-flex items-center gap-1 text-xs">
                <span className="text-[var(--muted)]">Add me:</span>
                <button
                  type="button"
                  onClick={() => addMeTo(0)}
                  title={`Add ${profileName} to ${nameA}`}
                  className="rounded-md bg-[var(--brand-soft)] text-[var(--brand)] font-semibold px-2 py-0.5"
                >
                  → A
                </button>
                <button
                  type="button"
                  onClick={() => addMeTo(1)}
                  title={`Add ${profileName} to ${nameB}`}
                  className="rounded-md bg-rose-400/15 text-rose-300 font-semibold px-2 py-0.5"
                >
                  → B
                </button>
              </span>
            )}
            {profileName && myTeamName && (
              <button
                type="button"
                onClick={removeMe}
                title={`Remove ${profileName}`}
                className="rounded-full border border-[var(--brand)] bg-[var(--brand-soft)] px-2 py-0.5 text-xs font-medium text-[var(--brand)]"
              >
                ✓ You&apos;re on {myTeamName} · remove
              </button>
            )}
            {!profileName && (
              <Link
                href="/settings"
                title="Set your name in your profile, then add yourself to a team"
                className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-medium text-[var(--muted)] hover:bg-[var(--hover)]"
              >
                + Add me
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            {[...aRows, ...bRows].some((r) => r.name.trim()) && (
              <button
                type="button"
                onClick={saveTeamsAsFriends}
                title="Save both teams' players to your friends list"
                className="text-xs text-[var(--brand)] hover:text-[var(--brand-strong)] font-medium"
              >
                Save as friends
              </button>
            )}
            <button
              type="button"
              onClick={fillSample}
              className="text-xs text-[var(--brand)] hover:text-[var(--brand-strong)] font-medium"
            >
              Fill sample
            </button>
          </div>
        </div>

        {friends.length > 0 && availableFriends.length > 0 && (
          <div className="mb-3 rounded-lg border border-[var(--border)] p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-[var(--muted)]">
                Your friends — tap a side to add
              </span>
              <Link
                href="/friends"
                className="text-xs text-[var(--brand)] hover:text-[var(--brand-strong)] font-medium"
              >
                Manage
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableFriends.map((f) => (
                <span
                  key={f.id}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] pl-2.5 pr-1 py-1 text-sm"
                >
                  {f.name}
                  {f.handicap != null && <span className="text-[var(--muted)]"> · {f.handicap}</span>}
                  <button
                    type="button"
                    onClick={() => addFriendToTeam(f, 0)}
                    className="ml-1 rounded-md bg-[var(--brand-soft)] text-[var(--brand)] font-semibold px-2 py-0.5 text-xs"
                  >
                    → A
                  </button>
                  <button
                    type="button"
                    onClick={() => addFriendToTeam(f, 1)}
                    className="rounded-md bg-rose-400/15 text-rose-300 font-semibold px-2 py-0.5 text-xs"
                  >
                    → B
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

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
        <h2 className="font-semibold mb-1">The program</h2>
        <p className="text-sm text-[var(--muted)] mb-3">
          Go <b>Traditional</b> (foursomes, fourball, singles — every match worth a point) or build
          your own cup: any run of games, in order, with the pairings set fresh each session.
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="px-3 py-1.5"
            onClick={() => {
              setProgram(["Foursomes", "Fourball", "Singles"]);
              setScoring("match");
            }}
          >
            🏆 Traditional Ryder Cup
          </Button>
          <Button variant="outline" className="px-3 py-1.5" onClick={() => setProgram([])}>
            Clear — build as we play
          </Button>
        </div>

        <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] mb-1.5">
          Add sessions in playing order
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(
            [
              "Fourball",
              "Foursomes",
              "Best Ball",
              "Shamble",
              "Scramble",
              "Vegas",
              "Singles",
              "Team Scramble",
              "Team Alt Shot",
              "Team Stableford",
            ] as RyderSessionType[]
          ).map((ty) => (
            <button
              key={ty}
              type="button"
              onClick={() => { setProgram((p) => [...p, ty]); setInfo(ty); }}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs hover:bg-[var(--hover)]"
            >
              + {ty}{TEAM_SESSION_TYPES.includes(ty) ? " (all play)" : ""}
            </button>
          ))}
        </div>
        {info && (
          <div className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs">
            <span className="font-semibold">{info}:</span>{" "}
            <span className="text-[var(--muted)]">{RYDER_SESSION_BLURBS[info]}</span>
          </div>
        )}
        {program.length > 0 && (
          <ReorderList
            items={program}
            onReorder={setProgram}
            renderItem={(ty) => ty}
            onRemove={(i) => setProgram((p) => p.filter((_, j) => j !== i))}
          />
        )}
        <p className="text-xs text-[var(--muted)] mb-4">
          {program.length === 0
            ? "No program yet — you can also add sessions one at a time from the match view as the day unfolds."
            : `${program.length} session${program.length > 1 ? "s" : ""} of ${course.holes} holes each, played in this order — drag ⠿ (or use ↑↓) to rearrange. Pairings are set per session in the match view (or randomized).`}
        </p>

        <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] mb-1.5">
          Cup scoring
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CUP_SCORING_LABELS) as RyderScoring[]).map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setScoring(val)}
              className={`rounded-lg border px-3 py-1.5 text-left text-sm transition ${
                scoring === val
                  ? "border-[var(--brand)] ring-1 ring-[var(--brand)] bg-[var(--brand-soft)]"
                  : "border-[var(--border)] hover:bg-[var(--hover)]"
              }`}
            >
              <span className="block font-medium">{CUP_SCORING_LABELS[val].label}</span>
              <span className="block text-[10px] text-[var(--muted)]">
                {CUP_SCORING_LABELS[val].hint}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="pps-setup" className="text-[var(--muted)]">
            Or type the points per session:
          </label>
          <input
            id="pps-setup"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            value={pointsPer}
            placeholder="auto"
            onChange={(e) => setPointsPer(e.target.value)}
            className="w-24 rounded-lg border border-[var(--border)] bg-[var(--input)] px-2 py-1 text-center tabular-nums outline-none focus:border-[var(--brand)]"
          />
          <span className="text-[10px] text-[var(--muted)]">
            split evenly across that session&apos;s matches — overrides the choice above
          </span>
        </div>
        <p className="mt-2 text-[10px] text-[var(--muted)]">
          All of this is changeable mid-cup from the scoreboard — no need to come back here.
        </p>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleGenerate} disabled={!canGenerate} className="px-6 py-3">
          {program.length === 0
            ? "Start the cup →"
            : `Generate ${program.length} session${program.length > 1 ? "s" : ""} →`}
        </Button>
      </div>
    </div>
  );
}
