"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./ui";

// Zoom-and-position cropper for player photos: drag to move, slide to zoom, and the
// circle shows exactly what the avatar will be. Exports the same tiny square JPEG
// data-URL as lib/image resizePhoto so it drops into the existing photo pipeline.
const VIEW = 256; // css px crop viewport
const OUT = 96; // exported square size (matches resizePhoto)

export function PhotoCropper({
  file,
  onDone,
  onCancel,
}: {
  file: File;
  onDone: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1); // 1..4 on top of "cover"
  const [off, setOff] = useState({ x: 0, y: 0 }); // top-left of image in viewport px
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const base = nat ? VIEW / Math.min(nat.w, nat.h) : 1; // "cover" scale
  const w = nat ? nat.w * base * zoom : VIEW;
  const h = nat ? nat.h * base * zoom : VIEW;

  const clamp = (x: number, y: number, iw: number, ih: number) => ({
    x: Math.min(0, Math.max(VIEW - iw, x)),
    y: Math.min(0, Math.max(VIEW - ih, y)),
  });

  function onLoad() {
    const el = imgRef.current;
    if (!el) return;
    const n = { w: el.naturalWidth, h: el.naturalHeight };
    setNat(n);
    // start centered
    const b = VIEW / Math.min(n.w, n.h);
    setOff({ x: (VIEW - n.w * b) / 2, y: (VIEW - n.h * b) / 2 });
  }

  function setZoomKeepCenter(z: number) {
    if (!nat) return;
    // keep the viewport center pointing at the same image spot while zooming
    const oldScale = base * zoom;
    const newScale = base * z;
    const cx = (VIEW / 2 - off.x) / oldScale;
    const cy = (VIEW / 2 - off.y) / oldScale;
    const nx = VIEW / 2 - cx * newScale;
    const ny = VIEW / 2 - cy * newScale;
    setZoom(z);
    setOff(clamp(nx, ny, nat.w * newScale, nat.h * newScale));
  }

  function down(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, ox: off.x, oy: off.y };
  }
  function move(e: React.PointerEvent) {
    if (!drag.current || !nat) return;
    const nx = drag.current.ox + (e.clientX - drag.current.px);
    const ny = drag.current.oy + (e.clientY - drag.current.py);
    setOff(clamp(nx, ny, w, h));
  }
  function up() {
    drag.current = null;
  }

  function save() {
    const el = imgRef.current;
    if (!el || !nat) return;
    const scale = base * zoom;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(el, -off.x / scale, -off.y / scale, VIEW / scale, VIEW / scale, 0, 0, OUT, OUT);
    onDone(canvas.toDataURL("image/jpeg", 0.7));
  }

  // Portal to <body> so no parent card/stacking context can paint over the dialog.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-semibold text-sm">Position your photo</p>
        <div className="mx-auto relative touch-none select-none" style={{ width: VIEW, height: VIEW }}>
          <div className="absolute inset-0 overflow-hidden rounded-xl bg-black/40">
            {url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imgRef}
                src={url}
                alt="crop"
                draggable={false}
                onLoad={onLoad}
                className="absolute max-w-none cursor-grab active:cursor-grabbing"
                style={{ width: w, height: h, left: off.x, top: off.y }}
                onPointerDown={down}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={up}
              />
            )}
          </div>
          {/* circular avatar preview mask */}
          <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/20" />
          <div
            className="pointer-events-none absolute rounded-full border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
            style={{ inset: 8, borderRadius: "9999px" }}
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
          Zoom
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoomKeepCenter(Number(e.target.value))}
            className="flex-1 accent-[var(--brand)]"
          />
        </label>
        <p className="text-xs text-[var(--muted)]">Drag to move · slide to zoom in on your face.</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!nat}>
            Use photo
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
