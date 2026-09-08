"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { getProfile, PROFILE_EVENT, setProfile, type Profile, type StartingIndex } from "@/lib/profile";
import { addPastRound, pastRoundsFor, removePastRound, type PastRound } from "@/lib/pastRounds";
import { differential } from "@/lib/handicap";
import { Button, Card } from "./ui";

const SOURCES: { v: StartingIndex["source"]; label: string }[] = [
  { v: "GHIN", label: "GHIN" },
  { v: "Club", label: "Club / other" },
  { v: "Self", label: "My own number" },
];

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const fromIso = (s: string) => {
  // Parsed at midday so a timezone can't shunt the date to the day before.
  const [y, m, d] = s.split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d, 12).getTime() : Date.now();
};

// "Bring your handicap": the two ways a golfer who already has one can arrive
// with it. The index they play off seeds the Seed Index so it means something
// from day one, and rounds they type in from before Sporos earn it outright.
// No outside service is involved, and nothing here is ever presented as an
// official index.
export function HandicapImportPanel() {
  const courses = useStore((s) => s.courses);
  // Settings renders behind HydrationGate, so this only ever runs on the client
  // and the profile can be read straight into state.
  const [prof, setProf] = useState<Profile>(() => getProfile());
  const [rounds, setRounds] = useState<PastRound[]>(() => pastRoundsFor(getProfile().name));

  // Starting index form
  const [idx, setIdx] = useState("");
  const [source, setSource] = useState<StartingIndex["source"]>("GHIN");
  const [asOf, setAsOf] = useState(() => iso(Date.now()));

  // Past round form
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => iso(Date.now()));
  const [courseName, setCourseName] = useState("");
  const [holes, setHoles] = useState(18);
  const [gross, setGross] = useState("");
  const [rating, setRating] = useState("");
  const [slope, setSlope] = useState("113");

  const reload = (p: Profile) => {
    setProf(p);
    setRounds(pastRoundsFor(p.name));
  };
  // The name lives in the card above this one, and can be edited after this one
  // has rendered — coming back to the tab picks up whatever it says now.
  useEffect(() => {
    const sync = () => reload(getProfile());
    window.addEventListener(PROFILE_EVENT, sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener(PROFILE_EVENT, sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const name = prof.name.trim();
  const start = prof.startingIndex ?? null;

  const saveProfile = (p: Profile) => {
    setProfile(p);
    reload(p);
  };

  function saveStart() {
    const v = Number(idx);
    if (!idx.trim() || Number.isNaN(v)) return;
    saveProfile({
      ...prof,
      startingIndex: { index: Math.max(-10, Math.min(54, v)), source, at: fromIso(asOf) },
      // The number they play off today, too — unless they've already set one.
      golfHandicap: prof.golfHandicap ?? Math.round(v * 10) / 10,
    });
    setIdx("");
  }

  function addRound() {
    const g = Number(gross);
    const r = Number(rating);
    const sl = Number(slope);
    if (!name || !g || !r || !sl) return;
    addPastRound({
      name,
      at: fromIso(date),
      holes,
      gross: g,
      rating: r,
      slope: sl,
      courseName: courseName.trim() || undefined,
    });
    setRounds(pastRoundsFor(name));
    setGross("");
  }

  // Pick a saved course to fill the rating and slope from its tees.
  const teeOptions = courses.flatMap((c) =>
    (c.tees ?? []).map((t) => ({ key: `${c.id}-${t.name}`, course: c.name, tee: t })),
  );

  const field = "rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-sm";
  const canAdd = !!name && !!Number(gross) && !!Number(rating) && !!Number(slope);
  const preview =
    canAdd && holes === 18
      ? Math.round(differential(Number(gross), Number(rating), Number(slope)) * 10) / 10
      : null;

  return (
    <Card className="p-5 mt-4 space-y-3">
      <div>
        <h2 className="font-semibold">Bring your handicap</h2>
        <p className="text-sm text-[var(--muted)]">
          Already play off a handicap? Start there instead of from nothing. Sporos still keeps its
          own Seed Index — this gives it something to stand on.
        </p>
      </div>

      {!name && (
        <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)]">
          Set your player name above first — rounds and indexes are matched to it.
        </p>
      )}

      {/* 1 — the index they arrived with */}
      <div className="border-t border-[var(--border)] pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Index you already have
        </p>
        {start ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-lg bg-[var(--brand-soft)] px-2.5 py-1 font-semibold tabular-nums text-[var(--brand)]">
              {start.index.toFixed(1)}
            </span>
            <span className="text-[var(--muted)]">
              from {start.source === "Self" ? "your own estimate" : start.source}, as of{" "}
              {new Date(start.at).toLocaleDateString()}
            </span>
            <button
              type="button"
              onClick={() => saveProfile({ ...prof, startingIndex: null })}
              className="text-xs font-semibold text-rose-400 hover:underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="mt-1.5 flex flex-wrap items-end gap-2">
            <label className="flex flex-col">
              <span className="text-[11px] text-[var(--muted)]">Index</span>
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                value={idx}
                onChange={(e) => setIdx(e.target.value)}
                placeholder="8.4"
                className={`${field} w-20 text-center tabular-nums`}
              />
            </label>
            <label className="flex flex-col">
              <span className="text-[11px] text-[var(--muted)]">From</span>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as StartingIndex["source"])}
                className={field}
              >
                {SOURCES.map((s) => (
                  <option key={s.v} value={s.v}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col">
              <span className="text-[11px] text-[var(--muted)]">As of</span>
              <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className={field} />
            </label>
            <Button variant="outline" className="px-3 py-2 text-sm" onClick={saveStart} disabled={!idx.trim()}>
              Use it
            </Button>
          </div>
        )}
        <p className="mt-1.5 text-xs text-[var(--muted)]">
          It counts as your first 20 rounds. Every round you play in Sporos replaces one of them, so
          after 20 the index is entirely your own. Not an official index, and never shown as one.
        </p>
      </div>

      {/* 2 — rounds from before Sporos */}
      <div className="border-t border-[var(--border)] pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Rounds from before Sporos ({rounds.length})
        </p>
        {rounds.length > 0 && (
          <ul className="mt-1.5 space-y-1">
            {rounds.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-[var(--subtle)] px-3 py-1.5 text-sm"
              >
                <span className="min-w-0">
                  <span className="font-semibold tabular-nums">{r.gross}</span>{" "}
                  <span className="text-[var(--muted)]">
                    {r.holes === 9 ? "· 9 holes " : ""}
                    {r.courseName ? `· ${r.courseName} ` : ""}· {new Date(r.at).toLocaleDateString()}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    removePastRound(r.id);
                    setRounds(pastRoundsFor(name));
                  }}
                  className="shrink-0 text-xs font-semibold text-rose-400 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={!name}
            className="mt-2 w-full rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--hover)] disabled:opacity-50"
          >
            + Add a round you already played
          </button>
        ) : (
          <div className="mt-2 space-y-2 rounded-lg border border-dashed border-[var(--border)] p-3">
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col">
                <span className="text-[11px] text-[var(--muted)]">Date</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
              </label>
              <label className="flex flex-col">
                <span className="text-[11px] text-[var(--muted)]">Holes</span>
                <select
                  value={holes}
                  onChange={(e) => setHoles(Number(e.target.value))}
                  className={field}
                >
                  <option value={18}>18</option>
                  <option value={9}>9</option>
                </select>
              </label>
              <label className="flex flex-col">
                <span className="text-[11px] text-[var(--muted)]">Score</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={gross}
                  onChange={(e) => setGross(e.target.value)}
                  placeholder="86"
                  className={`${field} w-20 text-center tabular-nums`}
                />
              </label>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col flex-1 min-w-[9rem]">
                <span className="text-[11px] text-[var(--muted)]">Course</span>
                <input
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="Where you played"
                  className={field}
                />
              </label>
              <label className="flex flex-col">
                <span className="text-[11px] text-[var(--muted)]">Rating</span>
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  placeholder="71.2"
                  className={`${field} w-20 text-center tabular-nums`}
                />
              </label>
              <label className="flex flex-col">
                <span className="text-[11px] text-[var(--muted)]">Slope</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={slope}
                  onChange={(e) => setSlope(e.target.value)}
                  className={`${field} w-20 text-center tabular-nums`}
                />
              </label>
            </div>
            {teeOptions.length > 0 && (
              <label className="flex flex-col">
                <span className="text-[11px] text-[var(--muted)]">
                  Or take the rating and slope from a saved course
                </span>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const pick = teeOptions.find((o) => o.key === e.target.value);
                    if (!pick) return;
                    setCourseName(pick.course);
                    setRating(String(pick.tee.rating));
                    setSlope(String(pick.tee.slope));
                  }}
                  className={field}
                >
                  <option value="">Pick a course and tee…</option>
                  {teeOptions.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.course} · {o.tee.name} ({o.tee.rating}/{o.tee.slope})
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button className="px-3 py-2 text-sm" onClick={addRound} disabled={!canAdd}>
                Add round
              </Button>
              <Button variant="outline" className="px-3 py-2 text-sm" onClick={() => setOpen(false)}>
                Done
              </Button>
              {preview != null && (
                <span className="text-xs text-[var(--muted)] tabular-nums">
                  Differential {preview.toFixed(1)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--muted)]">
              Rating and slope come off the scorecard for the tees you played. A 9-hole round pairs
              with the next one, the same as a nine played here.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
