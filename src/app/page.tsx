"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { FORMAT_LABELS, PLAYSTYLE_LABELS } from "@/lib/types";
import { decodeTournament } from "@/lib/share";
import { sportEmoji } from "@/lib/sportEmoji";
import { Badge, Button, Card } from "@/components/ui";
import { CreateTournamentForm } from "@/components/CreateTournamentForm";
import { HydrationGate } from "@/components/HydrationGate";
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

const SPORT_EMOJIS = ["🏓", "🎾", "🏀", "⛳", "🏐", "🎯", "🎳", "🥏", "♟️", "🎮", "🏸", "🥎"];

const FORMAT_LIST: { f: keyof typeof FORMAT_LABELS; c: string }[] = [
  { f: "round-robin", c: "blue" },
  { f: "swiss", c: "slate" },
  { f: "kotc", c: "amber" },
  { f: "single-elim", c: "green" },
  { f: "double-elim", c: "purple" },
  { f: "pool-bracket", c: "amber" },
  { f: "ryder", c: "rose" },
  { f: "golf", c: "green" },
];

function Hero({ creating, onCreate }: { creating: boolean; onCreate: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-3xl glass p-7 sm:p-10 mb-6">
      <div className="relative z-10 max-w-2xl">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand)] bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--win)] pulse-ring" />
          OFFLINE-FIRST · ANY SPORT
        </span>
        <h1 className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-tight leading-none">
          <span className="brand-animated">Seeded</span>
        </h1>
        <p className="mt-3 text-xl sm:text-2xl font-bold">
          Run any tournament. Crown a champion. 🏆
        </p>
        <p className="mt-2 text-[var(--muted)] max-w-xl">
          Round robins, brackets, pool play, Swiss, King of the Court, Ryder Cup and full golf
          scorecards — for any sport. Score it live together on everyone&apos;s phone.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {!creating && (
            <Button onClick={onCreate} className="text-base px-6 py-3">
              + New Tournament
            </Button>
          )}
          <div className="flex flex-wrap gap-1.5">
            {FORMAT_LIST.map(({ f, c }) => (
              <Badge key={f} color={c}>
                {FORMAT_LABELS[f]}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-7 hidden sm:flex items-center gap-4 text-2xl opacity-60">
        {SPORT_EMOJIS.map((e, i) => (
          <span key={i} className="animate-float" style={{ animationDelay: `${(i % 6) * 0.25}s` }}>
            {e}
          </span>
        ))}
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
        <h2 className="font-semibold flex items-center gap-2">📡 Join a live tournament</h2>
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

  if (tournaments.length === 0) {
    return (
      <Card className="p-10 text-center">
        <div className="text-4xl mb-3 flex justify-center gap-2">
          <span className="animate-float" style={{ animationDelay: "0s" }}>🏓</span>
          <span className="animate-float" style={{ animationDelay: ".4s" }}>🏀</span>
          <span className="animate-float" style={{ animationDelay: ".8s" }}>🎯</span>
        </div>
        <p className="font-semibold">No tournaments yet</p>
        <p className="text-sm text-[var(--muted)]">
          Hit <span className="text-[var(--brand)] font-medium">+ New Tournament</span> to build a
          schedule, track scores, and crown a champion.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {tournaments.map((t) => {
        const played = t.matches.filter((m) => m.scoreA !== null && m.scoreB !== null).length;
        return (
          <Card key={t.id} className="p-4 flex flex-col">
            <Link href={`/t/${t.id}`} className="flex-1 block group">
              <div className="flex items-center gap-2 mb-2">
                <Badge color={FORMAT_COLOR[t.format]}>{FORMAT_LABELS[t.format]}</Badge>
                {!t.generated && <Badge color="slate">Setup</Badge>}
              </div>
              <h3 className="font-bold text-lg group-hover:brand-text transition flex items-center gap-2">
                <span className="text-xl">{sportEmoji(t.sport)}</span>
                {t.name}
              </h3>
              <p className="text-sm text-[var(--muted)]">
                {t.sport} · {PLAYSTYLE_LABELS[t.playStyle].split(" ")[0]}
              </p>
              <p className="text-xs text-[var(--muted)] mt-2">
                {t.participants.length} participants
                {t.matches.length > 0 && ` · ${played}/${t.matches.length} games played`}
              </p>
            </Link>
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
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
  );
}
