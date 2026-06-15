"use client";

import { useState } from "react";
import Link from "next/link";
import { Trophy } from "@/components/icons";
import { useStore } from "@/lib/store";
import { FORMAT_LABELS, PLAYSTYLE_LABELS } from "@/lib/types";
import { sportEmoji } from "@/lib/sportEmoji";
import { getResult } from "@/lib/result";
import { Badge, Button, Card } from "@/components/ui";
import { Emoji } from "@/components/Emoji";

const FORMAT_COLOR: Record<string, string> = {
  "round-robin": "blue",
  swiss: "slate",
  kotc: "amber",
  "single-elim": "green",
  "double-elim": "purple",
  "pool-bracket": "amber",
  ryder: "rose",
  golf: "green",
};

export function TournamentList() {
  const tournaments = useStore((s) => s.tournaments);
  const remove = useStore((s) => s.removeTournament);
  const duplicate = useStore((s) => s.duplicateTournament);
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");

  if (tournaments.length === 0) {
    return (
      <Card bare className="p-10 text-center">
        <div className="mb-3 flex justify-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <Trophy className="h-7 w-7" />
          </span>
        </div>
        <p className="font-semibold">No tournaments yet</p>
        <p className="text-sm text-[var(--muted)]">
          Hit <span className="text-[var(--brand)] font-medium">New</span> to get started —
          here&apos;s how it works:
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3 max-w-xl mx-auto text-left">
          {[
            ["1", "Pick a sport & format"],
            ["2", "Add players, share a code"],
            ["3", "Score live, crown a champion"],
          ].map(([n, t]) => (
            <div key={n} className="rounded-xl bg-[var(--subtle)] p-3">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--brand)] text-xs font-bold text-[var(--on-brand)]">
                {n}
              </span>
              <p className="mt-2 text-sm font-medium">{t}</p>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const withResult = tournaments.map((t) => ({ t, res: getResult(t) }));
  const shown = withResult.filter(({ res }) =>
    filter === "all" ? true : filter === "done" ? res.complete : !res.complete,
  );
  const doneCount = withResult.filter(({ res }) => res.complete).length;

  const TABS: { k: typeof filter; label: string }[] = [
    { k: "all", label: `All ${tournaments.length}` },
    { k: "active", label: `Active ${tournaments.length - doneCount}` },
    { k: "done", label: `Completed ${doneCount}` },
  ];

  return (
    <>
      <div className="flex justify-center gap-1 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.k}
            onClick={() => setFilter(tab.k)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              filter === tab.k
                ? "bg-gradient-to-r from-[var(--brand)] to-[var(--brand-strong)] text-[var(--on-brand)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <Card bare className="p-8 text-center text-sm text-[var(--muted)]">
          No {filter === "done" ? "completed" : "active"} tournaments.
        </Card>
      ) : (
        <div className="flex flex-wrap justify-center gap-4">
          {shown.map(({ t, res }) => {
            const played = t.matches.filter((m) => m.scoreA !== null && m.scoreB !== null).length;
            return (
              <Card key={t.id} bare className="basis-full sm:basis-[calc(50%-0.5rem)] lg:basis-[calc(33.333%-0.667rem)] p-4 flex flex-col rounded-2xl hover:bg-[var(--surface)]/70 transition">
                <Link href={`/t/${t.id}`} className="flex-1 block group">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge color={FORMAT_COLOR[t.format]}>{FORMAT_LABELS[t.format]}</Badge>
                    {!t.generated && <Badge color="slate">Setup</Badge>}
                    {res.complete && <Badge color="green">✓ Complete</Badge>}
                  </div>
                  <h3 className="font-bold text-lg group-hover:brand-text transition flex items-center gap-2">
                    <Emoji e={sportEmoji(t.sport)} className="h-5 w-5" />
                    {t.name}
                  </h3>
                  <p className="text-sm text-[var(--muted)]">
                    {t.sport} · {PLAYSTYLE_LABELS[t.playStyle].split(" ")[0]}
                  </p>
                  {res.winner ? (
                    <p className="text-sm mt-2 font-semibold text-amber-500 flex items-center gap-1.5">
                      <Trophy className="h-4 w-4" /> {res.winner}
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--muted)] mt-2">
                      {t.participants.length} participants
                      {t.matches.length > 0 && ` · ${played}/${t.matches.length} games played`}
                    </p>
                  )}
                </Link>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
                  <Link
                    href={`/t/${t.id}`}
                    className="text-sm font-medium text-[var(--brand)] hover:underline"
                  >
                    Open →
                  </Link>
                  <div className="flex gap-1">
                    <Button variant="ghost" className="px-2 py-1" onClick={() => duplicate(t.id)}>
                      Duplicate
                    </Button>
                    <Button
                      variant="danger"
                      className="px-2 py-1"
                      onClick={() => {
                        if (confirm(`Delete "${t.name}"? This cannot be undone.`)) remove(t.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
