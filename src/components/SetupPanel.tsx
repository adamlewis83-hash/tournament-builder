"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Tiebreaker, TIEBREAKER_LABELS, Tournament, TournamentConfig } from "@/lib/types";
import { useStore } from "@/lib/store";
import { winMargin } from "@/lib/score";
import { colorForIndex } from "@/lib/colors";
import { getProfile } from "@/lib/profile";
import { Button, Card } from "./ui";
import { RyderSetup } from "./RyderSetup";
import { GolfSetup } from "./GolfSetup";
import { RegistrationPanel } from "./RegistrationPanel";
import { FriendPicker } from "./FriendPicker";

// Sample data is generated on demand for however many entries the host wants to test with.
const samplePlayers = (n: number) => Array.from({ length: n }, (_, i) => `Player ${i + 1}`);

// Spell out what "top N advance" actually produces. N counts PLAYERS, and in
// doubles they pair off (best-with-worst), so N players become N/2 teams — which
// is why "top 4" in doubles is a single final, not a bracket. Showing the real
// shape live beats making people infer it.
function finalsPreview(n: number, doubles: boolean, playerCount: number): string {
  const advancing = Math.max(0, Math.min(n, playerCount));
  const teams = doubles ? Math.floor(advancing / 2) : advancing;
  if (playerCount === 0) return "Add players to preview the bracket.";
  if (teams < 2)
    return doubles
      ? `Top ${advancing} players → ${teams} team — need at least 4 to make a bracket.`
      : `Top ${advancing} → need at least 2 for a bracket.`;
  const games = teams - 1;
  const rounds = Math.ceil(Math.log2(teams));
  const shape =
    rounds === 1
      ? "Final only"
      : rounds === 2
        ? "Semifinals → Final"
        : rounds === 3
          ? "Quarterfinals → Final"
          : `${rounds} rounds → Final`;
  const g = `${games} game${games > 1 ? "s" : ""}`;
  if (!doubles) return `Top ${advancing} → ${shape} (${g})`;
  // An odd number can't pair evenly — generateFinals drops the middle seed.
  const odd = advancing % 2 === 1 ? ` · seed ${Math.floor(advancing / 2) + 1} is left out — use an even number` : "";
  return `Top ${advancing} players → ${teams} teams → ${shape} (${g})${odd}`;
}

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
  const saveFriend = useStore((s) => s.saveFriend);
  const patch = useStore((s) => s.patchTournament);
  const generate = useStore((s) => s.generate);

  const [text, setText] = useState(t.participants.map((p) => p.name).join("\n"));
  // Raw text so the box can be cleared/edited freely; clamped to 2–64 only when used.
  const [sampleN, setSampleN] = useState("16");
  const sampleCount = Math.max(2, Math.min(64, Math.round(Number(sampleN) || 2)));

  // Host isn't automatically a player — let them add themselves from their profile.
  const [profileName, setProfileName] = useState("");
  useEffect(() => setProfileName(getProfile().name.trim()), []);
  const names = text
    .split(/[\n,]/)
    .map((n) => n.trim())
    .filter(Boolean);
  const count = names.length;

  const meAdded =
    !!profileName && names.some((n) => n.toLowerCase() === profileName.toLowerCase());
  const addMe = () => {
    if (!profileName || meAdded) return;
    setText((prev) => {
      const cleaned = prev.replace(/\n+$/, "");
      return cleaned ? `${cleaned}\n${profileName}` : profileName;
    });
  };
  const removeMe = () =>
    setText((prev) =>
      prev
        .split("\n")
        .filter((l) => l.trim().toLowerCase() !== profileName.toLowerCase())
        .join("\n"),
    );

  // Friends: tap a saved friend to append them; save the current roster as friends.
  const addFriendName = (name: string) =>
    setText((prev) => {
      if (
        prev
          .split(/[\n,]/)
          .some((l) => l.trim().toLowerCase() === name.trim().toLowerCase())
      )
        return prev;
      const cleaned = prev.replace(/\n+$/, "");
      return cleaned ? `${cleaned}\n${name}` : name;
    });
  const saveNamesAsFriends = () => names.forEach((n) => saveFriend({ name: n }));

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

  // How many courts can actually run at once: each game needs 4 players in doubles/social
  // (two 2-person sides) or 2 in singles/teams. Courts beyond floor(field / perGame) sit idle,
  // so surface the real cap instead of silently generating fewer than the host picked.
  const perGame = (t.format === "round-robin" && isDoubles) || isSocial ? 4 : 2;
  const fieldSize = teamMode ? teamCount : count;
  const maxCourts = Math.max(1, Math.floor(fieldSize / perGame));
  const courtsCapped = fieldSize > 0 && cfg.courts > maxCourts;

  // Rotating-partner formats build exactly `rounds × games-per-round` games, and games
  // per round are capped by courts — not by headcount. So a big field can outrun the
  // schedule: past that many seats, players simply never get a game. (Singles round-robin
  // pairs everyone with everyone, so it can't run out.) Warn rather than silently bench.
  // Formats whose draw is built from the roster order. Golf/ladder/score-challenge have
  // no draw to shuffle, and Ryder builds its own sessions with a shuffle of its own.
  const isBracket = t.format === "single-elim" || t.format === "double-elim" || t.format === "pool-bracket";
  const drawOrderMatters =
    isBracket || t.format === "round-robin" || t.format === "swiss" || t.format === "kotc" || isSocial;

  const rotatingField = (t.format === "round-robin" && isDoubles) || isSocial;
  const seatsPerRound = Math.min(Math.max(1, cfg.courts), maxCourts) * perGame;
  const seats = cfg.rounds * seatsPerRound;
  const benched = rotatingField && fieldSize > 0 ? Math.max(0, fieldSize - seats) : 0;
  const roundsForAll = seatsPerRound > 0 ? Math.ceil(fieldSize / seatsPerRound) : 0;
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
    const next = Array.from({ length: sampleCount }, (_, i) => ({
      name: isFixed ? "" : `Team ${i + 1}`,
      members: [`Player ${i * 2 + 1}`, `Player ${i * 2 + 2}`],
    }));
    update(next);
  };

  const minNeeded =
    t.format === "double-elim"
      ? 4
      : t.format === "kotc"
        ? 3 // winner stays on, loser rotates out, next challenges — needs ≥3 sides
        : teamMode
          ? 2
          : isSocial
            ? 4
            : t.format === "round-robin" && isDoubles
              ? 4
              : 2;
  // Bronze / 3rd-place option — offered for every bracket-producing format (singles & doubles).
  const showBronze =
    t.format === "single-elim" ||
    (t.format === "pool-bracket" && cfg.bracketType === "single") ||
    t.format === "round-robin";
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
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={2}
                max={64}
                value={sampleN}
                onChange={(e) => setSampleN(e.target.value)}
                onBlur={() => setSampleN(String(sampleCount))}
                aria-label={isFixed ? "Number of sample pairs" : "Number of sample teams"}
                className="w-12 rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1 text-xs text-center tabular-nums outline-none focus:border-[var(--brand)]"
              />
              <button
                type="button"
                onClick={fillSampleTeams}
                className="text-xs font-medium text-[var(--brand)] hover:text-[var(--brand-strong)]"
              >
                Fill sample
              </button>
            </div>
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
          <div className="flex items-center justify-between mb-1 gap-2">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">Participants</h2>
              {profileName && (
                <button
                  type="button"
                  onClick={meAdded ? removeMe : addMe}
                  title={
                    meAdded
                      ? `Remove ${profileName} from this tournament`
                      : `Add ${profileName} (from your profile) as a player`
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
              {!profileName && (
                <Link
                  href="/settings"
                  title="Set your name in your profile, then add yourself as a player"
                  className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-medium text-[var(--muted)] hover:bg-[var(--hover)]"
                >
                  + Add me
                </Link>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={2}
                max={64}
                value={sampleN}
                onChange={(e) => setSampleN(e.target.value)}
                onBlur={() => setSampleN(String(sampleCount))}
                aria-label="Number of sample players"
                className="w-12 rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1 text-xs text-center tabular-nums outline-none focus:border-[var(--brand)]"
              />
              <button
                type="button"
                onClick={() => setText(samplePlayers(sampleCount).join("\n"))}
                className="text-xs font-medium text-[var(--brand)] hover:text-[var(--brand-strong)]"
              >
                Fill sample
              </button>
            </div>
          </div>
        <p className="text-sm text-[var(--muted)] mb-3">
          One per line.{" "}
          {t.format === "single-elim" || t.format === "double-elim"
            ? "Order = seeding (top seed first)."
            : isDoubles
              ? "Individuals — partners rotate each round."
              : isTeams
                ? "Name each team (e.g. “Team 1” or “Player 1 & Player 2”)."
                : "Each line is a player."}
        </p>
        <div className="mb-3">
          <FriendPicker
            addedNames={new Set(names.map((n) => n.toLowerCase()))}
            onAdd={(f) => addFriendName(f.name)}
          />
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitNames}
          rows={10}
          placeholder={isTeams ? "Team 1\nTeam 2\nTeam 3\n…" : "Player 1\nPlayer 2\nPlayer 3\nPlayer 4\n…"}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-mono bg-[var(--surface)]"
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-sm text-[var(--muted)]">{count} entered</p>
          {count > 0 && (
            <button
              type="button"
              onClick={saveNamesAsFriends}
              title="Save everyone here to your friends list for next time"
              className="text-xs font-medium text-[var(--brand)] hover:text-[var(--brand-strong)]"
            >
              Save as friends
            </button>
          )}
        </div>
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
          {((t.format === "round-robin" && isDoubles) ||
            t.format === "swiss" ||
            isSocial ||
            t.format === "score-challenge") && (
            <NumberField
              label={t.format === "score-challenge" ? "Rounds / games" : "Rounds"}
              value={cfg.rounds}
              min={1}
              max={20}
              onChange={(v) => setCfg({ rounds: v })}
              hint={
                t.format === "swiss"
                  ? "Swiss rounds"
                  : t.format === "score-challenge"
                    ? "How many scores each player posts"
                    : "Rounds everyone plays"
              }
            />
          )}
          {drawOrderMatters && (
            <label className="col-span-2 flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2">
              <span className="text-sm">
                <span className="font-medium">Random draw</span>
                <span className="block text-xs text-[var(--muted)]">
                  {(cfg.randomDraw ?? true)
                    ? isBracket
                      ? "Seeds are drawn at random — regenerate for a new draw."
                      : "Partners and matchups are drawn at random — regenerate for a new draw."
                    : isBracket
                      ? "Off: the order you type is the seed order (first plays last)."
                      : "Off: matchups follow the order you type players in."}
                </span>
              </span>
              <input
                type="checkbox"
                checked={cfg.randomDraw ?? true}
                onChange={(e) => setCfg({ randomDraw: e.target.checked })}
                className="h-5 w-5 shrink-0 accent-[var(--brand)]"
              />
            </label>
          )}
          {t.format === "score-challenge" && (
            <label className="col-span-2 flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2">
              <span className="text-sm">
                <span className="font-medium">Lowest total wins</span>
                <span className="block text-xs text-[var(--muted)]">
                  On for disc golf / fewest-strokes; off = highest total wins (bowling, pop-a-shot).
                </span>
              </span>
              <input
                type="checkbox"
                checked={cfg.scoreLowWins}
                onChange={(e) => setCfg({ scoreLowWins: e.target.checked })}
                className="h-5 w-5 shrink-0 accent-[var(--brand)]"
              />
            </label>
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
          {(t.format === "round-robin" || t.format === "swiss" || isSocial) && courtsCapped && (
            <p className="col-span-2 -mt-2 text-xs text-amber-500">
              With {fieldSize} {teamMode ? "teams" : "players"} only {maxCourts}{" "}
              {maxCourts === 1 ? "court runs" : "courts run"} at once ({perGame} per game) — the other{" "}
              {cfg.courts - maxCourts} sit idle. Add {(maxCourts + 1) * perGame - fieldSize} more{" "}
              {teamMode ? "teams" : "players"} to fill another court.
            </p>
          )}
          {benched > 0 && (
            <p className="col-span-2 -mt-2 text-xs text-amber-500">
              {benched} of your {fieldSize} players never get a game — {cfg.rounds}{" "}
              {cfg.rounds === 1 ? "round" : "rounds"} on {Math.min(cfg.courts, maxCourts)}{" "}
              {Math.min(cfg.courts, maxCourts) === 1 ? "court" : "courts"} is only {seats} spots. Use{" "}
              {roundsForAll} {roundsForAll === 1 ? "round" : "rounds"} (or add courts) so everyone plays.
            </p>
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
              label="Finals: top N players advance"
              value={cfg.advanceCount}
              min={2}
              max={64}
              onChange={(v) => setCfg({ advanceCount: v })}
              hint={`${finalsPreview(cfg.advanceCount, isDoubles, count)} — the top finishers in the standings seed a knockout bracket (see the Bracket tab). Leave it at/above your player count to include everyone.`}
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
            hint="Scoring target — live scoring ends the game here"
          />
          <NumberField
            label="Win by"
            value={winMargin(cfg)}
            min={1}
            max={10}
            onChange={(v) => setCfg({ winBy: v, winByTwo: undefined })}
            hint={
              winMargin(cfg) > 1
                ? `Keeps playing at ${cfg.pointsTo}–${Math.max(0, cfg.pointsTo - 1)} until someone leads by ${winMargin(cfg)}. 1 = first to ${cfg.pointsTo} wins.`
                : `First side to ${cfg.pointsTo} wins, even by one point. Set 2 for pickleball or tennis.`
            }
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
          {(t.format === "round-robin" ||
            t.format === "pool-bracket" ||
            t.format === "swiss" ||
            t.format === "kotc") && (
            <label className="col-span-2 flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={cfg.rankByWinPct ?? false}
                onChange={(e) => setCfg({ rankByWinPct: e.target.checked })}
                className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
              />
              <span className="text-sm font-medium">
                Rank by win %{" "}
                <span className="text-[var(--muted)] font-normal">
                  (wins ÷ games played — fairer when byes leave some players a game short)
                </span>
              </span>
            </label>
          )}
          {showBronze && (
            <label className="col-span-2 flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={cfg.bronzeMatch ?? cfg.thirdPlace ?? false}
                onChange={(e) => setCfg({ bronzeMatch: e.target.checked })}
                className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
              />
              <span className="text-sm font-medium">
                Bronze medal match{" "}
                <span className="text-[var(--muted)] font-normal">
                  {t.format === "round-robin"
                    ? isDoubles
                      ? "(play off for 3rd — semifinal losers, or seeds 5 & 8 vs 6 & 7 when the final is just two teams)"
                      : "(play off for 3rd — semifinal losers, or seeds 5 & 6 when the final is just two)"
                    : "(the two semifinal losers play off for 3rd place)"}
                </span>
              </span>
            </label>
          )}
        </div>

        <div className="mt-auto pt-5">
          {(t.format === "single-elim" || t.format === "double-elim") && (
            <h3 className="mb-1 font-semibold">Seed the bracket</h3>
          )}
          {!canGenerate && (
            <p className="text-sm text-amber-500 mb-2">
              {t.format === "double-elim"
                ? `Double elimination needs at least 4 ${teamMode ? "teams" : "players"} — try Single Elimination for a smaller field.`
                : `Add at least ${minNeeded} ${isFixed ? "pairs" : teamMode ? "teams" : "participants"} to generate.`}
            </p>
          )}
          <Button onClick={handleGenerate} disabled={!canGenerate} className="w-full">
            {t.format === "custom"
              ? "Start — build matches →"
              : t.format === "ladder"
                ? "Start the ladder →"
                : t.format === "score-challenge"
                  ? "Start scoring →"
                : t.format === "swiss" || isSocial
                ? "Generate Round 1 →"
                : t.format === "kotc"
                  ? "Start — Game 1 →"
                  : t.format === "round-robin" || t.format === "pool-bracket"
                    ? "Generate schedule →"
                    : "Seed it → generate bracket"}
          </Button>
        </div>
      </Card>
      </div>
    </div>
  );
}
