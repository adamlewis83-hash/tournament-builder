"use client";

import { useEffect, useState } from "react";
import { Tiebreaker, TIEBREAKER_LABELS, Tournament, TournamentConfig } from "@/lib/types";
import { useStore } from "@/lib/store";
import { colorForIndex } from "@/lib/colors";
import { Button, Card } from "./ui";
import { RyderSetup } from "./RyderSetup";
import { GolfSetup } from "./GolfSetup";
import { RegistrationPanel } from "./RegistrationPanel";

const SAMPLE_PLAYERS = [
  "Cody", "Adam", "Logan", "Brittany", "Joe", "Tyler",
  "Ashley", "Dustin", "Davis", "Richard", "Ryan", "Matt",
];
const SAMPLE_TEAMS = ["Net Ninjas", "Dink Dynasty", "Smash Bros", "Paddle Pirates", "Court Kings", "Spin Doctors"];

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
  const setTeamsStore = useStore((s) => s.setTeams);
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
  const isFixed = t.playStyle === "doubles-fixed";
  const isTeams = t.playStyle === "teams";
  const isSocial = t.format === "americano" || t.format === "mexicano";
  const teamMode = (isFixed || isTeams) && !isSocial; // social formats are always individuals

  const emptyTeam = () => ({ name: "", members: isFixed ? ["", ""] : [""] });
  const [teams, setLocalTeams] = useState<{ name: string; members: string[] }[]>(() => {
    if (!teamMode) return [];
    if (t.participants.length)
      return t.participants.map((p) => ({
        name: p.name,
        members: p.members?.length ? [...p.members] : isFixed ? ["", ""] : [""],
      }));
    return [emptyTeam(), emptyTeam()];
  });
  const build = (list: { name: string; members: string[] }[]) =>
    list
      .map((tm) => ({
        name: isFixed
          ? tm.members.map((m) => m.trim()).filter(Boolean).join(" & ")
          : tm.name.trim(),
        members: tm.members.map((m) => m.trim()).filter(Boolean),
      }))
      .filter((tm) => tm.name);
  const teamCount = build(teams).length;
  const update = (next: { name: string; members: string[] }[]) => {
    setLocalTeams(next);
    setTeamsStore(t.id, build(next));
  };
  const setTeamName = (ti: number, v: string) =>
    update(teams.map((tm, i) => (i === ti ? { ...tm, name: v } : tm)));
  const setMember = (ti: number, mi: number, v: string) =>
    update(
      teams.map((tm, i) =>
        i === ti ? { ...tm, members: tm.members.map((m, j) => (j === mi ? v : m)) } : tm,
      ),
    );
  const addMember = (ti: number) =>
    update(teams.map((tm, i) => (i === ti ? { ...tm, members: [...tm.members, ""] } : tm)));
  const removeMember = (ti: number, mi: number) =>
    update(
      teams.map((tm, i) =>
        i === ti ? { ...tm, members: tm.members.filter((_, j) => j !== mi) } : tm,
      ),
    );
  const addTeam = () => update([...teams, emptyTeam()]);
  const removeTeam = (ti: number) => update(teams.filter((_, i) => i !== ti));
  const fillSampleTeams = () => {
    let next: { name: string; members: string[] }[];
    if (isFixed) {
      next = [];
      for (let i = 0; i + 1 < SAMPLE_PLAYERS.length && next.length < 4; i += 2)
        next.push({ name: "", members: [SAMPLE_PLAYERS[i], SAMPLE_PLAYERS[i + 1]] });
    } else {
      next = SAMPLE_TEAMS.slice(0, 4).map((n, i) => ({
        name: n,
        members: [SAMPLE_PLAYERS[i * 2] ?? "", SAMPLE_PLAYERS[i * 2 + 1] ?? ""],
      }));
    }
    update(next);
  };

  const minNeeded =
    t.format === "double-elim"
      ? 4
      : teamMode
        ? 2
        : isSocial
          ? 4
          : t.format === "round-robin" && isDoubles
            ? 4
            : t.format === "kotc"
              ? 3
              : 2;
  const showThirdPlace =
    t.format === "single-elim" ||
    (t.format === "pool-bracket" && cfg.bracketType === "single") ||
    (t.format === "round-robin" && !isDoubles);
  const canGenerate = teamMode ? teamCount >= minNeeded : count >= minNeeded;

  function commitNames() {
    setParticipants(t.id, names);
  }

  function handleGenerate() {
    if (teamMode) setTeamsStore(t.id, build(teams));
    else setParticipants(t.id, names);
    generate(t.id);
  }

  if (t.format === "ryder")
    return (
      <div className="space-y-5">
        <RegistrationPanel t={t} />
        <RyderSetup t={t} />
      </div>
    );
  if (t.format === "golf")
    return (
      <div className="space-y-5">
        <RegistrationPanel t={t} />
        <GolfSetup t={t} />
      </div>
    );

  return (
    <div className="space-y-5">
      <RegistrationPanel t={t} />
      <div className="grid lg:grid-cols-2 gap-5">
      {teamMode ? (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold">{isFixed ? "Pairs" : "Teams"}</h2>
            <button
              type="button"
              onClick={fillSampleTeams}
              className="text-xs font-medium text-[var(--brand)] hover:text-[var(--brand-strong)]"
            >
              Fill sample
            </button>
          </div>
          <p className="text-sm text-[var(--muted)] mb-3">
            {isFixed
              ? "Two players per pair — partners stay together all event."
              : "Name each team, then add its players (2+ each)."}
          </p>
          <div className="space-y-3">
            {teams.map((tm, ti) => (
              <div key={ti} className="rounded-xl border border-[var(--border)] p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: colorForIndex(ti) }}
                  />
                  {isFixed ? (
                    <span className="flex-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                      Pair {ti + 1}
                    </span>
                  ) : (
                    <input
                      value={tm.name}
                      onChange={(e) => setTeamName(ti, e.target.value)}
                      placeholder={`Team ${ti + 1} name`}
                      className="flex-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-sm font-semibold bg-[var(--surface)]"
                    />
                  )}
                  {teams.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeTeam(ti)}
                      className="px-1 text-lg leading-none text-[var(--muted)] hover:text-[var(--danger)]"
                      title="Remove"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="space-y-1.5 pl-1">
                  {tm.members.map((m, mi) => (
                    <div key={mi} className="flex items-center gap-2">
                      <input
                        value={m}
                        onChange={(e) => setMember(ti, mi, e.target.value)}
                        placeholder={`Player ${mi + 1}`}
                        className="flex-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-sm bg-[var(--surface)]"
                      />
                      {isTeams && tm.members.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMember(ti, mi)}
                          className="px-1 text-lg leading-none text-[var(--muted)] hover:text-[var(--danger)]"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {isTeams && (
                    <button
                      type="button"
                      onClick={() => addMember(ti)}
                      className="text-xs font-medium text-[var(--brand)] hover:text-[var(--brand-strong)]"
                    >
                      + Add player
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addTeam}
            className="mt-3 text-sm font-medium text-[var(--brand)] hover:text-[var(--brand-strong)]"
          >
            + Add {isFixed ? "pair" : "team"}
          </button>
          <p className="text-sm text-[var(--muted)] mt-2">
            {teamCount} {isFixed ? "pairs" : "teams"}
          </p>
        </Card>
      ) : (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold">Participants</h2>
            <button
              type="button"
              onClick={() => setText(SAMPLE_PLAYERS.join("\n"))}
              className="text-xs font-medium text-[var(--brand)] hover:text-[var(--brand-strong)]"
            >
              Fill sample
            </button>
          </div>
        <p className="text-sm text-[var(--muted)] mb-3">
          One per line.{" "}
          {t.format === "single-elim" || t.format === "double-elim"
            ? "Order = seeding (top seed first)."
            : isDoubles
              ? "Individuals — partners rotate each round."
              : isTeams
                ? "Name each team (e.g. “Net Ninjas” or “Cody & Adam”)."
                : "Each line is a player."}
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitNames}
          rows={10}
          placeholder={isTeams ? "Net Ninjas\nDink Dynasty\nCody & Adam\n…" : "Cody\nAdam\nLogan\nBrittany\n…"}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-mono bg-[var(--surface)]"
        />
        <p className="text-sm text-[var(--muted)] mt-2">{count} entered</p>
        {count > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {names.slice(0, 40).map((n, i) => (
              <span
                key={`${n}-${i}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--subtle)] px-2 py-0.5 text-xs"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: colorForIndex(i) }}
                />
                {n}
              </span>
            ))}
          </div>
        )}
        </Card>
      )}

      <Card className="p-5 flex flex-col">
        <h2 className="font-semibold mb-3">Settings</h2>
        <div className="grid grid-cols-2 gap-4">
          {((t.format === "round-robin" && isDoubles) || t.format === "swiss" || isSocial) && (
            <NumberField
              label="Rounds"
              value={cfg.rounds}
              min={1}
              max={20}
              onChange={(v) => setCfg({ rounds: v })}
              hint={t.format === "swiss" ? "Swiss rounds" : "Rounds everyone plays"}
            />
          )}
          {(t.format === "round-robin" ||
            t.format === "pool-bracket" ||
            t.format === "swiss" ||
            isSocial) && (
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
              label="Bracket size"
              value={cfg.advanceCount}
              min={2}
              max={64}
              onChange={(v) => setCfg({ advanceCount: v })}
              hint="How many make the bracket (caps at your field — leave high for the whole field)"
            />
          )}
          {t.format === "kotc" && (
            <NumberField
              label="Wins to win the crown"
              value={cfg.advanceCount}
              min={1}
              max={50}
              onChange={(v) => setCfg({ advanceCount: v })}
              hint="First to this many wins"
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
          <NumberField
            label="Time limit (min)"
            value={cfg.timeLimitMin ?? 0}
            min={0}
            max={180}
            onChange={(v) => setCfg({ timeLimitMin: v })}
            hint="0 = no clock. Points or time — whichever first"
          />
          {t.format === "pool-bracket" && (
            <label className="block">
              <span className="text-sm font-medium">Bracket type</span>
              <select
                value={cfg.bracketType}
                onChange={(e) => setCfg({ bracketType: e.target.value as "single" | "double" })}
                className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-[var(--surface)]"
              >
                <option value="single">Single elimination</option>
                <option value="double">Double elimination</option>
              </select>
            </label>
          )}
          {(t.format === "round-robin" ||
            t.format === "pool-bracket" ||
            t.format === "swiss" ||
            t.format === "kotc") && (
            <label className="block col-span-2">
              <span className="text-sm font-medium">Tiebreaker</span>
              <select
                value={cfg.tiebreaker ?? "diff"}
                onChange={(e) => setCfg({ tiebreaker: e.target.value as Tiebreaker })}
                className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-[var(--surface)]"
              >
                {(Object.keys(TIEBREAKER_LABELS) as Tiebreaker[]).map((k) => (
                  <option key={k} value={k}>
                    {TIEBREAKER_LABELS[k]}
                  </option>
                ))}
              </select>
              <span className="text-xs text-[var(--muted)]">
                How to rank players with the same win-loss record
              </span>
            </label>
          )}
          {showThirdPlace && (
            <label className="col-span-2 flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={cfg.thirdPlace ?? false}
                onChange={(e) => setCfg({ thirdPlace: e.target.checked })}
                className="h-4 w-4 accent-[var(--brand)]"
              />
              <span className="text-sm font-medium">
                Add a 3rd-place game{" "}
                <span className="text-[var(--muted)] font-normal">(semifinal losers play off)</span>
              </span>
            </label>
          )}
        </div>

        <div className="mt-auto pt-5">
          {!canGenerate && (
            <p className="text-sm text-amber-500 mb-2">
              {t.format === "double-elim"
                ? `Double elimination needs at least 4 ${teamMode ? "teams" : "players"} — try Single Elimination for a smaller field.`
                : `Add at least ${minNeeded} ${teamMode ? "teams" : "participants"} to generate.`}
            </p>
          )}
          <Button onClick={handleGenerate} disabled={!canGenerate} className="w-full">
            {t.format === "swiss" || isSocial
              ? "Generate Round 1 →"
              : t.format === "kotc"
                ? "Start — Game 1 →"
                : t.format === "round-robin" || t.format === "pool-bracket"
                  ? "Generate schedule →"
                  : "Generate bracket →"}
          </Button>
        </div>
      </Card>
      </div>
    </div>
  );
}
