"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import {
  aggregateRecords,
  competitionRanks,
  getPlacements,
  playersOf,
  titleStreaks,
} from "@/lib/records";
import { getResult } from "@/lib/result";
import { ago, ordinal } from "@/lib/format";
import { colorForName, sportAccent } from "@/lib/colors";
import { Avatar } from "@/components/Avatar";
import { SportIcon } from "@/components/SportIcon";
import { HydrationGate } from "@/components/HydrationGate";
import { Crown } from "@/components/icons";
import { Emoji } from "@/components/Emoji";
import { Card } from "@/components/ui";

const MEDAL: Record<string, string> = { gold: "🥇", silver: "🥈", bronze: "🥉" };
const SHELF_STYLE: Record<string, string> = {
  gold: "border-amber-400/40 bg-amber-400/15",
  silver: "border-slate-400/40 bg-slate-400/15",
  bronze: "border-orange-400/40 bg-orange-400/15",
};

// 8c — a player's trophy case: their medals as a physical shelf, the rates
// behind them, a per-sport breakdown, and every event they've played with the
// placement they earned. All derived from aggregateRecords/getPlacements —
// no new data, works for any name in the hall.
export default function PlayerTrophyCase() {
  const params = useParams<{ name: string }>();
  const name = decodeURIComponent(params.name ?? "");
  return (
    <HydrationGate>
      <CaseBody name={name} />
    </HydrationGate>
  );
}

