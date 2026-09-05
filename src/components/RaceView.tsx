"use client";

import { useState } from "react";
import { Tournament, RaceHeat } from "@/lib/types";
import { useStore } from "@/lib/store";
import { heatScored, raceResult, raceStandings } from "@/lib/race";
import { canEditScores } from "@/lib/perms";
import { colorFor, photoFor } from "@/lib/colors";
import { Avatar } from "./Avatar";
import { Button, Card } from "./ui";
import { Crown } from "./icons";
import { BracketView } from "./BracketView";

const POOL_NAMES = "ABCDEFGH";

// Tap-to-rank heat entry: tap racers in the order they finished; tap a placed
// racer to pull them (and everyone behind them shifts up). Every tap commits —
// no save button to forget at a derby with forty kids waiting.
function HeatCard({
  t,
  heat,
  racerIds,
  index,
  canRemove,
  readonly,
}: {
  t: Tournament;
  heat: RaceHeat;
  racerIds: string[];
  index: number;
  canRemove: boolean;
  readonly: boolean;
}) {
  const setRaceOrder = useStore((s) => s.setRaceOrder);
  const removeRaceHeat = useStore((s) => s.removeRaceHeat);
  const order = heat.order;
  const tap = (pid: string) => {
    if (readonly) return;
    const at = order.indexOf(pid);
    const next = at >= 0 ? order.filter((x) => x !== pid) : [...order, pid];
    setRaceOrder(t.id, heat.id, next);
  };
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
          Heat {index}
          {heatScored(heat) && order.length >= racerIds.length ? " · done" : ""}
        </span>
        <span className="flex items-center gap-2">
          {!readonly && order.length > 0 && (
            <button
              type="button"
              onClick={() => setRaceOrder(t.id, heat.id, [])}
              className="text-[10px] text-[var(--muted)] hover:underline"
            >
              clear
            </button>
          )}
          {!readonly && canRemove && (
            <button
              type="button"
              onClick={() => removeRaceHeat(t.id, heat.id)}
              aria-label="Remove heat"
              className="px-1 text-sm leading-none text-[var(--muted)] hover:text-rose-400"
            >
              ×
            </button>
          )}
        </span>
      </div>
      {!readonly && order.length === 0 && (
        <p className="mb-2 text-[11px] text-[var(--muted)]">
          Tap racers in the order they finished.
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {racerIds.map((pid) => {
          const p = t.participants.find((x) => x.id === pid);
          if (!p) return null;
          const pos = order.indexOf(pid);
          return (
            <button
              key={pid}
              type="button"
              onClick={() => tap(pid)}
              className={`inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-sm transition ${
                pos === 0
                  ? "border-amber-400 bg-amber-400/15 font-semibold"
                  : pos > 0
                    ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover)]"
              }`}
            >
              {pos >= 0 ? (
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${
                    pos === 0 ? "bg-amber-400 text-black/80" : "bg-[var(--brand)] text-[var(--on-brand)]"
                  }`}
                >
                  {pos + 1}
                </span>
              ) : (
                <Avatar
                  name={p.name}
                  color={colorFor(t.participants, pid)}
                  photo={photoFor(t.participants, pid)}
                  className="h-6 w-6 text-[10px]"
                />
              )}
              {p.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StandingsTableMini({ t, stage, pool }: { t: Tournament; stage: "pool" | "final"; pool?: number }) {
  const rows = raceStandings(t, stage, pool);
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[var(--border)] text-left text-[10px] uppercase tracking-wide text-[var(--muted)]">
          <th className="w-7 px-2 py-1.5">#</th>
          <th className="px-1 py-1.5">Racer</th>
          <th className="w-12 px-1 py-1.5 text-center">Heats</th>
          <th className="w-10 px-1 py-1.5 text-center">Wins</th>
          <th className="w-10 px-2 py-1.5 text-center">Pts</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.participantId} className={`border-b border-[var(--border)] last:border-0 ${i === 0 && r.heats > 0 ? "bg-[var(--win-bg)]" : ""}`}>
            <td className="px-2 py-1.5 font-bold text-[var(--muted)] tabular-nums">{r.heats ? i + 1 : "–"}</td>
            <td className="px-1 py-1.5">
              <span className="flex items-center gap-2">
                <Avatar name={r.name} color={colorFor(t.participants, r.participantId)} photo={photoFor(t.participants, r.participantId)} className="h-6 w-6 text-[10px]" />
                <span className="truncate font-medium">{r.name}</span>
              </span>
            </td>
            <td className="px-1 py-1.5 text-center tabular-nums text-[var(--muted)]">{r.heats || "–"}</td>
            <td className="px-1 py-1.5 text-center tabular-nums text-[var(--muted)]">{r.wins || ""}</td>
            <td className="px-2 py-1.5 text-center font-bold tabular-nums">{r.heats ? r.points : "–"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function RaceView({ t }: { t: Tournament }) {
  const addRaceHeat = useStore((s) => s.addRaceHeat);
  const seedRaceFinals = useStore((s) => s.seedRaceFinals);
  const [confirmReseed, setConfirmReseed] = useState(false);
  const r = t.race;
  const readonly = !canEditScores(t);
  if (!r) return null;

  const perPool = Math.max(1, t.config.advanceCount);
  const poolIdx = Array.from({ length: r.poolCount }, (_, i) => i);
  const anyScored = r.heats.some((h) => h.stage === "pool" && heatScored(h));
  const result = raceResult(t);
  const finalHeats = r.heats.filter((h) => h.stage === "final");

  const seed = () => {
    if (r.finalists?.length && !confirmReseed) {
      setConfirmReseed(true);
      return;
    }
    setConfirmReseed(false);
    seedRaceFinals(t.id, perPool);
  };

  return (
    <div className="space-y-5">
      {/* The CROWN moment — race finals decided */}
      {result.complete && (
        <Card className="border-amber-400/60 p-6 text-center glow-brand">
          <Crown className="mx-auto h-12 w-12 text-amber-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]" />
          <div className="mt-1 text-xs font-bold uppercase tracking-widest text-amber-500">
            Champion
          </div>
          <div className="text-2xl font-extrabold">{result.winners.join(" & ")}</div>
        </Card>
      )}

      {/* Pools */}
      <div className="grid gap-4 lg:grid-cols-2">
        {poolIdx.map((pi) => {
          const racerIds = t.participants.filter((p) => (r.pools[p.id] ?? 0) === pi).map((p) => p.id);
          const heats = r.heats.filter((h) => h.stage === "pool" && h.pool === pi);
          return (
            <Card key={pi} className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold">
                  {r.poolCount > 1 ? `Pool ${POOL_NAMES[pi] ?? pi + 1}` : "Heats"}
                  <span className="ml-2 font-normal text-[var(--muted)]">
                    {racerIds.length} racer{racerIds.length === 1 ? "" : "s"}
                  </span>
                </h2>
                {!readonly && (
                  <button
                    type="button"
                    onClick={() => addRaceHeat(t.id, "pool", pi)}
                    className="text-xs font-medium text-[var(--brand)] hover:text-[var(--brand-strong)]"
                  >
                    + Add heat
                  </button>
                )}
              </div>
              <div className="mb-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/60">
                <StandingsTableMini t={t} stage="pool" pool={pi} />
              </div>
              <div className="space-y-2">
                {heats.map((h, i) => (
                  <HeatCard
                    key={h.id}
                    t={t}
                    heat={h}
                    racerIds={racerIds}
                    index={i + 1}
                    canRemove={heats.length > 1}
                    readonly={readonly}
                  />
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Finals */}
      <Card className="p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold">
            Finals
            <span className="ml-2 font-normal text-[var(--muted)]">
              {r.finalStyle === "bracket" ? "knockout bracket" : "everyone races at once"} · top{" "}
              {perPool} per pool
            </span>
          </h2>
          {!readonly && (
            <span className="flex items-center gap-2">
              {confirmReseed && (
                <span className="text-xs text-amber-500">
                  Reseeding clears the current finals —
                </span>
              )}
              <Button variant={r.finalists?.length ? "outline" : "primary"} className="px-3 py-1.5 text-sm" onClick={seed} disabled={!anyScored}>
                {confirmReseed
                  ? "Yes, reseed"
                  : r.finalists?.length
                    ? "Reseed finals"
                    : "Seed the finals →"}
              </Button>
            </span>
          )}
        </div>

        {!r.finalists?.length ? (
          <p className="text-sm text-[var(--muted)]">
            {anyScored
              ? `Ready when you are — the top ${perPool} of each pool advance.`
              : "Score at least one heat, then seed the finals."}
          </p>
        ) : r.finalStyle === "bracket" ? (
          <BracketView matches={t.matches} participants={t.participants} tournamentId={t.id} />
        ) : (
          <>
            <div className="mb-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/60">
              <StandingsTableMini t={t} stage="final" />
            </div>
            <div className="space-y-2">
              {finalHeats.map((h, i) => (
                <HeatCard
                  key={h.id}
                  t={t}
                  heat={h}
                  racerIds={r.finalists ?? []}
                  index={i + 1}
                  canRemove={finalHeats.length > 1}
                  readonly={readonly}
                />
              ))}
            </div>
            {!readonly && (
              <button
                type="button"
                onClick={() => addRaceHeat(t.id, "final")}
                className="mt-2 text-xs font-medium text-[var(--brand)] hover:text-[var(--brand-strong)]"
              >
                + Add final heat
              </button>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
