"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { Friend } from "@/lib/types";

// A row of your saved friends — tap one to drop them into the tournament you're setting up.
// `addedNames` is the set of lowercased names already in the roster (so they're hidden).
// `onAdd` wires each host's own way of adding a player (append to a textarea, add a row, etc).
export function FriendPicker({
  addedNames,
  onAdd,
  showHandicap = false,
}: {
  addedNames: Set<string>;
  onAdd: (f: Friend) => void;
  showHandicap?: boolean;
}) {
  const friends = useStore((s) => s.friends);
  const available = friends.filter((f) => !addedNames.has(f.name.trim().toLowerCase()));

  return (
    <div className="rounded-lg border border-[var(--border)] p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--muted)]">Your friends</span>
        <Link href="/friends" className="text-xs text-[var(--brand)] hover:text-[var(--brand-strong)] font-medium">
          Manage
        </Link>
      </div>
      {friends.length === 0 ? (
        <p className="mt-1 text-[11px] text-[var(--muted)]">
          Save people you play with often as friends and pick them here next time —{" "}
          <Link href="/friends" className="text-[var(--brand)]">
            add friends →
          </Link>
        </p>
      ) : available.length === 0 ? (
        <p className="mt-1 text-[11px] text-[var(--muted)]">All your friends are already added. 🎉</p>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {available.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onAdd(f)}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--subtle)] px-2.5 py-1 text-xs hover:bg-[var(--hover)]"
            >
              <span className="font-medium">+ {f.name}</span>
              {showHandicap && f.handicap != null && (
                <span className="text-[var(--muted)] tabular-nums">· {f.handicap}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
