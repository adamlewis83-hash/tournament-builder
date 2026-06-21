import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sport scenes to cycle through. A string = top search result; { id } = a
// specific hand-picked Unsplash photo.
const QUERIES: (string | { id: string })[] = [
  "golf course fairway flag",
  "outdoor tennis court",
  "pickleball court",
  { id: "KWsKzLGmmzQ" }, // cornhole — casual patio game
  { id: "7otVwMaIXyo" }, // volleyball — outdoor rec court (no lens flare)
  "outdoor basketball court park",
  "kids soccer field park",
  { id: "k_a-ott2G-w" }, // flag football — rec game
  "bowling alley lane",
  { id: "g_OYkZ-fbLM" }, // table tennis — casual friends playing
  "disc golf",
];

interface BgPhoto {
  url: string;
  credit: string;
  creditUrl: string;
}

// Baked-in curated sport photos — used whenever the live Unsplash API is unavailable
// (no API key, rate-limited, or an error) so the hero backdrop NEVER falls back to a
// blank block. These are stable Unsplash image URLs that don't require auth to load.
const FALLBACK_PHOTOS: BgPhoto[] = (
  [
    ["photo-1517074009205-d9ca5d8b4a63", "Michael Jasmund"],
    ["photo-1668507911709-0249e832618d", "Marius Matuschzik"],
    ["photo-1693142518820-78d7a05f1546", "Alex Saks"],
    ["photo-1556761175-9c1bafe0f436", "Austin Distel"],
    ["photo-1771909712438-c90a7bbb6efb", "ARTO SURAJ"],
    ["photo-1496033604106-04799291ee86", "Peter Berko"],
    ["photo-1777489689168-497290f235d5", "Simone Franchina"],
    ["photo-1772515111367-ad324758a976", "Amari Shutters"],
    ["photo-1660129071363-d13390de351f", "engin akyurt"],
    ["photo-1559136560-16ad036d85d3", "Proxyclick"],
    ["photo-1725724636270-01f1b53ac17a", "Priscilla Du Preez"],
  ] as const
).map(([id, credit]) => ({
  url: `https://images.unsplash.com/${id}?w=1920&q=80&auto=format&fit=crop`,
  credit,
  creditUrl: "https://unsplash.com/?utm_source=seeded&utm_medium=referral",
}));

let cache: { at: number; v: string; photos: BgPhoto[]; ttl: number } | null = null;
const TTL = 1000 * 60 * 60 * 6; // 6 hours for fresh live photos
const FALLBACK_TTL = 1000 * 60 * 15; // 15 min when we had to fall back, so it self-heals
const CACHE_VERSION = JSON.stringify(QUERIES); // changing the sport list invalidates the cache

export async function GET(req: Request) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return NextResponse.json({ photos: FALLBACK_PHOTOS });
  const refresh = new URL(req.url).searchParams.has("refresh");
  if (!refresh && cache && cache.v === CACHE_VERSION && Date.now() - cache.at < cache.ttl)
    return NextResponse.json({ photos: cache.photos });

  try {
    const photos: BgPhoto[] = [];
    const headers = { Authorization: `Client-ID ${key}` };
    for (const q of QUERIES) {
      const url =
        typeof q === "object"
          ? `https://api.unsplash.com/photos/${q.id}`
          : `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&orientation=landscape&per_page=1&content_filter=high`;
      const r = await fetch(url, { headers, cache: "no-store" });
      if (!r.ok) continue;
      const d = await r.json();
      // photos/{id} returns the photo directly; search returns { results: [...] }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = (typeof q === "object" ? d : d.results?.[0]) as any;
      if (p?.urls?.raw) {
        photos.push({
          url: `${p.urls.raw}&w=1920&q=80&auto=format&fit=crop`,
          credit: p.user?.name ?? "Unsplash",
          creditUrl: `${p.user?.links?.html ?? "https://unsplash.com"}?utm_source=seeded&utm_medium=referral`,
        });
      }
    }
    const ok = photos.length > 0;
    const result = ok ? photos : FALLBACK_PHOTOS;
    // Cache either way so a rate-limit burst doesn't re-hammer Unsplash on every request.
    cache = { at: Date.now(), v: CACHE_VERSION, photos: result, ttl: ok ? TTL : FALLBACK_TTL };
    return NextResponse.json({ photos: result });
  } catch {
    return NextResponse.json({ photos: FALLBACK_PHOTOS });
  }
}
