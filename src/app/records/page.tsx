"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Tournament, FORMAT_LABELS } from "@/lib/types";
import {
  aggregateRecords,
  competitionRanks,
  getPlacements,
  headToHead,
  playersOf,
  titleStreaks,
} from "@/lib/records";
import { ago, ordinal } from "@/lib/format";
import { getProfile } from "@/lib/profile";
import { getResult } from "@/lib/result";
import { Crown, Trophy } from "@/components/icons";
import { Emoji } from "@/components/Emoji";
import { SportIcon } from "@/components/SportIcon";
import { colorForName, sportAccent } from "@/lib/colors";
import { Card } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { HydrationGate } from "@/components/HydrationGate";
import { SeedIndexCard } from "@/components/SeedIndexCard";

export default function RecordsPage() {
  return (
    <HydrationGate>
      <RecordBook />
    </HydrationGate>
  );
}

const MEDAL_EMOJI: Record<string, string> = { gold: "🥇", silver: "🥈", bronze: "🥉" };

type Medalist = { name: string; firsts: number; seconds: number; thirds: number };

// One medal step of the podium — shows EVERY player on that step, so a doubles duo
// (two co-champions, or two runners-up) both appear instead of the group being cut off.
function PodiumTier({ players, tier }: { players: Medalist[]; tier: 1 | 2 | 3 }) {
  // Render nothing for an absent tier (e.g. no bronze/3rd-place match). The parent
  // centers whatever tiers exist, so a 1- or 1-2-place podium stays balanced instead
  // of leaving a detached empty column with a gap.
  if (!players.length) return null;
  const medal = tier === 1 ? "🥇" : tier === 2 ? "🥈" : "🥉";
  const barH = tier === 1 ? "h-16" : tier === 2 ? "h-11" : "h-8";
  const barBg =
    tier === 1
      ? "border-amber-400 bg-amber-400/25"
      : tier === 2
        ? "border-slate-400 bg-slate-400/20"
        : "border-orange-400 bg-orange-400/20";
  const show = players.slice(0, 4);
  const extra = players.length - show.length;
  return (
    <div className="flex w-24 flex-col items-center sm:w-28">
      {/* The champion wears the crown; every step's medal sits in its riser (8a). */}
      {tier === 1 ? <Crown className="h-5 w-5 text-amber-500" /> : <div className="h-5" />}
      <div className="mt-1 flex flex-wrap items-end justify-center gap-1">
        {show.map((p) => (
          <Avatar
            key={p.name}
            name={p.name}
            color={colorForName(p.name)}
            className={
              tier === 1
                ? "h-10 w-10 text-sm ring-2 ring-amber-400/60 ring-offset-1 ring-offset-[var(--surface)]"
                : "h-8 w-8 text-[10px]"
            }
          />
        ))}
      </div>
      <div className="mt-1 text-center text-[11px] font-semibold leading-tight">
        {show.map((p, i) => (
          <span key={p.name}>
            {i > 0 && " & "}
            <Link href={playerHref(p.name)} className="hover:underline">
              {p.name}
            </Link>
          </span>
        ))}
        {extra > 0 ? ` +${extra}` : ""}
      </div>
      {/* The step's medal tally (ties share a step precisely because their records
          match, so one line speaks for everyone on it) — makes the ordering legible. */}
      <div className="text-[10px] text-[var(--muted)] tabular-nums">
        {players[0].firsts} · {players[0].seconds} · {players[0].thirds}
      </div>
      <div
        className={`mt-1.5 flex w-full items-start justify-center rounded-t-md border-t-2 pt-1.5 ${barBg} ${barH}`}
      >
        <Emoji e={medal} className={tier === 1 ? "h-5 w-5" : "h-4 w-4"} />
      </div>
    </div>
  );
}

// The address of a player's trophy case (8c).
const playerHref = (name: string) => `/records/p/${encodeURIComponent(name)}`;

