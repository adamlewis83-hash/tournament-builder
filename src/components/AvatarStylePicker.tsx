"use client";

import { createPortal } from "react-dom";
import { PALETTE } from "@/lib/colors";
import { Avatar } from "./Avatar";
import { Button } from "./ui";

// Tap-the-circle chooser: use your initials in a color you pick, or upload a photo.
// Picking a color clears the photo (initials only show without one); picking a photo
// hands the file to the caller, which opens the crop/zoom dialog.
export function AvatarStylePicker({
  name,
  color,
  hasPhoto,
  onColor,
  onFile,
  onCancel,
}: {
  name: string;
  color?: string;
  hasPhoto: boolean;
  onColor: (hex: string) => void;
  onFile: (file: File) => void;
  onCancel: () => void;
}) {
  // Portal to <body> so no parent card/stacking context can paint over the dialog.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-semibold text-sm">Avatar style{name.trim() ? ` — ${name.trim()}` : ""}</p>

        <div>
          <p className="mb-2 text-xs font-medium text-[var(--muted)]">
            Initials with your color{hasPhoto ? " (replaces the photo)" : ""}
          </p>
          <div className="grid grid-cols-8 gap-2">
            {PALETTE.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => onColor(hex)}
                title={hex}
                className={`grid h-8 w-8 place-items-center justify-self-center rounded-full transition hover:scale-110 ${
                  !hasPhoto && color === hex ? "ring-2 ring-[var(--foreground)] ring-offset-2 ring-offset-[var(--surface)]" : ""
                }`}
                style={{ background: hex }}
              >
                {!hasPhoto && color === hex ? <span className="text-[10px] font-bold text-black/70">✓</span> : null}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]">
            Preview:
            <Avatar name={name.trim() || "?"} color={color || PALETTE[0]} className="h-8 w-8 text-[11px]" />
          </div>
        </div>

        <div className="border-t border-[var(--border)] pt-3">
          <label className="block">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = "";
              }}
            />
            <span className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--brand)] to-[var(--brand-strong)] px-4 py-2.5 text-sm font-semibold text-[var(--on-brand)] transition hover:brightness-110 active:scale-[0.96]">
              📷 {hasPhoto ? "Replace photo" : "Choose a photo"}
            </span>
          </label>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
