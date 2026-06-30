"use client";

import { useEffect, useState } from "react";
import { FALLBACK_BG_PHOTOS, type BgPhoto } from "@/lib/bgPhotos";

const CACHE_KEY = "sporos-bg-v1";

// Cycling sport photos that fill their (relatively-positioned) parent.
// Starts from a baked-in set so the hero paints INSTANTLY (no waiting on /api/bg),
// then refreshes with fresh, properly-credited photos in the background.
export function SportBackdrop() {
  const [photos, setPhotos] = useState<BgPhoto[]>(FALLBACK_BG_PHOTOS);
  const [i, setI] = useState(0);
  const [loaded, setLoaded] = useState(2); // load images progressively, not all at once

  useEffect(() => {
    // Prefer last session's photos (already in the browser cache → instant), then
    // refresh from the API and re-cache.
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (Array.isArray(cached) && cached.length) setPhotos(cached);
    } catch {}
    fetch("/api/bg")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.photos?.length) {
          setPhotos(d.photos);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(d.photos));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (photos.length < 2) return;
    const id = setInterval(() => setI((v) => (v + 1) % photos.length), 5000);
    return () => clearInterval(id);
  }, [photos.length]);

  // Grow the loaded set just ahead of the current slide so the first image paints
  // without competing with the other ten for bandwidth.
  useEffect(() => {
    setLoaded((l) => Math.max(l, i + 2));
  }, [i]);

  if (!photos.length) return <div className="absolute inset-0 bg-[var(--brand-strong)]" />;
  const cur = photos[i];

  return (
    <>
      {photos.map((p, idx) => (
        <div
          key={idx}
          aria-hidden="true"
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms] ${
            idx === i ? "opacity-100" : "opacity-0"
          }`}
          style={idx < loaded ? { backgroundImage: `url(${p.url})` } : undefined}
        />
      ))}
      <a
        href={cur.creditUrl}
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-1.5 right-3 z-20 text-[10px] text-white/70 hover:text-white"
      >
        Photo: {cur.credit} · Unsplash
      </a>
    </>
  );
}
