"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore, useTournament } from "@/lib/store";
import { FORMAT_LABELS, PLAYSTYLE_LABELS } from "@/lib/types";
import { Badge, Button, Card } from "@/components/ui";
import { HydrationGate } from "@/components/HydrationGate";
import { SetupPanel } from "@/components/SetupPanel";
import { ScheduleView } from "@/components/ScheduleView";
import { FinalsPanel } from "@/components/FinalsPanel";
import { PoolView } from "@/components/PoolView";
import { SwissView } from "@/components/SwissView";
import { BracketView } from "@/components/BracketView";
import { Champion } from "@/components/Champion";
import { ShareBar } from "@/components/ShareBar";

export default function TournamentPage() {
  const params = useParams<{ id: string }>();
  return (
    <HydrationGate>
      <TournamentDetail id={params.id} />
    </HydrationGate>
  );
}

function TournamentDetail({ id }: { id: string }) {
  const t = useTournament(id);
  const patch = useStore((s) => s.patchTournament);
  const reset = useStore((s) => s.resetToSetup);
  const [tab, setTab] = useState<"schedule" | "standings">("schedule");

  if (!t) {
    return (
      <Card className="p-10 text-center">
        <p className="font-medium">Tournament not found</p>
        <Link href="/" className="text-[var(--brand)] hover:underline text-sm">
          ← Back to all tournaments
        </Link>
      </Card>
    );
  }

  const isElim = t.format === "single-elim" || t.format === "double-elim";

  return (
    <div className="space-y-5">
      <div>
        <Link href="/" className="text-sm text-[var(--muted)] hover:underline">
          ← All tournaments
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
          <div className="flex items-center gap-3">
            <input
              value={t.name}
              onChange={(e) => patch(t.id, { name: e.target.value })}
              className="text-2xl font-bold bg-transparent border-b border-transparent hover:border-[var(--border)] focus:border-[var(--brand)] outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge color="blue">{FORMAT_LABELS[t.format]}</Badge>
            <Badge color="slate">{PLAYSTYLE_LABELS[t.playStyle]}</Badge>
            {t.generated && <ShareBar t={t} />}
            {t.generated && (
              <Button
                variant="outline"
                className="px-2.5 py-1.5"
                onClick={() => {
                  if (
                    confirm(
                      "Reset to setup? This clears the schedule/bracket and all scores for this tournament.",
                    )
                  )
                    reset(t.id);
                }}
              >
                Edit setup
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-[var(--muted)] mt-1">
          {t.sport} · {t.participants.length} participants
        </p>
      </div>

      {!t.generated && <SetupPanel t={t} />}

      {t.generated && t.format === "round-robin" && (
        <div className="space-y-4">
          <Champion matches={t.matches} participants={t.participants} />
          <div className="inline-flex rounded-lg border bg-[var(--surface)] p-1">
            <TabButton active={tab === "schedule"} onClick={() => setTab("schedule")}>
              Schedule
            </TabButton>
            <TabButton active={tab === "standings"} onClick={() => setTab("standings")}>
              Standings &amp; Finals
            </TabButton>
          </div>
          {tab === "schedule" ? (
            <ScheduleView
              matches={t.matches.filter((m) => m.phase === "rr")}
              participants={t.participants}
              tournamentId={t.id}
            />
          ) : (
            <FinalsPanel t={t} />
          )}
        </div>
      )}

      {t.generated && isElim && (
        <div className="space-y-4">
          <Champion matches={t.matches} participants={t.participants} />
          <BracketView matches={t.matches} participants={t.participants} tournamentId={t.id} />
        </div>
      )}

      {t.generated && t.format === "swiss" && <SwissView t={t} />}

      {t.generated && t.format === "pool-bracket" && <PoolView t={t} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-gradient-to-r from-cyan-400 to-indigo-400 text-slate-950"
          : "text-[var(--muted)] hover:text-[var(--foreground)]"
      }`}
    >
      {children}
    </button>
  );
}
