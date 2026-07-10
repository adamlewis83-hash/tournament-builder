"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Tournament, FORMAT_LABELS } from "@/lib/types";
import { aggregateRecords, getPlacementTiers } from "@/lib/records";
import { getResult } from "@/lib/result";
import { Crown, Trophy } from "@/components/icons";
import { Emoji } from "@/components/Emoji";
import { SportIcon } from "@/components/SportIcon";
import { colorForName } from "@/lib/colors";
import { Card } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { HydrationGate } from "@/components/HydrationGate";

export default function RecordsPage() {
  return (
    <HydrationGate>
      <RecordBook />
    </HydrationGate>
  );
}

const MEDAL = ["🥇", "🥈", "🥉"];

function RecordBook() {
  const tournaments = useStore((s) => s.tournaments);
  const completed = tournaments.filter((t) => getResult(t).complete);
  const records = aggregateRecords(tournaments);
  // Competition ranking: players with the same medal record share a number, and the
  // next distinct record skips ahead (so two co-champions are both #1, next is #3…).
  const sameRecord = (a: (typeof records)[number], b: (typeof records)[number]) =>
    a.firsts === b.firsts && a.seconds === b.seconds && a.thirds === b.thirds && a.events === b.events;
  const rankOf = records.map((r, i) => (i > 0 && sameRecord(records[i - 1], r) ? -1 : i + 1));
  rankOf.forEach((v, i) => {
    if (v === -1) rankOf[i] = rankOf[i - 1];
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-[var(--muted)] hover:underline">
          ← All tournaments
        </Link>
        <h1 className="text-2xl font-bold mt-2 flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" /> Record Book
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Hall of fame across {completed.length} completed {completed.length === 1 ? "event" : "events"}.
        </p>
      </div>

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
          {/* Hall of Fame */}
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60">
            <div className="px-4 py-2.5 border-b border-[var(--border)] font-bold text-sm">
              Hall of Fame
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--muted)] border-b border-[var(--border)] bg-[var(--subtle)]">
                  <th className="px-3 py-2 w-10">#</th>
                  <th className="px-3 py-2">Player</th>
                  <th className="px-2 py-2 w-12" title="Championships">
                    <Emoji e="🥇" className="h-4 w-4 mx-auto" />
                  </th>
                  <th className="px-2 py-2 w-12">
                    <Emoji e="🥈" className="h-4 w-4 mx-auto" />
                  </th>
                  <th className="px-2 py-2 w-12">
                    <Emoji e="🥉" className="h-4 w-4 mx-auto" />
                  </th>
                  <th className="px-2 py-2 text-center w-16">Events</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={r.name} className={`border-b border-[var(--border)] last:border-0 ${rankOf[i] === 1 && r.firsts > 0 ? "bg-[var(--win-bg)]" : ""}`}>
                    <td className="px-3 py-2 font-bold text-[var(--muted)]">{rankOf[i]}</td>
                    <td className="px-3 py-2 font-medium">
                      <span className="flex items-center gap-2.5">
                        <Avatar name={r.name} color={colorForName(r.name)} />
                        {r.name}
                        {rankOf[i] === 1 && r.firsts > 0 && <Crown className="h-4 w-4 text-amber-500" />}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center tabular-nums font-bold text-amber-500">{r.firsts || ""}</td>
                    <td className="px-2 py-2 text-center tabular-nums text-[var(--muted)]">{r.seconds || ""}</td>
                    <td className="px-2 py-2 text-center tabular-nums text-[var(--muted)]">{r.thirds || ""}</td>
                    <td className="px-2 py-2 text-center tabular-nums text-[var(--muted)]">{r.events}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
  // Flatten placement tiers into display rows, but keep each tier's shared rank and
  // medal — so both doubles champions show 🥇 at #1, both runners-up 🥈, etc.
  const tiers = getPlacementTiers(t);
  const entries: { name: string; rank: number; medal?: string }[] = [];
  let pos = 1;
  tiers.forEach((tier, ti) => {
    const rank = pos;
    tier.forEach((name) => entries.push({ name, rank, medal: MEDAL[ti] }));
    pos += tier.length;
  });

  return (
    <Card className="p-4">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between gap-3 text-left">
        <span className="min-w-0">
          <Link href={`/t/${t.id}`} className="font-semibold hover:text-[var(--brand)] flex items-center gap-2">
            <SportIcon sport={t.sport} className="h-4 w-4 text-[var(--brand)]" />
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