// 8a — the reigning champion hero: the most recently completed event's winner,
// crowned, above the sport chips. Gives the room a focal point instead of
// opening on counters. Tapping it opens that tournament.
function ReigningChampion({ completed }: { completed: Tournament[] }) {
  const latest = [...completed].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  if (!latest) return null;
  const champs = getPlacements(latest).find((pl) => pl.medal === "gold")?.names ?? [];
  if (!champs.length) return null;
  return (
    <Link
      href={`/t/${latest.id}`}
      className="block overflow-hidden rounded-2xl border border-amber-400/45 bg-gradient-to-br from-amber-400/15 via-amber-400/5 to-transparent transition hover:border-amber-400/70"
    >
      <div className="flex items-center gap-4 px-4 py-3.5">
        <div className="relative shrink-0">
          <Avatar
            name={champs[0]}
            color={colorForName(champs[0])}
            className="h-14 w-14 text-lg ring-[3px] ring-amber-400/60"
          />
          <Crown className="absolute -top-2.5 left-1/2 h-5 w-5 -translate-x-1/2 text-amber-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600">
            Reigning champion
          </div>
          <div className="truncate text-xl font-bold leading-tight">{champs.join(" & ")}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <SportIcon
              sport={latest.sport}
              className="h-3.5 w-3.5 shrink-0"
              style={{ color: sportAccent(latest.sport) }}
            />
            <span className="truncate">
              {latest.name} · {ago(latest.updatedAt)}
            </span>
          </div>
        </div>
        <span className="shrink-0 text-[var(--muted)]">›</span>
      </div>
    </Link>
  );
}

