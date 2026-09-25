"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Tournament, FORMAT_LABELS } from "@/lib/types";
import { getPlacements, hasCompetition, playersOf } from "@/lib/records";
import { applyAliases, canonicalName } from "@/lib/aliases";
import { ago } from "@/lib/format";
import { getProfile } from "@/lib/profile";
import { getResult } from "@/lib/result";
import { computeGolf } from "@/lib/golf";
import { Trophy } from "@/components/icons";
import { Emoji } from "@/components/Emoji";
import { SportIcon } from "@/components/SportIcon";
import { colorForName, sportAccent } from "@/lib/colors";
import { Card } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { HydrationGate } from "@/components/HydrationGate";

// Records is an ARCHIVE first (Adam's call after the trophy-room experiments):
// every finished event logs here, newest on top, and opens to its full
// results. Champions show on the events that actually crowned one — a casual
// golf round is a round, not a tournament — and the career layer (medals,
// rates, streaks, rivalries) lives on each player's own page, one tap away.
export default function RecordsPage() {
  return (
    <HydrationGate>
      <RecordBook />
    </HydrationGate>
  );
}

const MEDAL_EMOJI: Record<string, string> = { gold: "🥇", silver: "🥈", bronze: "🥉" };

// The address of a player's trophy case.
const playerHref = (name: string) => `/records/p/${encodeURIComponent(name)}`;

