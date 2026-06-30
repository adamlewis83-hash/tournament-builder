import { NextResponse } from "next/server";
import { FALLBACK_BG_PHOTOS, type BgPhoto } from "@/lib/bgPhotos";

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

// Curated fallback photos live in @/lib/bgPhotos so the client can paint them
// instantly too (no API round-trip before the first image shows).
const FALLBACK_PHOTOS = FALLBACK_BG_PHOTOS;

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
          url: `${p.urls.raw}&w=1600&q=75&auto=format&fit=crop`,
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
