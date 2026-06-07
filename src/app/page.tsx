"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Radio, Trophy } from "@/components/icons";
import { useStore } from "@/lib/store";
import { FORMAT_LABELS, PLAYSTYLE_LABELS } from "@/lib/types";
import { decodeTournament } from "@/lib/share";
import { sportEmoji } from "@/lib/sportEmoji";
import { getResult } from "@/lib/result";
import { Badge, Button, Card } from "@/components/ui";
import { CreateTournamentForm } from "@/components/CreateTournamentForm";
import { HydrationGate } from "@/components/HydrationGate";
import { Emoji } from "@/components/Emoji";
import { SyncPanel } from "@/components/SyncPanel";

function useSharedImport() {
  const router = useRouter();
  const importTournament = useStore((s) => s.importTournament);
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("t");
    if (!code) return;
    const t = decodeTournament(code);
    if (t) {
      const id = importTournament(t);
      router.replace(`/t/${id}`);
    } else {
      router.replace("/");
    }
  }, [router, importTournament]);
}

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

export default function Home() {
  const [creating, setCreating] = useState(false);
  useSharedImport();
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new")) setCreating(true);
  }, []);
  return (
    <HydrationGate>
      <Hero creating={creating} onCreate={() => setCreating(true)} />

      {creating && (
        <Card className="p-5 mb-6">
          <h2 className="font-semibold mb-4">New tournament</h2>
          <CreateTournamentForm onDone={() => setCreating(false)} />
        </Card>
      )}

      <JoinByCode />
      <SyncPanel />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Your tournaments</h2>
        {!creating && (
          <Button variant="outline" className="px-3 py-1.5" onClick={() => setCreating(true)}>
            + New
          </Button>
        )}
      </div>
      <TournamentList />
    </HydrationGate>
  );
}

const ROTATING_FORMATS: { label: string; color: string }[] = [
  { label: "Round Robin", color: "text-sky-500" },
  { label: "Swiss", color: "text-slate-500" },
  { label: "King of the Court", color: "text-amber-500" },
  { label: "Single Elimination", color: "text-emerald-500" },
  { label: "Double Elimination", color: "text-violet-500" },
  { label: "Pool Play → Bracket", color: "text-orange-500" },
  { label: "Ryder Cup", color: "text-rose-500" },
];

function RotatingFormats() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % ROTATING_FORMATS.length), 2000);
    return () => clearInterval(id);
  }, []);
  const f = ROTATING_FORMATS[i];
  return (
    <span className="inline-block min-h-[1.6em]">
      <span key={i} className={`animate-pop inline-block font-display font-bold text-2xl sm:text-3xl ${f.color}`}>
        {f.label}
      </span>
    </span>
  );
}

function Hero({ creating, onCreate }: { creating: boolean; onCreate: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-3xl glass p-7 sm:p-10 mb-6">
      <div className="relative z-10 max-w-2xl">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand)] bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--win)] pulse-ring" />
          OFFLINE-FIRST · ANY SPORT
        </span>
        <h1 className="mt-4 text-5xl sm:text-7xl font-display font-bold tracking-tight leading-none">
          <span className="brand-animated">Seeded</span>
        </h1>
        <p className="mt-3 flex items-center gap-2 text-xl sm:text-2xl font-display font-bold">
          Run any tournament. Crown a champion.
          <Trophy className="h-6 w-6 text-amber-400 shrink-0" />
        </p>
        <p className="mt-2 text-[var(--muted)] max-w-xl">
          Round robins, brackets, pool play, Swiss, King of the Court, Ryder Cup and full golf
          scorecards — for any sport. Score it live together on everyone&apos;s phone.
        </p>

        <div className="mt-6">
          {!creating && (
            <Button onClick={onCreate} className="text-base px-6 py-3 inline-flex items-center gap-2">
              <Plus className="h-5 w-5" weight="bold" /> New Tournament
            </Button>
          )}
        </div>

        <div className="mt-6">
          <span className="block text-[11px] uppercase tracking-[0.2em] text-[var(--muted)] font-semibold mb-0.5">
            Formats
          </span>
          <RotatingFormats />
        </div>
      </div>
    </div>
  );
}

function JoinByCode() {
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <Card className="p-4 mb-6 flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[180px]">
        <h2 className="font-semibold flex items-center gap-2">
          <Radio className="h-4 w-4 text-[var(--brand)]" /> Join a live tournament
        </h2>
        <p className="text-sm text-[var(--muted)]">Got a code from the host? Hop in to follow &amp; score live.</p>
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) router.push(`/live/${code.trim().toUpperCase()}`);
        }}
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="CODE"
          maxLength={6}
          className="w-28 rounded-lg border border-[var(--border)] px-3 py-2 text-center text-lg font-bold tracking-[0.2em] uppercase bg-[var(--surface)]"
        />
        <Button type="submit" disabled={!code.trim()}>
          Join
        </Button>
      </form>
    </Card>
  );
}

function TournamentList() {
  const tournaments = useStore((s) => s.tournaments);
  const remove = useStore((s) => s.removeTournament);
  const duplicate = useStore((s) => s.duplicateTournament);
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");

  if (tournaments.length === 0) {
    return (
      <Card className="p-10 text-center">
        <div className="mb-3 flex justify-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <Trophy className="h-7 w-7" />
          </span>
        </div>
        <p className="font-semibold">No tournaments yet</p>
        <p className="text-sm text-[var(--muted)]">
          Hit <span className="text-[var(--brand)] font-medium">+ New Tournament</span> to build a
          schedule, track scores, and crown a champion.
        </p>
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
      <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 mb-4">
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
        <Card className="p-8 text-center text-sm text-[var(--muted)]">
          No {filter === "done" ? "completed" : "active"} tournaments.
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map(({ t, res }) => {
            const played = t.matches.filter((m) => m.scoreA !== null && m.scoreB !== null).length;
            return (
              <Card key={t.id} className="p-4 flex flex-col">
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
