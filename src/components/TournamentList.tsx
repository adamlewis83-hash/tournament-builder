"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trophy } from "@/components/icons";
import { SportIcon } from "@/components/SportIcon";
import { useStore } from "@/lib/store";
import { FORMAT_LABELS, PLAYSTYLE_LABELS, Tournament } from "@/lib/types";
import { getResult } from "@/lib/result";
import { colorForName } from "@/lib/colors";
import { Badge, Card } from "@/components/ui";

type CardStatus = { label: string; kind: "live" | "final" | "setup" | "play" };

function statusOf(t: Tournament, complete: boolean): CardStatus {
  if (t.liveCode) return { label: "Live", kind: "live" };
  if (complete) return { label: "Final", kind: "final" };
  if (!t.generated) return { label: "Setup", kind: "setup" };
  return { label: "In play", kind: "play" };
}

// Fraction of the event that's been played, for the progress bar. Null when a format has no
// clean game count (ladder / score-challenge / custom-before-matches) — the status pill carries it.
function cardProgress(t: Tournament): { done: number; total: number } | null {
  if (t.matches.length) {
    const done = t.matches.filter((m) => m.scoreA !== null && m.scoreB !== null).length;
    return { done, total: t.matches.length };
  }
  if (t.format === "golf" && t.golf) {
    const total = t.golf.holes * t.participants.length;
    if (!total) return null;
    let done = 0;
    for (const card of Object.values(t.golf.scores)) done += card.filter((v) => v != null).length;
    return { done: Math.min(done, total), total };
  }
  return null;
}

function StatusPill({ status }: { status: CardStatus }) {
  const base =
    "absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide";
  if (status.kind === "live")
    return (
      <span className={`${base} border-rose-400/40 bg-rose-500/15 text-rose-400`}>
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400 pulse-ring" />
        {status.label}
      </span>
    );
  if (status.kind === "final")
    return (
      <span className={`${base} border-[var(--win)]/40 bg-[var(--win-bg)] text-[var(--win)]`}>
        {status.label}
      </span>
    );
  if (status.kind === "setup")
    return <span className={`${base} border-[var(--border)] text-[var(--muted)]`}>{status.label}</span>;
  return (
    <span className={`${base} border-[var(--brand)]/30 bg-[var(--brand-soft)] text-[var(--brand)]`}>
      {status.label}
    </span>
  );
}

// Duplicate / Delete tucked behind a ⋯ button so the card leads with one primary action.
function OverflowMenu({ onDuplicate, onDelete }: { onDuplicate: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="More actions"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md px-2 py-1 text-lg leading-none text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
      >
        ⋯
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-20 cursor-default"
          />
          <div className="absolute right-0 bottom-full z-30 mb-1 w-32 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDuplicate();
              }}
              className="block w-full px-3 py-1.5 text-left text-sm hover:bg-[var(--hover)]"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="block w-full px-3 py-1.5 text-left text-sm text-rose-400 hover:bg-[var(--hover)]"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function TournamentList() {
  const tournaments = useStore((s) => s.tournaments);
  const remove = useStore((s) => s.removeTournament);
  const duplicate = useStore((s) => s.duplicateTournament);
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");

  if (tournaments.length === 0) {
    return (
      <Card bare className="px-5 py-12 text-center">
        <div className="mb-4 flex justify-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-strong)] shadow-lg shadow-[var(--brand)]/25">
            <Trophy className="h-8 w-8 text-amber-300" />
          </span>
        </div>
        <h2 className="text-xl font-display font-bold">Start your first tournament</h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-[var(--muted)]">
          Any sport, any format — set it up in under a minute and score it live on every phone.
        </p>
        <div className="mt-5 flex justify-center">
          <Link
            href="/new"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--brand)] to-[var(--brand-strong)] px-6 py-3 font-semibold text-[var(--on-brand)] shadow-sm transition hover:opacity-95"
          >
            <Plus className="h-5 w-5" weight="bold" /> New Tournament
          </Link>
        </div>
        <div className="mx-auto mt-9 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
          {[
            ["1", "Pick a sport & format", "Pickleball, golf, cornhole — 15+ formats built in."],
            ["2", "Add players or share a code", "Type names, or let everyone self-register from their own phone."],
            ["3", "Score live, crown a champion", "Brackets, standings and the winner update in real time."],
          ].map(([n, title, desc]) => (
            <div key={n} className="rounded-xl border border-[var(--border)] bg-[var(--subtle)] p-4">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--brand)] text-sm font-bold text-[var(--on-brand)]">
                {n}
              </span>
              <p className="mt-2.5 text-sm font-semibold">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{desc}</p>
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
            const status = statusOf(t, res.complete);
            const prog = cardProgress(t);
            const accent = colorForName(t.sport);
            const primary = !t.generated ? "Finish setup" : res.complete ? "View results" : "Open";
            const pct = prog && prog.total ? Math.round((prog.done / prog.total) * 100) : 0;
            return (
              <Card
                key={t.id}
                bare
                className="relative basis-full sm:basis-[calc(50%-0.5rem)] lg:basis-[calc(33.333%-0.667rem)] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40 p-4 pl-6 shadow-sm transition hover:border-[var(--brand)]/40 hover:bg-[var(--surface)]/80"
              >
                {/* sport-tinted accent rail (color derived from the sport, from the existing palette) */}
                <span
                  aria-hidden
                  className="absolute left-2 top-4 bottom-4 w-1 rounded-full"
                  style={{ background: accent }}
                />
                <StatusPill status={status} />
                <Link href={`/t/${t.id}`} className="group block">
                  <div className="mb-2 pr-16">
                    <Badge accent={accent}>{FORMAT_LABELS[t.format]}</Badge>
                  </div>
                  <h3 className="flex items-center gap-2 text-lg font-bold transition group-hover:brand-text">
                    <span
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                        color: accent,
                      }}
                    >
                      <SportIcon sport={t.sport} className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 truncate">{t.name}</span>
                  </h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {t.sport} · {PLAYSTYLE_LABELS[t.playStyle].split(" ")[0]}
                  </p>
                </Link>

                <div className="mt-3 flex-1">
                  {res.winner ? (
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-500">
                      <Trophy className="h-4 w-4" /> {res.winner}
                    </p>
                  ) : prog ? (
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs text-[var(--muted)]">
                        <span>{t.participants.length} players</span>
                        <span className="tabular-nums">
                          {prog.done}/{prog.total}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                        <div
                          className="h-full rounded-full bg-[var(--brand)] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--muted)]">{t.participants.length} participants</p>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
                  <Link
                    href={`/t/${t.id}`}
                    className="text-sm font-semibold text-[var(--brand)] hover:underline"
                  >
                    {primary} →
                  </Link>
                  <OverflowMenu
                    onDuplicate={() => duplicate(t.id)}
                    onDelete={() => {
                      if (confirm(`Delete "${t.name}"? This cannot be undone.`)) remove(t.id);
                    }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
