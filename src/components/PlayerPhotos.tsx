"use client";

import { useState } from "react";
import { Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import { colorFor } from "@/lib/colors";
import { Avatar } from "./Avatar";
import { PhotoCropper } from "./PhotoCropper";
import { AvatarStylePicker } from "./AvatarStylePicker";
import { Card } from "./ui";

// Host tool: tap any player's avatar to add/replace a photo (it then shows instead
// of initials everywhere — cards, standings, brackets). Collapsed by default so the
// tournament page stays clean; photos ride along in live sync like registration ones.
export function PlayerPhotos({ t }: { t: Tournament }) {
  const setPhoto = useStore((s) => s.setParticipantPhoto);
  const setColor = useStore((s) => s.setParticipantColor);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<{ pid: string; file: File } | null>(null);
  const [choosing, setChoosing] = useState<string | null>(null); // participant id
  if (t.spectator || t.participants.length === 0) return null;

  const chooser = choosing ? t.participants.find((p) => p.id === choosing) : null;

  return (
    <Card className="p-4">
      {chooser && (
        <AvatarStylePicker
          name={chooser.name}
          color={chooser.color}
          hasPhoto={!!chooser.photo}
          onCancel={() => setChoosing(null)}
          onColor={(hex) => {
            setColor(t.id, chooser.id, hex);
            setChoosing(null);
          }}
          onFile={(f) => {
            setChoosing(null);
            setPending({ pid: chooser.id, file: f });
          }}
        />
      )}
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
        <span className="font-semibold text-sm">Player photos &amp; colors</span>
        <span className="text-xs text-[var(--muted)]">
          {open ? "▾ Hide" : "▸ Customize player avatars"}
        </span>
      </button>
      {open && (
        <>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Tap a player to pick their circle color or add a photo — shown on match cards,
            standings, and brackets.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {t.participants.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] pl-1 pr-2 py-1"
              >
                <button
                  type="button"
                  className="cursor-pointer"
                  title={`Avatar style for ${p.name}`}
                  onClick={() => setChoosing(p.id)}
                >
                  <Avatar
                    name={p.name}
                    color={colorFor(t.participants, p.id)}
                    photo={p.photo}
                    className="h-8 w-8 text-[11px]"
                  />
                </button>
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
