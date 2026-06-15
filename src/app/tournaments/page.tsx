"use client";

import { HydrationGate } from "@/components/HydrationGate";
import { TournamentList } from "@/components/TournamentList";
import { RecoveryNudge } from "@/components/RecoveryNudge";
import { SyncPanel } from "@/components/SyncPanel";

export default function TournamentsPage() {
  return (
    <HydrationGate>
      <RecoveryNudge />
      <h1 className="text-2xl font-display font-bold mb-4 text-center">My Tournaments</h1>
      <TournamentList />
      <div className="mt-10 pt-6 border-t border-[var(--border)]">
        <SyncPanel />
      </div>
    </HydrationGate>
  );
}