function RecordBook() {
  const raw = useStore((s) => s.tournaments);
  // Names read through this device's alias map ("Adam" folded into "Adam Lewis").
  const tournaments = applyAliases(raw);
  const [sport, setSport] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [profileName, setProfileName] = useState("");
  useEffect(() => setProfileName(canonicalName(getProfile().name.trim())), []);

  // EVERYTHING finished belongs in the log — rounds included.
  const allDone = tournaments.filter((t) => getResult(t).complete);
  const sports = [...new Set(allDone.map((t) => t.sport))];
  const done = sport ? allDone.filter((t) => t.sport === sport) : allDone;
  const events = done.filter(hasCompetition);
  const rounds = done.length - events.length;
  const playerCount = new Set(done.flatMap(playersOf).map((n) => n.toLowerCase())).size;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/" className="text-sm text-[var(--muted)] hover:underline">
          ← All tournaments
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-amber-500" /> Records
              <button
                type="button"
                aria-label="How Records works"
                onClick={() => setShowHelp((v) => !v)}
                className={`grid h-5 w-5 place-items-center rounded-full border text-[11px] font-bold transition ${
                  showHelp
                    ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                    : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                ?
              </button>
            </h1>
            <p className="text-sm text-[var(--muted)]">
              Everything you&apos;ve finished — tap one for the full results.
            </p>
          </div>
          {allDone.length > 0 && (
            <div className="flex gap-4 text-center">
              {(
                [
                  [events.length, events.length === 1 ? "event" : "events"],
                  ...(rounds > 0 ? ([[rounds, rounds === 1 ? "round" : "rounds"]] as const) : []),
                  [playerCount, playerCount === 1 ? "player" : "players"],
                ] as readonly (readonly [number, string])[]
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

      {showHelp && (
        <div className="rounded-xl border border-[var(--brand)]/30 bg-[var(--brand-soft)]/40 px-4 py-3 text-xs leading-relaxed text-[var(--muted)]">
          <ol className="list-decimal space-y-1 pl-4">
            <li>Every finished event logs here, newest first. Tap a row for its full results.</li>
            <li>An <b>event</b> crowns a champion 🏆. A casual golf round (fewer than 5 players) is just a <b>round</b> — its scores log and feed the Seed Index, but nobody gets a medal for beating three friends on a Tuesday. Trips, cups, and bigger outings all count as events.</li>
            <li>Tap any <b>name</b> in a result to open that player&apos;s page — medals, title rate, streaks, and their golf stats all live there.</li>
          </ol>
        </div>
      )}

      {profileName && allDone.length > 0 && (
        <Link
          href={playerHref(profileName)}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand)]/50 bg-[var(--brand-soft)]/50 px-3.5 py-1.5 text-sm font-semibold text-[var(--brand)] transition hover:bg-[var(--brand-soft)]"
        >
          <Avatar name={profileName} color={colorForName(profileName)} className="h-5 w-5 text-[9px]" />
          My page →
        </Link>
      )}

      {/* One log per sport — the chips narrow it. */}
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

      {done.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="text-4xl mb-2">🏅</div>
          <p className="font-medium">Nothing finished yet</p>
          <p className="text-sm text-[var(--muted)]">
            Complete a tournament (or a round of golf) and it shows up here.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {done
            .slice()
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map((t) => (
              <EventRow key={t.id} t={t} />
            ))}
        </div>
      )}
    </div>
  );
}

// A casual round's one-line summary: the top cards, plainly.
function roundLine(t: Tournament): string {
  try {
    const rows = computeGolf(t, "stroke").filter((r) => r.thru > 0);
    return rows
      .slice(0, 4)
      .map((r) => `${r.name.split(/\s+/)[0]} ${r.gross}`)
      .join(" · ");
  } catch {
    return "";
  }
}

function EventRow({ t }: { t: Tournament }) {
  const [open, setOpen] = useState(false);
  const res = getResult(t);
  const isEvent = hasCompetition(t);
  // Flatten placements into display rows with each placement's shared rank —
  // medals only where a championship was actually at stake.
  const entries = getPlacements(t).flatMap((pl) =>
    pl.names.map((name) => ({
      name,
      rank: pl.rank,
      medal: isEvent && pl.medal ? MEDAL_EMOJI[pl.medal] : undefined,
    })),
  );

  return (
    <Card className="p-4">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between gap-3 text-left">
        <span className="min-w-0">
          <Link href={`/t/${t.id}`} className="font-semibold hover:text-[var(--brand)] flex items-center gap-2">
            <SportIcon sport={t.sport} className="h-4 w-4" style={{ color: sportAccent(t.sport) }} />
            <span className="truncate">{t.name}</span>
            {!isEvent && (
              <span className="shrink-0 rounded-full border border-[var(--border)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--muted)]">
                Round
              </span>
            )}
          </Link>
          {isEvent ? (
            <span className="text-sm text-amber-500 font-medium flex items-center gap-1.5 mt-0.5">
              <Trophy className="h-3.5 w-3.5" /> {res.winner}
            </span>
          ) : (
            <span className="mt-0.5 block truncate text-sm tabular-nums text-[var(--muted)]">
              {roundLine(t) || res.winner}
            </span>
          )}
        </span>
        <span className="text-xs text-[var(--muted)] shrink-0">
          {ago(t.updatedAt)} · {open ? "hide" : "results"}
        </span>
      </button>

      {open && (
        <ol className="mt-3 border-t border-[var(--border)] pt-3 space-y-1 text-sm">
          {entries.map((e, i) => (
            <li key={`${e.name}-${i}`} className="flex items-center gap-2.5">
              <span className="w-6 flex justify-center">
                {e.medal ? (
                  <Emoji e={e.medal} className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-bold text-[var(--muted)]">{e.rank}.</span>
                )}
              </span>
              <Avatar name={e.name} color={colorForName(e.name)} className="h-6 w-6 text-[10px]" />
              <Link
                href={playerHref(e.name)}
                className={`hover:underline ${e.rank === 1 && isEvent ? "font-semibold" : ""}`}
              >
                {e.name}
              </Link>
            </li>
          ))}
          <li className="pt-1 text-[10px] text-[var(--muted)]">
            {FORMAT_LABELS[t.format]} · tap a name for their medals, streaks, and stats
          </li>
        </ol>
      )}
    </Card>
  );
}
