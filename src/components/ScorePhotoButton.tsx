"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Image as ImageIcon } from "@/components/icons";
import { Tournament } from "@/lib/types";
import { ScorePhoto } from "./ScorePhoto";
import { Button } from "./ui";

export function ScorePhotoButton({ t }: { t: Tournament }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function makeBlob(): Promise<Blob | null> {
    if (!ref.current) return null;
    const dataUrl = await toPng(ref.current, { pixelRatio: 2, cacheBust: true });
    const res = await fetch(dataUrl);
    return res.blob();
  }

  async function shareOrSave() {
    setBusy(true);
    try {
      const blob = await makeBlob();
      if (!blob) return;
      const file = new File([blob], `${t.name || "sporos"}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: t.name });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${t.name || "sporos"}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      /* user canceled or unsupported */
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="px-2.5 py-1.5 inline-flex items-center gap-1.5"
        onClick={() => setOpen(true)}
      >
        <ImageIcon className="h-4 w-4" /> Scorephoto
      </Button>
      {open && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="max-h-[92vh] overflow-auto">
            <div ref={ref}>
              <ScorePhoto t={t} />
            </div>
            <div className="mt-3 flex justify-center gap-2">
              <Button onClick={shareOrSave} disabled={busy}>
                {busy ? "Rendering…" : "Save / Share image"}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
