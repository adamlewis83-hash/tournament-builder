"use client";

import { useRouter } from "next/navigation";
import { Plus } from "@/components/icons";
import { Card } from "@/components/ui";
import { HydrationGate } from "@/components/HydrationGate";
import { CreateTournamentForm } from "@/components/CreateTournamentForm";

export default function NewTournamentPage() {
  const router = useRouter();
  return (
    <HydrationGate>
      <h1 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-strong)] text-[var(--on-brand)]">
          <Plus className="h-5 w-5" weight="bold" />
        </span>
        New tournament
      </h1>
      <Card className="p-5">
        {/* onDone fires on cancel; on create the form routes to the new tournament itself. */}
        <CreateTournamentForm onDone={() => router.push("/tournaments")} />
      </Card>
    </HydrationGate>
  );
}
