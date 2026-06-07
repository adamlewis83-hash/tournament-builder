"use client";

import { useEffect, useState } from "react";

interface BgPhoto {
  url: string;
  credit: string;
  creditUrl: string;
}

export function SportBackdrop() {
  const [photos, setPhotos] = useState<BgPhoto[]>([]);
  const [i, setI] = useState(0);

  useEffect(() => {
    fetch("/api/bg")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.photos?.length) setPhotos(d.photos);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (photos.length < 2) return;
    const id = setInterval(() => setI((v) => (v + 1) % photos.length), 7000);
    return () => clearInterval(id);
  }, [photos.length]);

  if (!photos.length) return null;
  const cur = photos[i];

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        {photos.map((p, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms] ${
              idx === i ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundImage: `url(${p.url})` }}
          />
        ))}
        {/* Readability scrim — lets the photo show through the page gutters & frosted hero
            while keeping text crisp on top. */}
        <div className="absolute inset-0 bg-[var(--background)]/72" />
      </div>

      {/* Unsplash attribution (required). Hidden on mobile to avoid the bottom nav. */}
      <a
        href={cur.creditUrl}
        target="_blank"
        rel="noreferrer"
        className="no-print hidden sm:block fixed bottom-1.5 left-2 z-30 text-[10px] text-[var(--muted)]/80 hover:text-[var(--foreground)] hover:underline"
      >
        Photo: {cur.credit} · Unsplash
      </a>
    </>
  );
}
