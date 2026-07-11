"use client";

import { useEffect, useRef, useState } from "react";
import { Match, Participant } from "@/lib/types";
import { useStore } from "@/lib/store";
import { canEditScores } from "@/lib/perms";
import { colorFor } from "@/lib/colors";

// One shared audio context, unlocked by any clock tap (a user gesture) so the buzzer can play.
let sharedAudio: AudioContext | null = null;
function unlockAudio() {
  if (typeof window === "undefined") return;
  if (!sharedAudio) {
    try {
      sharedAudio = new AudioContext();
    } catch {
      /* no audio support — timer still works silently */
    }
  }
  sharedAudio?.resume().catch(() => {});
}
// Three descending buzzer blasts when a clock hits zero (only where audio was unlocked).
function buzz() {
  const ctx = sharedAudio;
  if (!ctx) return;
  [0, 0.45, 0.9].forEach((delay, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = i === 2 ? 392 : 523;
    const at = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + (i === 2 ? 0.6 : 0.3));
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + (i === 2 ? 0.65 : 0.35));
  });
}

// Master control for ONE round: start/pause/reset that round's clocks — synced to all viewers.
// Only the host or a granted scorekeeper sees the controls.
export function MasterClock({
  tournamentId,
  round,
}: {
  tournamentId: string;
  round: number | null;
}) {
  const t = useStore((s) => s.tournaments.find((x) => x.id === tournamentId));
  const setRoundClock = useStore((s) => s.setRoundClock);
  if (!t || round == null || !canEditScores(t)) return null;
  const send = (action: "start" | "pause" | "reset") => {
    if (action === "start") unlockAudio();
    setRoundClock(tournamentId, round, action);
  };
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        type="button"
        onClick={() => send("start")}
        className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[var(--brand)] text-[var(--on-brand)] hover:opacity-90 transition"
      >
        ▶ Start all
      </button>
      <button
        type="button"
        onClick={() => send("pause")}
        className="text-xs px-2 py-1 rounded-md border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover)] transition"
        title="Pause this round's clocks"
      >
        ⏸
      </button>
      <button
        type="button"
        onClick={() => send("reset")}
        className="text-xs px-2 py-1 rounded-md border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover)] transition"
        title="Reset this round's clocks"
      >
        ↺
      </button>
    </div>
  );
}

// Countdown clock for timed games — driven by the synced per-match clock in tournament state,
// so the host, scorekeepers, and every spectator all see the same time tick down together.
function MatchTimer({
  minutes,
  tournamentId,
  match,
}: {
  minutes: number;
  tournamentId: string;
  match: Match;
}) {
  const total = minutes * 60;
  const t = useStore((s) => s.tournaments.find((x) => x.id === tournamentId));
  const setMatchClock = useStore((s) => s.setMatchClock);
  const clock = t?.clocks?.[match.id];
  const canControl = t ? canEditScores(t) : false;

  // Re-render every 250ms while running so the displayed time counts down locally.
  const [, force] = useState(0);
  useEffect(() => {
    if (clock?.endAt == null) return;
    const iv = setInterval(() => {
      force((n) => n + 1);
      if (Date.now() >= (clock.endAt ?? 0)) clearInterval(iv);
    }, 250);
    return () => clearInterval(iv);
  }, [clock?.endAt]);

  const running = clock?.endAt != null;
  const left =
    clock?.endAt != null
      ? Math.max(0, Math.round((clock.endAt - Date.now()) / 1000))
      : clock?.leftSec != null
        ? clock.leftSec
        : total;
  const expired = left <= 0;

  // Buzz once when it reaches zero (only fires where audio was unlocked by a tap).
  const buzzed = useRef(false);
  useEffect(() => {
    if (running && expired && !buzzed.current) {
      buzzed.current = true;
      buzz();
    }
    if (!expired) buzzed.current = false;
  }, [running, expired]);

  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");
  const act = (action: "start" | "pause" | "reset") => {
    if (action === "start") unlockAudio();
    setMatchClock(tournamentId, match.id, action);
  };

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`font-mono text-xs font-bold tabular-nums rounded-md px-1.5 py-0.5 border ${
          expired
            ? "animate-pulse bg-red-500/15 border-red-500 text-red-500"
            : running
              ? "bg-[var(--win-bg)] border-[var(--win)] text-[var(--win)]"
              : "bg-[var(--input)] border-[var(--border)] text-[var(--muted)]"
        }`}
      >
        {expired ? "TIME!" : `${mm}:${ss}`}
      </span>
      {canControl && !expired && (
        <button
          type="button"
          onClick={() => act(running ? "pause" : "start")}
          className="text-xs px-1.5 py-0.5 rounded-md border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover)] transition"
          title={running ? "Pause clock" : "Start clock"}
        >
          {running ? "⏸" : "▶"}
        </button>
      )}
      {canControl && (expired || (!running && left < total)) && (
        <button
          type="button"
          onClick={() => act("reset")}
          className="text-xs px-1.5 py-0.5 rounded-md border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover)] transition"
          title="Reset clock"
        >
          ↺
        </button>
      )}
    </div>
  );
}

