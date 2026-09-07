"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { colorForName } from "@/lib/colors";
import { seedIndexForPlayer } from "@/lib/handicap";
import type { Friend } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { Button, Card } from "@/components/ui";
import { HydrationGate } from "@/components/HydrationGate";

export default function FriendsPage() {
  return (
    <HydrationGate>
      <Friends />
    </HydrationGate>
  );
}

function Friends() {
  const friends = useStore((s) => s.friends);
  const saveFriend = useStore((s) => s.saveFriend);
  const removeFriend = useStore((s) => s.removeFriend);
  const [name, setName] = useState("");
  const [hcp, setHcp] = useState("");

  const add = () => {
    const n = name.trim();
    if (!n) return;
    saveFriend({ name: n, handicap: hcp.trim() === "" ? undefined : Number(hcp) });
    setName("");
    setHcp("");
  };

  const sorted = [...friends].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-5">
      <div>
        <Link href="/" className="text-sm text-[var(--muted)] hover:underline">
          ← All tournaments
        </Link>
        <h1 className="text-2xl font-bold mt-2 flex items-center gap-2">👥 Friends</h1>
        <p className="text-sm text-[var(--muted)]">
          Save the people you play with so you can tap them into any tournament instead of retyping.
          A golf handicap here auto-fills golf and Ryder Cup events.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex-1 min-w-[10rem]">
            <span className="text-xs font-medium text-[var(--muted)]">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Player"
              className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-[var(--surface)]"
            />
          </label>
          <label>
            <span className="text-xs font-medium text-[var(--muted)]">Golf hcp</span>
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              value={hcp}
              onChange={(e) => setHcp(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="—"
              className="mt-1 w-20 rounded-lg border border-[var(--border)] px-2 py-2 text-sm text-center bg-[var(--surface)] tabular-nums"
            />
          </label>
          <Button className="px-4 py-2" onClick={add} disabled={!name.trim()}>
            Add friend
          </Button>
        </div>
      </Card>

      {sorted.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="text-3xl mb-2">👋</div>
          <p className="font-medium">No friends saved yet</p>
          <p className="text-sm text-[var(--muted)]">
            Add people above — or tap <b>Save as friend</b> from a tournament setup — and they&apos;ll
            show up here and in every tournament&apos;s player picker.
          </p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          {sorted.map((f) => (
            <FriendCard
              key={f.id}
              friend={f}
              onSave={saveFriend}
              onRemove={() => removeFriend(f.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// One saved player. Their Seed Index — the estimated handicap grown from the
// rounds they've finished here — sits right on the card, one tap from becoming
// the handicap that auto-fills their next event. The name links through to
// their full profile, where the index and the game behind it live.
function FriendCard({
  friend: f,
  onSave,
  onRemove,
}: {
  friend: Friend;
  onSave: (input: Omit<Friend, "id"> & { id?: string }) => string;
  onRemove: () => void;
}) {
  const tournaments = useStore((s) => s.tournaments);
  const seed = seedIndexForPlayer(tournaments, f.name);
  const inUse = seed.index != null && f.handicap != null && Math.abs(f.handicap - seed.index) < 0.05;

  return (
    <Card className="p-3 flex items-center gap-3">
      <Avatar
        name={f.name}
        color={f.color || colorForName(f.name)}
        photo={f.photo}
        className="h-9 w-9 text-sm shrink-0"
      />
      <div className="min-w-0 flex-1">
        <Link
          href={`/records/p/${encodeURIComponent(f.name)}`}
          className="font-semibold truncate hover:underline"
        >
          {f.name}
        </Link>
        {f.handicap != null && (
          <p className="text-xs text-[var(--muted)]">Golf hcp {f.handicap}</p>
        )}
        {seed.index != null && (
          <p className="text-xs text-[var(--muted)]">
            ⛳ Seed Index{" "}
            <span className="font-semibold text-[var(--foreground)] tabular-nums">
              {seed.index.toFixed(1)}
            </span>{" "}
            <span className="text-[10px]">
              ({seed.rounds} round{seed.rounds === 1 ? "" : "s"})
            </span>
            {inUse ? (
              <span> — in use ✓</span>
            ) : (
              <>
                {" "}
                <button
                  type="button"
                  onClick={() => onSave({ id: f.id, name: f.name, handicap: seed.index ?? undefined })}
                  className="font-semibold text-[var(--brand)] hover:underline"
                >
                  Use it
                </button>
              </>
            )}
          </p>
        )}
      </div>
      <Button variant="danger" className="px-2 py-1 text-xs" onClick={onRemove}>
        Remove
      </Button>
    </Card>
  );
}
