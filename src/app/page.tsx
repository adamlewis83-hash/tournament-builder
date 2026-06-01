"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { FORMAT_LABELS, PLAYSTYLE_LABELS } from "@/lib/types";
import { Badge, Button, Card } from "@/components/ui";
import { CreateTournamentForm } from "@/components/CreateTournamentForm";
import { HydrationGate } from "@/components/HydrationGate";

const FORMAT_COLOR: Record<string, string> = {
  "round-robin": "blue",
  "single-elim": "green",
  "double-elim": "purple",
  "pool-bracket": "amber",
};

export default function Home() {
  const [creating, setCreating] = useState(false);
  return (
    <HydrationGate>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tournaments</h1>
          <p className="text-sm text-[var(--muted)]">
            Round robins, brackets &amp; pool play for any sport.
          </p>
        </div>
        {!creating && <Button onClick={() => setCreating(true)}>+ New Tournament</Button>}
      </div>

      {creating && (
        <Card className="p-5 mb-6">
          <h2 className="font-semibold mb-4">New tournament</h2>
          <CreateTournamentForm onDone={() => setCreating(false)} />
        </Card>
      )}

      <TournamentList />
    </HydrationGate>
  );
}

function TournamentList() {
  const tournaments = useStore((s) => s.tournaments);
  const remove = useStore((s) => s.removeTournament);
  const duplicate = useStore((s) => s.duplicateTournament);

  if (tournaments.length === 0) {
    return (
      <Card className="p-10 text-center">
        <div className="text-4xl mb-2">🎾</div>
        <p className="font-medium">No tournaments yet</p>
        <p className="text-sm text-[var(--muted)]">
          Create one to build a schedule, track scores, and crown a champion.
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
              <h3 className="font-semibold group-hover:text-[var(--brand)] transition">{t.name}</h3>
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