// 8a — "Your record": the signed-in player's standing, right under the podium.
function YourRecord({
  records,
  rankOf,
  name,
  streaks,
  tournaments,
}: {
  records: ReturnType<typeof aggregateRecords>;
  rankOf: number[];
  name: string;
  streaks: ReturnType<typeof titleStreaks>;
  tournaments: Tournament[];
}) {
  const idx = records.findIndex((r) => r.name.toLowerCase() === name.toLowerCase());
  if (idx < 0) return null;
  const me = records[idx];
  const streak = streaks.find((s) => s.name.toLowerCase() === name.toLowerCase());
  const pct = (n: number) => `${Math.round((100 * n) / Math.max(1, me.events))}%`;
  // Best sport = where the most golds live (falling back to most events played).
  let bestSport: string | null = null;
  {
    let bestScore = -1;
    for (const s of [...new Set(tournaments.map((t) => t.sport))]) {
      const mine = aggregateRecords(tournaments.filter((t) => t.sport === s)).find(
        (r) => r.name.toLowerCase() === name.toLowerCase(),
      );
      if (!mine) continue;
      const score = mine.firsts * 1000 + mine.events;
      if (score > bestScore) {
        bestScore = score;
        bestSport = s;
      }
    }
  }
  return (
    <div className="rounded-2xl border border-[var(--brand)]/60 bg-[var(--brand-soft)]/50 p-4">
      <div className="flex items-center gap-3">
        <Avatar name={me.name} color={colorForName(me.name)} className="h-9 w-9 text-xs" />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--brand)]">
            Your record
          </div>
          <div className="text-[15px] font-bold">
            {ordinal(rankOf[idx])} overall · {me.firsts} title{me.firsts === 1 ? "" : "s"}
          </div>
        </div>
        {streak && streak.current >= 2 && (
          <span className="shrink-0 rounded-full bg-amber-400/20 px-2.5 py-1 text-[11px] font-bold text-amber-600">
            🔥 {streak.current} in a row
          </span>
        )}
      </div>
      <div className="mt-3 flex justify-between border-t border-[var(--brand)]/25 pt-3 text-center">
        {(
          [
            [String(me.events), me.events === 1 ? "event" : "events"],
            [pct(me.firsts), "titles"],
            [pct(me.firsts + me.seconds + me.thirds), "podium"],
            [bestSport ?? "—", "best sport"],
          ] as const
        ).map(([big, label]) => (
          <div key={label}>
            <div className="text-base font-extrabold leading-none">{big}</div>
            <div className="mt-0.5 text-[9px] uppercase tracking-wide text-[var(--muted)]">
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 8b — the Hall of Fame with rates, not just counts. Title rate = wins ÷
// events with a thin amber bar (muted under 3 events, where a lucky one-timer
// would out-bar a proven winner); a secondary line carries event count and the
// sports they've played. Season chips rescope everything in this card by
// updatedAt. Tapping any row opens the player's trophy case.
function HallOfFame({ tournaments }: { tournaments: Tournament[] }) {
  const [season, setSeason] = useState<"all" | "year" | "90d">("all");
  const year = new Date().getFullYear();
  const cutoff =
    season === "year"
      ? new Date(year, 0, 1).getTime()
      : season === "90d"
        ? Date.now() - 90 * 86400000
        : 0;
  const pool = cutoff ? tournaments.filter((t) => t.updatedAt >= cutoff) : tournaments;
  const records = aggregateRecords(pool);
  const rankOf = competitionRanks(records);
  const sportsBy = new Map<string, Set<string>>();
  for (const t of pool) {
    if (!getResult(t).complete) continue;
    for (const n of playersOf(t)) {
      const k = n.toLowerCase();
      if (!sportsBy.has(k)) sportsBy.set(k, new Set());
      sportsBy.get(k)!.add(t.sport);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5">
        <span className="text-sm font-bold">Hall of Fame</span>
        <div className="flex gap-1.5">
          {(
            [
              ["all", "All time"],
              ["year", String(year)],
              ["90d", "Last 90d"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setSeason(v)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                season === v
                  ? "bg-gradient-to-r from-[var(--brand)] to-[var(--brand-strong)] text-[var(--on-brand)]"
                  : "border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {records.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-[var(--muted)]">
          No completed events in this window.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {records.map((r, i) => {
            const rate = r.events ? r.firsts / r.events : 0;
            const proven = r.events >= 3;
            const sports = [...(sportsBy.get(r.name.toLowerCase()) ?? [])]
              .map((s) => s.toLowerCase())
              .join(", ");
            return (
              <li key={r.name}>
                <Link
                  href={playerHref(r.name)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 transition hover:bg-[var(--hover)] ${
                    rankOf[i] === 1 && r.firsts > 0 ? "bg-[var(--win-bg)]" : ""
                  }`}
                >
                  <span className="w-4 text-sm font-bold text-[var(--muted)] tabular-nums">
                    {rankOf[i]}
                  </span>
                  <Avatar name={r.name} color={colorForName(r.name)} className="h-7 w-7 text-[10px]" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <span className="truncate">{r.name}</span>
                      {rankOf[i] === 1 && r.firsts > 0 && (
                        <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      )}
                    </span>
                    <span className="block truncate text-[10px] text-[var(--muted)]">
                      {r.events} event{r.events === 1 ? "" : "s"}
                      {sports ? ` · ${sports}` : ""}
                    </span>
                  </span>
                  <span className="w-14 text-center text-xs font-bold tabular-nums">
                    <span className={r.firsts ? "text-amber-500" : "text-[var(--muted)]"}>
                      {r.firsts || "—"}
                    </span>{" "}
                    <span className="text-[var(--muted)]">{r.seconds || "—"}</span>{" "}
                    <span className="text-[var(--muted)]">{r.thirds || "—"}</span>
                  </span>
                  <span className="w-16 text-right">
                    <span
                      className={`text-sm font-extrabold tabular-nums ${
                        r.firsts && proven ? "" : "text-[var(--muted)]"
                      }`}
                    >
                      {Math.round(rate * 100)}%
                    </span>
                    <span className="mt-1 ml-auto block h-1 w-12 overflow-hidden rounded-full bg-[var(--subtle)]">
                      <span
                        className={`block h-full rounded-full ${proven ? "bg-amber-400" : "bg-[var(--border)]"}`}
                        style={{ width: `${Math.round(rate * 100)}%` }}
                      />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="border-t border-[var(--border)] px-4 py-2 text-[10px] text-[var(--muted)]">
        Counts reward showing up — title rate (wins ÷ events) shows who converts. Tap a row for
        their trophy case.
      </p>
    </div>
  );
}

function RecordBook() {
  const tournaments = useStore((s) => s.tournaments);
  const allCompleted = tournaments.filter((t) => getResult(t).complete);
  // Everything below the header narrows to one sport when a chip is picked.
  const [sport, setSport] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  useEffect(() => setProfileName(getProfile().name.trim()), []);

  const sports = [...new Set(allCompleted.map((t) => t.sport))];
  const completed = sport ? allCompleted.filter((t) => t.sport === sport) : allCompleted;
  const scoped = sport ? tournaments.filter((t) => t.sport === sport) : tournaments;
  const records = aggregateRecords(scoped);
  const rankOf = competitionRanks(records);
  const allStreaks = titleStreaks(scoped);
  const streaks = allStreaks.slice(0, 5);
  const rivalries = profileName
    ? headToHead(scoped, profileName)
        .filter((r) => r.wins + r.losses > 0)
        .slice(0, 5)
    : [];
  const playerCount = new Set(records.map((r) => r.name.toLowerCase())).size;
  // Podium = the TOP THREE RANKS of the hall, straight off rankOf — not "everyone
  // who ever medaled" (with 8 one-time winners that put 4 avatars and a +4 on the
  // gold riser). Ties still share a step: rankOf gives tied players the same rank
  // precisely because their records match.
  const golds = records.filter((_, i) => rankOf[i] === 1);
  const silvers = records.filter((_, i) => rankOf[i] === 2);
  const bronzes = records.filter((_, i) => rankOf[i] === 3);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-[var(--muted)] hover:underline">
          ← All tournaments
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-amber-500" /> Trophy Room
            </h1>
            <p className="text-sm text-[var(--muted)]">
              Every champion, streak, and rivalry you&apos;ve crowned.
            </p>
          </div>
          {allCompleted.length > 0 && (
            <div className="flex gap-4 text-center">
              {(
                [
                  [completed.length, completed.length === 1 ? "event" : "events"],
                  [playerCount, playerCount === 1 ? "player" : "players"],
                  [sports.length, sports.length === 1 ? "sport" : "sports"],
                ] as const
              ).map(([n, label]) => (
                <div key={label}>
                  <div className="text-xl font-extrabold tabular-nums leading-none">{n}</div>
                  <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <SeedIndexCard />

      <ReigningChampion completed={allCompleted} />

      {/* One trophy case per sport — the chips narrow everything below. */}
      {sports.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSport(null)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              sport === null
                ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)] font-medium"
                : "border-[var(--border)] hover:bg-[var(--hover)]"
            }`}
          >
            All sports
          </button>
          {sports.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSport(sport === s ? null : s)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                sport === s
                  ? "border-[var(--brand)] bg-[var(--brand-soft)] font-medium"
                  : "border-[var(--border)] hover:bg-[var(--hover)]"
              }`}
            >
              <SportIcon sport={s} className="h-4 w-4 shrink-0" style={{ color: sportAccent(s) }} />
              {s}
            </button>
          ))}
        </div>
      )}

      {completed.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="text-4xl mb-2">🏅</div>
          <p className="font-medium">No finished events yet</p>
          <p className="text-sm text-[var(--muted)]">
            Complete a tournament and your champions show up here.
          </p>
        </Card>
      ) : (
        <>
          {/* Podium — gold / silver / bronze steps, each showing all its medalists */}
          {golds.length > 0 && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 p-4">
              <div className="flex items-end justify-center gap-3 sm:gap-6">
                <PodiumTier players={silvers} tier={2} />
                <PodiumTier players={golds} tier={1} />
                <PodiumTier players={bronzes} tier={3} />
              </div>
            </div>
          )}

          {profileName && (
            <YourRecord
              records={records}
              rankOf={rankOf}
              name={profileName}
              streaks={allStreaks}
              tournaments={sport ? tournaments.filter((t) => t.sport === sport) : tournaments}
            />
          )}

          {/* Streaks & rivalries — the stories between the medals */}
          {(streaks.length > 0 || rivalries.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {streaks.length > 0 && (
                <Card className="p-4">
                  <h2 className="font-bold text-sm mb-2">🔥 Title streaks</h2>
                  <ul className="space-y-2">
                    {streaks.map((s) => (
                      <li key={s.name} className="flex items-center gap-2.5 text-sm">
                        <Avatar name={s.name} color={colorForName(s.name)} className="h-6 w-6 text-[10px]" />
                        <Link href={playerHref(s.name)} className="font-medium flex-1 truncate hover:underline">
                          {s.name}
                        </Link>
                        <span className="tabular-nums text-[var(--muted)]">
                          {s.current >= 2 ? (
                            <span className="font-semibold text-amber-500">{s.current} in a row</span>
                          ) : (
                            <>best {s.best}</>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              {rivalries.length > 0 && (
                <Card className="p-4">
                  <h2 className="font-bold text-sm mb-2">⚔️ Your rivalries</h2>
                  <ul className="space-y-2">
                    {rivalries.map((r) => (
                      <li key={r.rival} className="flex items-center gap-2.5 text-sm">
                        <Avatar name={r.rival} color={colorForName(r.rival)} className="h-6 w-6 text-[10px]" />
                        <Link href={playerHref(r.rival)} className="font-medium flex-1 truncate hover:underline">
                          {r.rival}
                        </Link>
                        <span
                          className={`tabular-nums font-semibold ${
                            r.wins > r.losses
                              ? "text-[var(--brand)]"
                              : r.wins < r.losses
                                ? "text-rose-400"
                                : "text-[var(--muted)]"
                          }`}
                        >
                          {r.wins}–{r.losses}
                        </span>
                        <span className="text-[10px] text-[var(--muted)] tabular-nums w-14 text-right">
                          {r.events} shared
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[10px] text-[var(--muted)]">
                    Who finished ahead, event by event — as {profileName}.
                  </p>
                </Card>
              )}
            </div>
          )}

          {/* Hall of Fame — 8b: rates, not just counts, with season scope */}
          <HallOfFame tournaments={scoped} />

          {/* Past events with full final rankings */}
          <div>
            <h2 className="font-bold mb-3">Past events</h2>
            <div className="space-y-3">
              {completed
                .slice()
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((t) => (
                  <EventRow key={t.id} t={t} />
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EventRow({ t }: { t: Tournament }) {
  const [open, setOpen] = useState(false);
  const res = getResult(t);
  // Flatten placements into display rows, keeping each placement's shared rank and
  // medal — both doubles champions show 🥇 at #1, both runners-up 🥈 at #2, and the
  // field that didn't advance keeps its round-robin rank (5th onward after a top-4 final).
  const entries = getPlacements(t).flatMap((pl) =>
    pl.names.map((name) => ({ name, rank: pl.rank, medal: pl.medal ? MEDAL_EMOJI[pl.medal] : undefined })),
  );

  return (
    <Card className="p-4">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between gap-3 text-left">
        <span className="min-w-0">
          <Link href={`/t/${t.id}`} className="font-semibold hover:text-[var(--brand)] flex items-center gap-2">
            <SportIcon sport={t.sport} className="h-4 w-4" style={{ color: sportAccent(t.sport) }} />
            <span className="truncate">{t.name}</span>
          </Link>
          <span className="text-sm text-amber-500 font-medium flex items-center gap-1.5 mt-0.5">
            <Trophy className="h-3.5 w-3.5" /> {res.winner}
          </span>
        </span>
        <span className="text-xs text-[var(--muted)] shrink-0">
          {FORMAT_LABELS[t.format]} · {open ? "hide" : "results"}
        </span>
      </button>

      {open && (
        <ol className="mt-3 border-t border-[var(--border)] pt-3 space-y-1 text-sm">
          {entries.map((e, i) => (
            <li key={`${e.name}-${i}`} className="flex items-center gap-2.5">
              <span className="w-6 flex justify-center">
                {e.medal ? <Emoji e={e.medal} className="h-4 w-4" /> : `${e.rank}.`}
              </span>
              <Avatar name={e.name} color={colorForName(e.name)} className="h-6 w-6 text-[10px]" />
              <span className={e.rank === 1 ? "font-semibold" : ""}>{e.name}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