function Side({
  ids,
  label,
  participants,
}: {
  ids: string[];
  label?: string;
  participants: Participant[];
}) {
  if (!ids.length) {
    return <span className="text-sm text-[var(--muted)] italic truncate">{label || "TBD"}</span>;
  }
  const ps = ids.map((id) => participants.find((p) => p.id === id)).filter(Boolean) as Participant[];
  const members = ps.flatMap((p) => p.members ?? []);
  return (
    <span className="flex items-center gap-1.5 min-w-0">
      <span className="flex -space-x-1 items-center shrink-0">
        {ids.map((id) => {
          const photo = participants.find((p) => p.id === id)?.photo;
          return photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={id}
              src={photo}
              alt=""
              className="h-5 w-5 rounded-full object-cover ring-1 ring-black/30"
            />
          ) : (
            <span
              key={id}
              className="h-2.5 w-2.5 rounded-full ring-1 ring-black/40"
              style={{ background: colorFor(participants, id) }}
            />
          );
        })}
      </span>
      <span className="min-w-0">
        <span className="block text-sm truncate">{ps.map((p) => p.name).join(" / ")}</span>
        {members.length > 0 && (
          <span className="block text-[11px] text-[var(--muted)] truncate">
            {members.join(" · ")}
          </span>
        )}
      </span>
    </span>
  );
}

function ScoreBox({
  value,
  onCommit,
  disabled,
  win,
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
  disabled: boolean;
  win: boolean;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      disabled={disabled}
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value;
        onCommit(raw === "" ? null : Number(raw));
      }}
      className={`w-12 shrink-0 rounded-md border px-1.5 py-1 text-center text-sm font-bold tabular-nums outline-none transition
        ${
          win
            ? "bg-[var(--win-bg)] border-[var(--win)] text-[var(--win)]"
            : "bg-[var(--input)] border-[var(--border)] text-[var(--foreground)] focus:border-[var(--brand)]"
        }
        ${disabled ? "opacity-40" : ""}`}
      placeholder="–"
    />
  );
}

export function MatchCard({
  tournamentId,
  participants,
  match,
}: {
  tournamentId: string;
  participants: Participant[];
  match: Match;
}) {
  const setScore = useStore((s) => s.setScore);
  const timeLimitMin = useStore(
    (s) => s.tournaments.find((t) => t.id === tournamentId)?.config.timeLimitMin ?? 0
  );
  const both = match.sideA.length > 0 && match.sideB.length > 0;
  const decided =
    match.scoreA !== null && match.scoreB !== null && match.scoreA !== match.scoreB;
  const showTimer = timeLimitMin > 0 && both && !decided;
  const aWin = decided && (match.scoreA as number) > (match.scoreB as number);
  const bWin = decided && (match.scoreB as number) > (match.scoreA as number);

  function commit(side: "A" | "B", v: number | null) {
    if (side === "A") setScore(tournamentId, match.id, v, match.scoreB);
    else setScore(tournamentId, match.id, match.scoreA, v);
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80">
      {(match.label || match.court || showTimer) && (
        <div className="px-3 pt-2 flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-widest text-[var(--muted)] font-bold">
            {[match.label, match.court ? `Court ${match.court}` : null].filter(Boolean).join(" · ")}
          </span>
          {showTimer && (
            <MatchTimer minutes={timeLimitMin} tournamentId={tournamentId} match={match} />
          )}
        </div>
      )}
      <div className="p-2.5 space-y-1.5">
        <div className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1 ${aWin ? "ring-win bg-[var(--win-bg)]" : ""}`}>
          <Side ids={match.sideA} label={match.sideALabel} participants={participants} />
          <ScoreBox value={match.scoreA} onCommit={(v) => commit("A", v)} disabled={!both} win={aWin} />
        </div>
        <div className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1 ${bWin ? "ring-win bg-[var(--win-bg)]" : ""}`}>
          <Side ids={match.sideB} label={match.sideBLabel} participants={participants} />
          <ScoreBox value={match.scoreB} onCommit={(v) => commit("B", v)} disabled={!both} win={bWin} />
        </div>
      </div>
    </div>
  );
}
