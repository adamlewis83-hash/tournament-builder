"use client";

import { useState } from "react";
import { Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import { effectiveHandicap } from "@/lib/golf";
import { CourseSearchResult, importCourse, searchCourses } from "@/lib/courseApi";
import { colorFor } from "@/lib/colors";
import { Avatar } from "./Avatar";
import { PhotoCropper } from "./PhotoCropper";
import { AvatarStylePicker } from "./AvatarStylePicker";
import { Card } from "./ui";

// Host tool: tap any player's avatar to add/replace a photo (it then shows instead
// of initials everywhere — cards, standings, brackets). Collapsed by default so the
// tournament page stays clean; photos ride along in live sync like registration ones.
export function PlayerPhotos({ t }: { t: Tournament }) {
  const setPhoto = useStore((s) => s.setParticipantPhoto);
  const setColor = useStore((s) => s.setParticipantColor);
  const setHandicap = useStore((s) => s.setGolfHandicap);
  const setTee = useStore((s) => s.setGolfTee);
  const setCourseTees = useStore((s) => s.setGolfTees);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<{ pid: string; file: File } | null>(null);
  const [choosing, setChoosing] = useState<string | null>(null); // participant id
  const [teeForm, setTeeForm] = useState<{ name: string; rating: string; slope: string } | null>(
    null,
  );
  const [teeQuery, setTeeQuery] = useState("");
  const [teeResults, setTeeResults] = useState<CourseSearchResult[]>([]);
  const [teeSearching, setTeeSearching] = useState(false);
  const [teeNotConfigured, setTeeNotConfigured] = useState(false);
  if (t.spectator || t.participants.length === 0) return null;

  const golfy = t.format === "golf" || t.format === "ryder"; // handicaps apply
  const tees = t.format === "golf" ? t.golf?.tees ?? [] : [];
  const totalPar = (t.golf?.pars ?? []).reduce((a, b) => a + b, 0) || 72;
  const chooser = choosing ? t.participants.find((p) => p.id === choosing) : null;

  // Add/remove tee boxes on a round already in progress — same as setup, so you can
  // dial in the tees you're actually playing even after the scorecard has started.
  function addTee() {
    if (!teeForm) return;
    const name = teeForm.name.trim();
    if (!name || tees.some((x) => x.name.toLowerCase() === name.toLowerCase())) return;
    const rating = Number(teeForm.rating) || totalPar;
    const slope = Number(teeForm.slope) || 113;
    setCourseTees(t.id, [...tees, { name, rating, slope, par: totalPar }]);
    setTeeForm(null);
  }
  function removeTee(name: string) {
    setCourseTees(
      t.id,
      tees.filter((x) => x.name !== name),
    );
  }

  // Pull real tee boxes off the course database — pick your course, its tees (with
  // rating/slope) become tap-to-select options. No typing.
  async function runTeeSearch() {
    if (teeQuery.trim().length < 2) return;
    setTeeSearching(true);
    const r = await searchCourses(teeQuery.trim());
    setTeeNotConfigured(!!r.notConfigured);
    setTeeResults(r.courses);
    setTeeSearching(false);
  }
  async function pickCourseTees(id: number) {
    const c = await importCourse(id);
    if (c?.tees?.length) {
      // Only load the tees — leave the in-progress card's pars/holes/scores untouched.
      setCourseTees(t.id, c.tees);
      setTeeResults([]);
      setTeeQuery("");
    }
  }

  return (
    <Card className="p-4">
      {chooser && (
        <AvatarStylePicker
          name={chooser.name}
          color={chooser.color}
          hasPhoto={!!chooser.photo}
          onCancel={() => setChoosing(null)}
          onColor={(hex) => {
            setColor(t.id, chooser.id, hex);
            setChoosing(null);
          }}
          onFile={(f) => {
            setChoosing(null);
            setPending({ pid: chooser.id, file: f });
          }}
        />
      )}
      {pending && (
        <PhotoCropper
          file={pending.file}
          onCancel={() => setPending(null)}
          onDone={(dataUrl) => {
            setPhoto(t.id, pending.pid, dataUrl);
            setPending(null);
          }}
        />
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="font-semibold text-sm">
          {golfy ? "Players — photos, colors & handicaps" : "Player photos & colors"}
        </span>
        <span className="text-xs text-[var(--muted)]">
          {open ? "▾ Hide" : "▸ Customize players"}
        </span>
      </button>
      {open && (
        <>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Tap a player to pick their circle color or add a photo
            {golfy
              ? tees.length
                ? "; edit handicap index or tees here anytime — net scores update instantly"
                : "; edit handicaps here anytime — net scores update instantly"
              : ""}{" "}
            — shown on match cards, standings, and brackets.
          </p>
          {t.format === "golf" && (
            <div className="mt-3 rounded-lg border border-[var(--border)] p-2.5 space-y-2">
              <span className="block text-xs font-medium text-[var(--muted)]">
                Tee boxes{tees.length > 0 ? " — tap ✕ to remove; pick each player's below" : ""}
              </span>

              {/* Search the course database → its tee boxes load as pickable options, no typing. */}
              <div>
                <div className="flex gap-2">
                  <input
                    value={teeQuery}
                    onChange={(e) => setTeeQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        runTeeSearch();
                      }
                    }}
                    placeholder="Search your course — e.g. Bandon Dunes"
                    className="flex-1 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--input)] px-2.5 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={runTeeSearch}
                    disabled={teeSearching || teeQuery.trim().length < 2}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--hover)] disabled:opacity-40"
                  >
                    {teeSearching ? "…" : "Search"}
                  </button>
                </div>
                {teeNotConfigured && (
                  <p className="mt-1 text-[11px] text-amber-400">
                    Course search isn&apos;t set up yet — add your tees manually below.
                  </p>
                )}
                {teeResults.length > 0 && (
                  <div className="mt-1.5 rounded-lg border border-[var(--border)] divide-y divide-[var(--border)] max-h-44 overflow-auto">
                    {teeResults.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => pickCourseTees(r.id)}
                        className="w-full text-left px-2.5 py-1.5 text-sm hover:bg-[var(--hover)]"
                      >
                        <div className="font-medium">{r.name}</div>
                        {r.location && (
                          <div className="text-[11px] text-[var(--muted)]">{r.location}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {tees.length === 0 && !teeForm && teeResults.length === 0 && (
                <p className="text-[11px] text-[var(--muted)]">
                  Search your course above to load its real tee boxes (Blue, White, Gold…) — then
                  just tap the one each player uses and handicaps adjust automatically.
                </p>
              )}

              {tees.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tees.map((tee) => (
                    <span
                      key={tee.name}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--subtle)] pl-2.5 pr-1.5 py-1 text-xs"
                    >
                      <span className="font-semibold">{tee.name}</span>
                      <span className="text-[var(--muted)] tabular-nums">
                        {tee.rating.toFixed(1)} / {tee.slope}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeTee(tee.name)}
                        aria-label={`Remove ${tee.name}`}
                        className="text-[var(--muted)] hover:text-rose-400 px-0.5"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Manual fallback for a course the database doesn't have. */}
              <div>
                <button
                  type="button"
                  onClick={() => setTeeForm(teeForm ? null : { name: "", rating: "", slope: "" })}
                  className="text-xs text-[var(--brand)] hover:text-[var(--brand-strong)] font-medium"
                >
                  {teeForm ? "Cancel" : tees.length ? "+ Add another tee" : "Can't find it? Enter a tee manually"}
                </button>
                {teeForm && (
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <label className="text-[11px] text-[var(--muted)]">
                      Name
                      <input
                        value={teeForm.name}
                        onChange={(e) => setTeeForm({ ...teeForm, name: e.target.value })}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTee())}
                        placeholder="Blue"
                        className="mt-0.5 block w-24 rounded-lg border border-[var(--border)] bg-[var(--input)] px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-[11px] text-[var(--muted)]">
                      Rating
                      <input
                        type="number"
                        step="0.1"
                        inputMode="decimal"
                        value={teeForm.rating}
                        onChange={(e) => setTeeForm({ ...teeForm, rating: e.target.value })}
                        placeholder={String(totalPar)}
                        className="mt-0.5 block w-20 rounded-lg border border-[var(--border)] bg-[var(--input)] px-2 py-1.5 text-sm tabular-nums"
                      />
                    </label>
                    <label className="text-[11px] text-[var(--muted)]">
                      Slope
                      <input
                        type="number"
                        inputMode="numeric"
                        value={teeForm.slope}
                        onChange={(e) => setTeeForm({ ...teeForm, slope: e.target.value })}
                        placeholder="113"
                        className="mt-0.5 block w-20 rounded-lg border border-[var(--border)] bg-[var(--input)] px-2 py-1.5 text-sm tabular-nums"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={addTee}
                      disabled={!teeForm.name.trim()}
                      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--hover)] disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {t.participants.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] pl-1 pr-2 py-1"
              >
                <button
                  type="button"
                  className="cursor-pointer"
                  title={`Avatar style for ${p.name}`}
                  onClick={() => setChoosing(p.id)}
                >
                  <Avatar
                    name={p.name}
                    color={colorFor(t.participants, p.id)}
                    photo={p.photo}
                    className="h-8 w-8 text-[11px]"
                  />
                </button>
                <span className="text-sm font-medium">{p.name}</span>
                {golfy && (
                  <span className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
                    {tees.length ? "index" : "hcp"}
                    <input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      value={p.handicap ?? ""}
                      onChange={(e) =>
                        setHandicap(
                          t.id,
                          p.id,
                          e.target.value === "" ? 0 : Number(e.target.value),
                        )
                      }
                      placeholder="0"
                      className="w-12 rounded border border-[var(--border)] bg-[var(--input)] px-1 py-0.5 text-center text-xs tabular-nums outline-none focus:border-[var(--brand)]"
                    />
                    {tees.length > 0 && (
                      <>
                        <select
                          value={p.tee ?? tees[0].name}
                          onChange={(e) => setTee(t.id, p.id, e.target.value)}
                          title={`Tees for ${p.name} — course handicap updates instantly`}
                          className="rounded border border-[var(--border)] bg-[var(--input)] px-1 py-0.5 text-xs outline-none focus:border-[var(--brand)] max-w-[6rem]"
                        >
                          {tees.map((x) => (
                            <option key={x.name} value={x.name}>
                              {x.name}
                            </option>
                          ))}
                        </select>
                        <span
                          className="font-semibold text-[var(--brand)] tabular-nums"
                          title="Course handicap from these tees"
                        >
                          →{effectiveHandicap(t.golf, p)}
                        </span>
                      </>
                    )}
                  </span>
                )}
                {p.photo && (
                  <button
                    type="button"
                    onClick={() => setPhoto(t.id, p.id, null)}
                    title="Remove photo"
                    className="text-[var(--muted)] hover:text-rose-400 text-xs px-0.5"
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
