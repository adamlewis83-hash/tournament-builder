"use client";

import { useEffect, useState } from "react";

interface BgPhoto {
  url: string;
  credit: string;
  creditUrl: string;
}

// Cycling sport photos that fill their (relatively-positioned) parent.
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
    const id = setInterval(() => setI((v) => (v + 1) % photos.length), 5000);
    return () => clearInterval(id);
  }, [photos.length]);

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
          style={{ backgroundImage: `url(${p.url})` }}
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
