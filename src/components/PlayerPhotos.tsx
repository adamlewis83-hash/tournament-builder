"use client";

import { useState } from "react";
import { Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import { colorFor } from "@/lib/colors";
import { Avatar } from "./Avatar";
import { PhotoCropper } from "./PhotoCropper";
import { Card } from "./ui";

// Host tool: tap any player's avatar to add/replace a photo (it then shows instead
// of initials everywhere — cards, standings, brackets). Collapsed by default so the
// tournament page stays clean; photos ride along in live sync like registration ones.
export function PlayerPhotos({ t }: { t: Tournament }) {
  const setPhoto = useStore((s) => s.setParticipantPhoto);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<{ pid: string; file: File } | null>(null);
  if (t.spectator || t.participants.length === 0) return null;

  return (
    <Card className="p-4">
      {pending && (
        <PhotoCropper
          file={pending.file}
          onCancel={() => setPending(null)}
          onDone={(dataUrl) => {
            setPhoto(t.id, pending.pid, dataUrl);
            setPending(null);
          }}
        />
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="font-semibold text-sm">Player photos</span>
        <span className="text-xs text-[var(--muted)]">
          {open ? "▾ Hide" : "▸ Add photos to players"}
        </span>
      </button>
      {open && (
        <>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Tap a player to add or replace their photo — it shows instead of initials on
            match cards, standings, and brackets.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {t.participants.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] pl-1 pr-2 py-1"
              >
                <label className="cursor-pointer" title={`Add photo for ${p.name}`}>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setPending({ pid: p.id, file: f });
                      e.target.value = "";
                    }}
                  />
                  <Avatar
                    name={p.name}
                    color={colorFor(t.participants, p.id)}
                    photo={p.photo}
                    className="h-8 w-8 text-[11px]"
                  />
                </label>
                <span className="text-sm font-medium">{p.name}</span>
                {p.photo && (
                  <button
                    type="button"
                    onClick={() => setPhoto(t.id, p.id, null)}
                    title="Remove photo"
                    className="text-[var(--muted)] hover:text-rose-400 text-xs px-0.5"
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
