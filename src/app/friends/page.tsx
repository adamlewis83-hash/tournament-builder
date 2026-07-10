"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { colorForName } from "@/lib/colors";
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
            <Card key={f.id} className="p-3 flex items-center gap-3">
              <Avatar
                name={f.name}
                color={f.color || colorForName(f.name)}
                photo={f.photo}
                className="h-9 w-9 text-sm shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{f.name}</p>
                {f.handicap != null && (
                  <p className="text-xs text-[var(--muted)]">Golf hcp {f.handicap}</p>
                )}
              </div>
              <Button
                variant="danger"
                className="px-2 py-1 text-xs"
                onClick={() => removeFriend(f.id)}
              >
                Remove
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
