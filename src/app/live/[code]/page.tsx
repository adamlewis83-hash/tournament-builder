"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { fetchLive } from "@/lib/live";
import { getProfile, setProfile } from "@/lib/profile";
import { registrationOpen, Tournament } from "@/lib/types";
import { Card, Button } from "@/components/ui";
import { HydrationGate } from "@/components/HydrationGate";
import { OpenInApp } from "@/components/OpenInApp";

export default function JoinLivePage() {
  const params = useParams<{ code: string }>();
  return (
    <HydrationGate>
      <Joiner code={params.code} />
    </HydrationGate>
  );
}

// A live link used to drop everyone into the leaderboard as a spectator, so a
// friend who was actually in the round had no way in as a player. Someone new
// to the event now picks: watch it, or say which player they are, which is
// what lets them keep score from their own phone.
function Joiner({ code }: { code: string }) {
  const router = useRouter();
  const joinLive = useStore((s) => s.joinLive);
  const [error, setError] = useState(false);
  const [event, setEvent] = useState<Tournament | null>(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const done = useRef(false);
  const upper = code.toUpperCase();

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    (async () => {
      // If the event is still in its lobby (registration) phase, someone
      // arriving by code is a player, not a spectator — send them to the
      // sign-up page. Spectator mode only makes sense once play has started.
      const live = await fetchLive(code);
      if (!live) {
        setError(true);
        return;
      }
      const data = live.data as Tournament;
      if (!data.generated) {
        router.replace(`/join/${code}`);
        return;
      }
      // Already on this phone (the host, or someone coming back): no question
      // to ask, their role is already settled.
      if (useStore.getState().tournaments.some((x) => x.id === data.id)) {
        const id = await joinLive(code);
        if (id) router.replace(`/t/${id}`);
        else setError(true);
        return;
      }
      setEvent(data);
    })();
  }, [code, joinLive, router]);

  async function enter(asPlayer?: string) {
    setBusy(true);
    // The round knows its players by name, and so does this phone: claiming a
    // roster name makes it this phone's profile name, which is what unlocks the
    // scorecard and puts "you" at the top of the golf card.
    if (asPlayer && getProfile().name.trim().toLowerCase() !== asPlayer.trim().toLowerCase())
      setProfile({ ...getProfile(), name: asPlayer });
    const id = await joinLive(code);
    if (id) router.replace(`/t/${id}`);
    else {
      setBusy(false);
      setError(true);
    }
  }

  if (error)
    return (
      <div className="py-20 text-center">
        <Card className="p-8 max-w-sm mx-auto">
          <div className="text-3xl mb-2">🤔</div>
          <p className="font-semibold">Tournament not found</p>
          <p className="text-sm text-[var(--muted)] mb-4">
            Code <span className="font-mono font-bold">{upper}</span> isn&apos;t live.
            Double-check it with the host.
          </p>
          <Button onClick={() => router.replace("/")}>Back home</Button>
        </Card>
      </div>
    );

  if (!event)
    return (
      <p className="py-20 text-center text-[var(--muted)]">
        Joining <span className="font-mono font-bold">{upper}</span>…
      </p>
    );

  const me = getProfile().name.trim().toLowerCase();
  // Pairs and teams list their people; everyone else is their own name.
  const players = event.participants.flatMap((p) => (p.members?.length ? p.members : [p.name]));
  const playersScore = event.playersScore !== false;
  const canRegister = registrationOpen(event);

  return (
    <div className="mx-auto max-w-md pt-6">
      <Card className="p-6 space-y-4 text-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
            Live on Sporos
          </p>
          <h1 className="text-2xl font-display font-bold">{event.name}</h1>
          <p className="text-sm text-[var(--muted)]">
            {event.sport} · {event.participants.length} playing
          </p>
        </div>

        <OpenInApp path={`/live/${upper}`} />

        {!picking ? (
          <div className="space-y-2">
            <Button className="w-full py-3" onClick={() => setPicking(true)} disabled={busy}>
              🙋 I&apos;m playing
            </Button>
            <Button
              variant="outline"
              className="w-full py-3"
              onClick={() => enter()}
              disabled={busy}
            >
              {busy ? "Joining…" : "👀 Just watching"}
            </Button>
            <p className="text-xs text-[var(--muted)]">
              {playersScore
                ? "Players keep score from their own phones. Watchers follow along live."
                : "The host is keeping score. Players and watchers follow along live."}
            </p>
          </div>
        ) : (
          <div className="space-y-3 text-left">
            <p className="text-sm font-medium">Which one are you?</p>
            <div className="flex flex-wrap gap-1.5">
              {players.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => enter(name)}
                  disabled={busy}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition hover:bg-[var(--hover)] ${
                    name.trim().toLowerCase() === me
                      ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                      : "border-[var(--border)]"
                  }`}
                >
                  I&apos;m {name}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[var(--muted)]">
              This phone will go by the name you pick, so the round knows it&apos;s you. Change it
              any time in Settings.
            </p>
            <p className="text-xs text-[var(--muted)]">
              Not on the list?{" "}
              {canRegister ? (
                <Link href={`/join/${upper}`} className="text-[var(--brand)] hover:underline">
                  Add yourself →
                </Link>
              ) : (
                "Ask the host to add you, then open this link again."
              )}
            </p>
            <button
              type="button"
              onClick={() => setPicking(false)}
              className="text-xs text-[var(--muted)] underline"
            >
              ← Back
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
