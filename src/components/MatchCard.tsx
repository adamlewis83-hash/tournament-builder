"use client";

import { useEffect, useRef, useState } from "react";
import { Match, Participant } from "@/lib/types";
import { useStore } from "@/lib/store";
import { colorFor } from "@/lib/colors";

type ClockAction = "start" | "pause" | "reset";
type ClockSignal = { action: ClockAction; round: number | null };
const clockEvent = (tournamentId: string) => `sporos-clock:${tournamentId}`;

// Master control for ONE round: broadcasts start/pause/reset to that round's clocks only.
// `round = null` would target every clock; we always scope to a round here.
export function MasterClock({
  tournamentId,
  round,
}: {
  tournamentId: string;
  round: number | null;
}) {
  function send(action: ClockAction) {
    const detail: ClockSignal = { action, round };
    window.dispatchEvent(new CustomEvent(clockEvent(tournamentId), { detail }));
  }
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

// Countdown clock for timed games ("first to N points or M minutes").
// Runs locally on the scorer's device; not synced.
function MatchTimer({
  minutes,
  tournamentId,
  round,
}: {
  minutes: number;
  tournamentId: string;
  round: number;
}) {
  const total = minutes * 60;
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const endAt = useRef<number | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const leftRef = useRef(total);
  leftRef.current = left;

  function unlockAudio() {
    if (!audio.current) {
      try {
        audio.current = new AudioContext();
      } catch {
        /* no audio support — timer still works silently */
      }
    }
    audio.current?.resume().catch(() => {});
  }

  // Obey the master clock (start/pause/reset all courts at once).
  useEffect(() => {
    const name = clockEvent(tournamentId);
    const onMaster = (e: Event) => {
      const { action, round: target } = (e as CustomEvent).detail as ClockSignal;
      if (target !== null && target !== round) return; // not this round — ignore
      if (action === "start") {
        if (leftRef.current <= 0) return; // already expired — don't restart/re-buzz
        unlockAudio(); // master tap is a user gesture; dispatch is synchronous
        setRunning(true);
      } else if (action === "pause") {
        setRunning(false);
      } else {
        setRunning(false);
        setLeft(total);
      }
    };
    window.addEventListener(name, onMaster);
    return () => window.removeEventListener(name, onMaster);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, total, round]);

  // Three descending buzzer blasts when the clock hits zero.
  function buzz() {
    const ctx = audio.current;
    if (!ctx) return;
    [0, 0.45, 0.9].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = i === 2 ? 392 : 523; // last blast lower
      const t = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + (i === 2 ? 0.6 : 0.3));
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + (i === 2 ? 0.65 : 0.35));
    });
  }

  useEffect(() => {
    if (!running) return;
    endAt.current = Date.now() + left * 1000;
    const id = setInterval(() => {
      const remain = Math.max(0, Math.round(((endAt.current ?? 0) - Date.now()) / 1000));
      setLeft(remain);
      if (remain <= 0) {
        setRunning(false);
        buzz();
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const expired = left <= 0;
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");

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
      {!expired && (
        <button
          type="button"
          onClick={() => {
            // Unlock audio inside the tap gesture so the end-of-game buzzer can play.
            if (!running) unlockAudio();
            setRunning((r) => !r);
          }}
          className="text-xs px-1.5 py-0.5 rounded-md border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover)] transition"
          title={running ? "Pause clock" : "Start clock"}
        >
          {running ? "⏸" : "▶"}
        </button>
      )}
      {(expired || (!running && left < total)) && (
        <button
          type="button"
          onClick={() => {
            setRunning(false);
            setLeft(total);
          }}
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
      <span className="flex -space-x-1 shrink-0">
        {ids.map((id) => (
          <span
            key={id}
            className="h-2.5 w-2.5 rounded-full ring-1 ring-black/40"
            style={{ background: colorFor(participants, id) }}
          />
        ))}
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
      {(match.label || showTimer) && (
        <div className="px-3 pt-2 flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-widest text-[var(--muted)] font-bold">
            {match.label}
            {match.label && match.court ? ` · Court ${match.court}` : ""}
          </span>
          {showTimer && (
            <MatchTimer minutes={timeLimitMin} tournamentId={tournamentId} round={match.round} />
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
