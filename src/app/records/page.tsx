"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Tournament, FORMAT_LABELS } from "@/lib/types";
import { aggregateRecords, getRanking } from "@/lib/records";
import { getResult } from "@/lib/result";
import { sportEmoji } from "@/lib/sportEmoji";
import { Card } from "@/components/ui";
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

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-[var(--muted)] hover:underline">
          ← All tournaments
        </Link>
        <h1 className="text-2xl font-bold mt-2 flex items-center gap-2">🏆 Record Book</h1>
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
                  <th className="px-2 py-2 text-center w-12" title="Championships">🥇</th>
                  <th className="px-2 py-2 text-center w-12">🥈</th>
                  <th className="px-2 py-2 text-center w-12">🥉</th>
                  <th className="px-2 py-2 text-center w-16">Events</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={r.name} className={`border-b border-[var(--border)] last:border-0 ${i === 0 && r.firsts > 0 ? "bg-[var(--win-bg)]" : ""}`}>
                    <td className="px-3 py-2 font-bold text-[var(--muted)]">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">
                      {r.name}
                      {i === 0 && r.firsts > 0 && <span className="ml-1.5">👑</span>}
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
  const ranking = getRanking(t);

  return (
    <Card className="p-4">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between gap-3 text-left">
        <span className="min-w-0">
          <Link href={`/t/${t.id}`} className="font-semibold hover:text-[var(--brand)] flex items-center gap-2">
            <span>{sportEmoji(t.sport)}</span>
            <span className="truncate">{t.name}</span>
          </Link>
          <span className="text-sm text-amber-500 font-medium flex items-center gap-1 mt-0.5">
            🏆 {res.winner}
          </span>
        </span>
        <span className="text-xs text-[var(--muted)] shrink-0">
          {FORMAT_LABELS[t.format]} · {open ? "hide" : "results"}
        </span>
      </button>

      {open && (
        <ol className="mt-3 border-t border-[var(--border)] pt-3 space-y-1 text-sm">
          {ranking.map((n, i) => (
            <li key={`${n}-${i}`} className="flex items-center gap-2">
              <span className="w-6 text-center">{MEDAL[i] ?? `${i + 1}.`}</span>
              <span className={i === 0 ? "font-semibold" : ""}>{n}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