function CaseBody({ name }: { name: string }) {
  const tournaments = useStore((s) => s.tournaments);
  const records = aggregateRecords(tournaments);
  const rankOf = competitionRanks(records);
  const idx = records.findIndex((r) => r.name.toLowerCase() === name.toLowerCase());

  if (idx < 0) {
    return (
      <Card className="p-10 text-center">
        <p className="font-medium">No record for “{name}” yet</p>
        <Link href="/records" className="text-sm text-[var(--brand)] hover:underline">
          ← Trophy Room
        </Link>
      </Card>
    );
  }

  const me = records[idx];
  const rank = rankOf[idx];
  const color = colorForName(me.name);
  const streak = titleStreaks(tournaments).find(
    (s) => s.name.toLowerCase() === name.toLowerCase(),
  );
  const pct = (n: number) => `${Math.round((100 * n) / Math.max(1, me.events))}%`;

  // Medal shelf — newest medals aren't distinguishable, so shelve by kind.
  const shelf = [
    ...Array.from({ length: me.firsts }, () => "gold"),
    ...Array.from({ length: me.seconds }, () => "silver"),
    ...Array.from({ length: me.thirds }, () => "bronze"),
  ];
  const shelfShown = shelf.slice(0, 24);

  // Per-sport rows + best sport (most golds, then most events).
  const sports = [...new Set(tournaments.map((t) => t.sport))];
  const bySport = sports
    .map((s) => {
      const mine = aggregateRecords(tournaments.filter((t) => t.sport === s)).find(
        (r) => r.name.toLowerCase() === name.toLowerCase(),
      );
      return mine ? { sport: s, firsts: mine.firsts, events: mine.events } : null;
    })
    .filter((x): x is { sport: string; firsts: number; events: number } => !!x)
    .sort((a, b) => b.firsts - a.firsts || b.events - a.events);
  const bestSport = bySport[0]?.sport ?? "—";

  // Full event history, newest first, with this player's placement in each.
  const history = tournaments
    .filter((t) => getResult(t).complete && playersOf(t).some((n) => n.toLowerCase() === name.toLowerCase()))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((t) => {
      const pl = getPlacements(t).find((p) =>
        p.names.some((n) => n.toLowerCase() === name.toLowerCase()),
      );
      return { t, rank: pl?.rank, medal: pl?.medal };
    });

  return (
    <div className="space-y-5">
      {/* Header, washed in the player's color */}
      <div
        className="-mx-4 border-b border-[var(--border)] px-4 pb-5 pt-2"
        style={{ background: `linear-gradient(155deg, ${color}33, transparent 70%)` }}
      >
        <Link href="/records" className="text-sm text-[var(--muted)] hover:underline">
          ← Trophy Room
        </Link>
        <div className="mt-3 flex items-center gap-4">
          <Avatar name={me.name} color={color} className="h-16 w-16 text-xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">{me.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  rank === 1
                    ? "bg-amber-400/20 text-amber-600"
                    : "border border-[var(--border)] text-[var(--muted)]"
                }`}
              >
                {rank === 1 && <Crown className="h-3 w-3" />}
                {ordinal(rank)} overall
              </span>
              <span className="text-xs text-[var(--muted)]">
                {me.events} event{me.events === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Trophy shelf */}
      {shelf.length > 0 && (
        <section>
          <h2 className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-[var(--muted)]">
            Trophy shelf
          </h2>
          <Card className="flex flex-wrap gap-2 p-3.5">
            {shelfShown.map((kind, i) => (
              <span
                key={i}
                className={`grid h-11 w-11 place-items-center rounded-xl border ${SHELF_STYLE[kind]}`}
              >
                <Emoji e={MEDAL[kind]} className="h-5 w-5" />
              </span>
            ))}
            {shelf.length > shelfShown.length && (
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--muted)]">
                +{shelf.length - shelfShown.length}
              </span>
            )}
          </Card>
        </section>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-2.5">
        {(
          [
            ["Title rate", pct(me.firsts), false],
            ["Podium rate", pct(me.firsts + me.seconds + me.thirds), false],
            [
              "Current streak",
              streak && streak.current >= 1 ? `${streak.current} 🔥` : "—",
              !!streak && streak.current >= 2,
            ],
            ["Best sport", bestSport, false],
          ] as const
        ).map(([label, value, hot]) => (
          <Card key={label} className="p-3.5">
            <div className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
              {label}
            </div>
            <div className={`mt-1 truncate text-xl font-extrabold ${hot ? "text-amber-500" : ""}`}>
              {value}
            </div>
          </Card>
        ))}
      </div>

      {/* By sport */}
      {bySport.length > 0 && (
        <section>
          <h2 className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-[var(--muted)]">
            By sport
          </h2>
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60">
            <ul className="divide-y divide-[var(--border)]">
              {bySport.map((s) => (
                <li key={s.sport} className="flex items-center gap-3 px-3.5 py-2.5">
                  <span
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: `color-mix(in srgb, ${sportAccent(s.sport)} 14%, transparent)`,
                      color: sportAccent(s.sport),
                    }}
                  >
                    <SportIcon sport={s.sport} className="h-4.5 w-4.5" />
                  </span>
                  <span className="flex-1 text-sm font-semibold">{s.sport}</span>
                  <span className="text-xs font-bold tabular-nums">
                    <span className={s.firsts ? "text-amber-500" : "text-[var(--muted)]"}>
                      {s.firsts} 🥇
                    </span>{" "}
                    <span className="text-[var(--muted)]">
                      · {s.events} event{s.events === 1 ? "" : "s"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Event history */}
      <section>
        <h2 className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-[var(--muted)]">
          Event history
        </h2>
        <div className="space-y-2">
          {history.map(({ t, rank: r, medal }) => (
            <Link
              key={t.id}
              href={`/t/${t.id}`}
              className={`flex items-center gap-3 rounded-xl border border-[var(--border)] px-3.5 py-2.5 transition hover:bg-[var(--hover)] ${
                medal ? "bg-[var(--surface)]" : "bg-[var(--surface)]/55"
              }`}
            >
              <span className="w-6 text-center">
                {medal ? (
                  <Emoji e={MEDAL[medal]} className="mx-auto h-4.5 w-4.5" />
                ) : (
                  <span className="text-xs font-bold text-[var(--muted)]">{r ? `${r}.` : "–"}</span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{t.name}</span>
                <span className="block text-[11px] text-[var(--muted)]">
                  {t.sport} · {ago(t.updatedAt)}
                </span>
              </span>
              <span className="shrink-0 text-[var(--muted)]">›</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
