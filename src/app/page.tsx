"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Radio } from "@/components/icons";
import { useStore } from "@/lib/store";
import { decodeTournament } from "@/lib/share";
import { Button, Card } from "@/components/ui";
import { HydrationGate } from "@/components/HydrationGate";
import { SportBackdrop } from "@/components/SportBackdrop";
import { SporosMark } from "@/components/SporosMark";
import { DeviceShowcase } from "@/components/DeviceShowcase";
import { SignInCTA } from "@/components/SignInCTA";
import { GetTheApp } from "@/components/GetTheApp";
import { TournamentList } from "@/components/TournamentList";
import { getAccountEmail } from "@/lib/library";

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

export default function Home() {
  const router = useRouter();
  useSharedImport();
  // Legacy ?new=1 links now open the dedicated New screen.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new")) router.replace("/new");
  }, [router]);
  return (
    <HydrationGate>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-0 flex justify-center overflow-hidden pb-[10vh]"
      >
        <SporosMark className="h-[55vmin] w-[55vmin] max-w-none text-[var(--brand)] opacity-[0.05]" />
      </div>
      <HomeBody />
    </HydrationGate>
  );
}

// Renders only after hydration (inside HydrationGate), so reading sign-in state is safe.
function HomeBody() {
  const router = useRouter();
  const email = getAccountEmail();
  if (email) return <SignedInHome />;
  return (
    <>
      <Hero onCreate={() => router.push("/new")} />
      <SignInCTA />
      <JoinByCode />
      <DeviceShowcase />
      <GetTheApp />
    </>
  );
}

// Signed-in dashboard: welcome + quick actions + your tournaments (no marketing pitch).
function SignedInHome() {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand)] font-bold">
            Welcome back
          </p>
          <h1 className="text-2xl font-display font-bold">Your tournaments</h1>
        </div>
        <Button
          onClick={() => router.push("/new")}
          className="inline-flex items-center gap-2 shrink-0"
        >
          <Plus className="h-5 w-5" weight="bold" /> New Tournament
        </Button>
      </div>
      <JoinByCode />
      <TournamentList />
    </div>
  );
}

function Hero({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen -mt-6 mb-6 overflow-hidden">
      <SportBackdrop />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-black/20" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[var(--background)]" />
      <div
        className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8 pt-10 pb-9 sm:pt-12 sm:pb-10 text-white"
        style={{ textShadow: "0 2px 16px rgba(0,0,0,0.55)" }}
      >
        <span className="inline-flex items-center gap-2 text-sm sm:text-base font-bold tracking-[0.22em] text-emerald-200">
          <span className="h-2 w-2 rounded-full bg-[var(--win)] pulse-ring" />
          WHERE COMPETITION TAKES ROOT
        </span>
        <h1 className="mt-3 text-3xl sm:text-5xl font-display font-bold tracking-tight leading-[1.1]">
          <span className="text-emerald-400">Seed.</span> <span className="text-white">Play.</span>{" "}
          <span className="text-amber-300">Crown.</span>
        </h1>
        <p className="mt-3 text-xl sm:text-2xl font-display font-semibold text-white/90">
          Run a tournament for any sport — scored live on every phone.
        </p>

        <div className="mt-6">
          <Button onClick={onCreate} className="text-base px-6 py-3 inline-flex items-center gap-2">
            <Plus className="h-5 w-5" weight="bold" /> New Tournament
          </Button>
        </div>
      </div>
    </section>
  );
}

function JoinByCode() {
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <Card bare className="px-1 mb-6 flex flex-wrap items-center gap-3">
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
