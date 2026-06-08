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
import { KotcView } from "@/components/KotcView";
import { AmericanoView } from "@/components/AmericanoView";
import { FormatInfo } from "@/components/FormatInfo";
import { RyderView } from "@/components/RyderView";
import { GolfView } from "@/components/GolfView";
import { BracketView } from "@/components/BracketView";
import { Champion } from "@/components/Champion";
import { ShareBar } from "@/components/ShareBar";
import { LivePanel } from "@/components/LivePanel";
import { useLiveSync } from "@/hooks/useLiveSync";

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
  useLiveSync(id, t?.liveCode, t?.liveVersion);

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
              disabled={t.spectator}
              className="text-2xl font-bold bg-transparent border-b border-transparent hover:border-[var(--border)] focus:border-[var(--brand)] outline-none disabled:hover:border-transparent"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge color="blue">{FORMAT_LABELS[t.format]}</Badge>
            {t.format !== "ryder" && t.format !== "golf" && (
              <Badge color="slate">{PLAYSTYLE_LABELS[t.playStyle]}</Badge>
            )}
            <FormatInfo t={t} />
            {t.generated && <ShareBar t={t} />}
            {t.generated && !t.spectator && (
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

      {t.spectator && (
        <div className="rounded-xl border border-[var(--brand)]/30 bg-[var(--brand-soft)] px-4 py-2.5 text-sm flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[var(--win)] pulse-ring shrink-0" />
          <span>
            <span className="font-semibold">Watching live</span> — scores update from the host
            automatically. You&apos;re a spectator, so scoring is read-only.
          </span>
        </div>
      )}

      {t.generated && !t.spectator && <LivePanel t={t} />}

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

      {t.generated && t.format === "kotc" && <KotcView t={t} />}

      {t.generated && (t.format === "americano" || t.format === "mexicano") && (
        <AmericanoView t={t} />
      )}

      {t.generated && t.format === "ryder" && <RyderView t={t} />}

      {t.generated && t.format === "golf" && <GolfView t={t} />}

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
          ? "bg-gradient-to-r from-[var(--brand)] to-[var(--brand-strong)] text-[var(--on-brand)]"
          : "text-[var(--muted)] hover:text-[var(--foreground)]"
      }`}
    >
      {children}
    </button>
  );
}
